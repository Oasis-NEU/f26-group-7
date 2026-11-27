/* global process */
// Loads every migration and the follows draft into PGlite (Postgres that
// runs inside Node, no Docker needed), then checks the rules by acting as
// different test users. Everything happens in memory: it never touches
// the shared Supabase project.
//
//   npm install --no-save @electric-sql/pglite@0.5.16
//   node docs/follows/db-checks/run.js
//
// --no-save keeps PGlite out of package.json. A later `npm install`
// removes it again, so run the first line again when you need it.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pglite = await import('@electric-sql/pglite').catch(() => null)
if (!pglite) {
  console.error(
    'PGlite isn’t installed. Run this first:\n' +
      '  npm install --no-save @electric-sql/pglite@0.5.16',
  )
  process.exit(1)
}

const db = new pglite.PGlite()
const here = fileURLToPath(new URL('.', import.meta.url))
const repo = join(here, '../../..')
const readme = readFileSync(join(repo, 'docs/follows/README.md'), 'utf8')

// The one ```sql block in the README containing `marker`, exactly as
// written there, so the README's examples can't quietly go stale.
function readmeSql(marker) {
  const blocks = [...readme.matchAll(/```sql\n([\s\S]*?)```/g)].map(
    (match) => match[1],
  )
  const found = blocks.filter((block) => block.includes(marker))
  if (found.length !== 1) {
    throw new Error(
      `The README has ${found.length} sql blocks with "${marker}"`,
    )
  }
  return found[0]
}

// ── Reporting ──────────────────────────────────────────────────────────
let passed = 0
const failed = []
const plain = (value) =>
  JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === 'bigint' ? Number(item) : item,
    ),
  )

function check(name, actual, expected) {
  const got = JSON.stringify(plain(actual))
  const want = JSON.stringify(plain(expected))
  if (got === want) {
    passed++
    console.log(`PASS  ${name}`)
  } else {
    failed.push(name)
    console.log(
      `FAIL  ${name}\n        expected ${want}\n        got      ${got}`,
    )
  }
}

async function load(label, sql) {
  try {
    await db.exec(sql)
    console.log(`ok    loaded ${label}`)
  } catch (error) {
    console.log(`FAIL  loading ${label}: [${error.code}] ${error.message}`)
    if (error.position) {
      const at = Number(error.position)
      console.log(`      near: ${sql.slice(Math.max(0, at - 150), at + 80)}`)
    }
    process.exit(1)
  }
}

// ── Acting as someone ──────────────────────────────────────────────────
const ids = {}

// One query: its rows, or { error: SQLSTATE } when it's refused. The
// savepoint stops one refusal from spoiling the rest of the transaction.
async function attempt(sql, params = []) {
  await db.exec('savepoint attempt')
  try {
    const result = await db.query(sql, params)
    await db.exec('release savepoint attempt')
    return result.rows
  } catch (error) {
    await db.exec('rollback to savepoint attempt')
    return { error: error.code }
  }
}

// Inside a transaction: become a test user, the way the website's
// requests do, or a logged-out visitor ('anon').
async function become(who) {
  await db.exec('reset role')
  if (who === 'anon') {
    await db.query(`select set_config('request.jwt.claims', '', true)`)
    await db.exec('set local role anon')
  } else {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: ids[who], role: 'authenticated' }),
    ])
    await db.exec('set local role authenticated')
  }
}

// Runs `fn` inside a transaction, as `who` if given, then undoes
// everything unless commit is set.
async function transaction(who, fn, { commit = false } = {}) {
  await db.exec('begin')
  try {
    if (who) await become(who)
    return await fn()
  } finally {
    await db.exec(commit ? 'commit' : 'rollback')
  }
}

const count = async (sql, params) => (await attempt(sql, params))[0]?.n
const rsvpsOf = (who) =>
  count(`select count(*)::int as n from public.rsvps where user_id = $1`, [
    ids[who],
  ])
const savesOf = (who) =>
  count(`select count(*)::int as n from public.saves where user_id = $1`, [
    ids[who],
  ])
const usernames = (rows) => rows.map((row) => row.username)

// ── The database ───────────────────────────────────────────────────────
const version = (await db.query('select version()')).rows[0].version
console.log(version.split(' on ')[0])
await load(
  'Supabase stand-ins',
  readFileSync(join(here, 'supabase-stubs.sql'), 'utf8'),
)

// Accounts made before 0008, to check what it does to their privacy.
const legacy = {}
async function addLegacyAccounts() {
  for (const privacy of ['everyone', 'friends', 'only_me']) {
    const { rows } = await db.query(
      `insert into auth.users (email) values ($1) returning id`,
      [`old_${privacy}@example.test`],
    )
    legacy[privacy] = rows[0].id
    await db.query(`update public.profiles set privacy = $2 where id = $1`, [
      rows[0].id,
      privacy,
    ])
  }
}

const migrationsDir = join(repo, 'supabase/migrations')
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
const steps = migrations.map((file) => ({
  label: file,
  path: join(migrationsDir, file),
}))
// Until the draft moves into supabase/migrations, load it after the rest.
const promoted = migrations.some((file) => file.includes('follows'))
if (!promoted) {
  steps.push({
    label: 'docs/follows/0008_follows.draft.sql',
    path: join(repo, 'docs/follows/0008_follows.draft.sql'),
  })
}
for (const step of steps) {
  if (step.label.includes('follows')) await addLegacyAccounts()
  await load(step.label, readFileSync(step.path, 'utf8'))
}

const logged = (
  await db.query(
    'select version from public.schema_migrations order by version',
  )
).rows.map((row) => row.version)
check(
  'schema_migrations has a row for every migration, plus 0008',
  logged,
  [
    ...migrations.map((file) => file.slice(0, 4)),
    ...(promoted ? [] : ['0008']),
  ].sort(),
)
check(
  'Existing accounts: everyone and friends become public, only_me private',
  (
    await db.query(
      `select privacy from public.profiles where id in ($1, $2, $3)
       order by array_position(array[$1, $2, $3]::uuid[], id)`,
      [legacy.everyone, legacy.friends, legacy.only_me],
    )
  ).rows.map((row) => row.privacy),
  ['public', 'public', 'private'],
)

// ── Test people, events, RSVPs and saves ───────────────────────────────
{
  const { rows } = await db.query(
    `insert into auth.users (email) values ('fresh@example.test') returning id`,
  )
  check(
    'New accounts are public, with saves hidden',
    (
      await db.query(
        `select privacy, saves_public from public.profiles where id = $1`,
        [rows[0].id],
      )
    ).rows,
    [{ privacy: 'public', saves_public: false }],
  )
}

// key, display name, school, favorite niches, privacy, saves_public
const people = [
  ['test_a', 'Test A', 'Northeastern', ['Records', 'Film'], 'public', false],
  ['test_b', 'Test B', 'Boston University', ['Books'], 'public', false],
  ['test_c', 'Test C', 'Harvard', [], 'public', true], // the README makes it private
  ['test_d', 'Test D', 'Northeastern', ['Records'], 'public', true],
  ['test_e', 'Test E', 'MIT', [], 'public', false],
  ['test_f', 'Test F', null, [], 'private', false],
  ['test_g', 'Test G', 'Northeastern', ['Records'], 'public', false], // no username yet
  ['test_h', 'Test H', 'Other', [], 'public', false],
  ['test_i', 'Test I', 'Other', [], 'public', false],
  ['testxk', 'Test K', null, [], 'public', false], // "test_" would match it if _ were a wildcard
]
for (const [key, name, school, niches, privacy, savesPublic] of people) {
  const { rows } = await db.query(
    `insert into auth.users (email, raw_user_meta_data)
     values ($1, $2::jsonb) returning id`,
    [`${key}@example.test`, JSON.stringify({ display_name: name })],
  )
  ids[key] = rows[0].id
  await db.query(
    `update public.profiles
        set username = $2, school = $3, favorite_niches = $4::text[],
            privacy = $5, saves_public = $6
      where id = $1`,
    [
      ids[key],
      key === 'test_g' ? null : key,
      school,
      `{${niches.map((niche) => `"${niche}"`).join(',')}}`,
      privacy,
      savesPublic,
    ],
  )
}

const ev = {}
for (const [key, title, niche, days] of [
  ['e0', 'Zine fair', 'Books', -2], // already happened
  ['e1', 'Record swap', 'Records', 1],
  ['e2', 'Film night', 'Film', 2],
  ['e3', 'Board game night', 'Games', 3],
]) {
  const { rows } = await db.query(
    `insert into public.events (title, niche, start_at)
     values ($1, $2, now() + make_interval(days => $3)) returning id`,
    [title, niche, days],
  )
  ev[key] = Number(rows[0].id)
}

for (const [who, event, status] of [
  ['test_a', 'e1', 'going'],
  ['test_b', 'e0', 'going'],
  ['test_b', 'e2', 'going'],
  ['test_c', 'e1', 'going'],
  ['test_c', 'e2', 'interested'],
  ['test_d', 'e0', 'going'],
  ['test_d', 'e1', 'going'],
  ['test_f', 'e1', 'going'],
]) {
  await db.query(
    `insert into public.rsvps (user_id, event_id, status) values ($1, $2, $3)`,
    [ids[who], ev[event], status],
  )
}
for (const [who, event] of [
  ['test_b', 'e1'],
  ['test_c', 'e3'],
  ['test_d', 'e2'],
]) {
  await db.query(
    `insert into public.saves (user_id, event_id) values ($1, $2)`,
    [ids[who], ev[event]],
  )
}
check(
  'Going counts (0006 trigger)',
  (await db.query('select title, going from public.events order by id')).rows,
  [
    { title: 'Zine fair', going: 2 },
    { title: 'Record swap', going: 4 },
    { title: 'Film night', going: 1 },
    { title: 'Board game night', going: 0 },
  ],
)

console.log('\n── README snippets ──')
await load(
  'README test-account snippet',
  readmeSql(
    `update public.profiles set privacy = 'private' where username = 'test_c'`,
  ),
)
{
  const results = await db.exec(readmeSql(`set_config('request.jwt.claims'`))
  const rows =
    results.find((result) =>
      result.fields?.some((field) => field.name === 'direction'),
    )?.rows ?? []
  check(
    'README "acting as a test user" snippet: test_b followed, test_c asked',
    rows.map((row) => [row.username, row.direction, row.status]).sort(),
    [
      ['test_b', 'following', 'accepted'],
      ['test_c', 'following', 'pending'],
    ],
  )
}

// More follows: test_b follows test_e, test_d follows test_a, and test_h
// asks to follow test_f (private).
for (const [follower, followee] of [
  ['test_b', 'test_e'],
  ['test_d', 'test_a'],
  ['test_h', 'test_f'],
]) {
  await db.query(
    `insert into public.follows (follower_id, followee_id) values ($1, $2)`,
    [ids[follower], ids[followee]],
  )
}

console.log('\n── Following ──')
await transaction('test_a', async () => {
  check(
    'test_a’s my_follows: follows test_b, asked test_c, followed by test_d',
    await attempt(
      `select username, direction, status from public.my_follows
       order by username, direction`,
    ),
    [
      { username: 'test_b', direction: 'following', status: 'accepted' },
      { username: 'test_c', direction: 'following', status: 'pending' },
      { username: 'test_d', direction: 'follower', status: 'accepted' },
    ],
  )
  const followSql = `insert into public.follows (followee_id) values ($1)`
  check(
    'Following test_b again is refused (23505)',
    await attempt(followSql, [ids.test_b]),
    { error: '23505' },
  )
  check(
    'Following yourself is refused (23514)',
    await attempt(followSql, [ids.test_a]),
    { error: '23514' },
  )
  check(
    'Giving follower_id (following "as" someone else) is refused (42501)',
    await attempt(
      `insert into public.follows (follower_id, followee_id) values ($1, $2)`,
      [ids.test_c, ids.test_d],
    ),
    { error: '42501' },
  )
  check(
    'Giving status is refused (42501)',
    await attempt(
      `insert into public.follows (followee_id, status) values ($1, 'accepted')`,
      [ids.test_e],
    ),
    { error: '42501' },
  )
  const returning = ` returning follower_id = auth.uid() as from_me, status,
                      accepted_at is not null as stamped`
  check(
    'Following public test_e starts at once',
    await attempt(followSql + returning, [ids.test_e]),
    [{ from_me: true, status: 'accepted', stamped: true }],
  )
  check(
    'Following private test_f is a request',
    await attempt(followSql + returning, [ids.test_f]),
    [{ from_me: true, status: 'pending', stamped: false }],
  )

  // A view that joins two tables can't be written to at all, so Postgres
  // refuses before it even checks permissions (55000, not 42501).
  check(
    'Nothing can be written through my_follows (55000)',
    await attempt(`delete from public.my_follows`),
    { error: '55000' },
  )
  check(
    'test_a can’t accept the request test_a sent',
    await attempt(
      `update public.follows set status = 'accepted'
       where follower_id = auth.uid() returning status`,
    ),
    [],
  )
})
await transaction('test_c', async () => {
  check(
    'test_c sees test_a’s request',
    await attempt(
      `select username, status from public.my_follows where direction = 'follower'`,
    ),
    [{ username: 'test_a', status: 'pending' }],
  )
})
await transaction('test_b', async () => {
  check(
    'test_b can’t see other people’s requests',
    await count(
      `select count(*)::int as n from public.follows where status = 'pending'`,
    ),
    0,
  )
  check(
    'test_b can’t turn an accepted follow back into a request',
    await attempt(
      `update public.follows set status = 'pending' returning status`,
    ),
    [],
  )
  check(
    'test_b can’t change accepted_at (42501)',
    await attempt(`update public.follows set accepted_at = now()`),
    { error: '42501' },
  )
  check(
    'test_b can remove test_a as a follower',
    await attempt(
      `delete from public.follows
       where follower_id = $1 and followee_id = auth.uid() returning status`,
      [ids.test_a],
    ),
    [{ status: 'accepted' }],
  )
})
await transaction('test_d', async () => {
  check(
    'test_d can’t delete follows test_d isn’t in',
    await attempt(
      `delete from public.follows where followee_id = $1 returning status`,
      [ids.test_b],
    ),
    [],
  )
  check(
    'test_d can unfollow test_a',
    await attempt(
      `delete from public.follows
       where follower_id = auth.uid() and followee_id = $1 returning status`,
      [ids.test_a],
    ),
    [{ status: 'accepted' }],
  )
})
await transaction('test_f', async () => {
  check(
    'test_f declines test_h’s request: the row is gone',
    await attempt(
      `delete from public.follows
       where follower_id = $1 and followee_id = auth.uid() returning status`,
      [ids.test_h],
    ),
    [{ status: 'pending' }],
  )
  await become('test_h')
  check(
    '... so test_h can ask again',
    await attempt(
      `insert into public.follows (followee_id) values ($1) returning status`,
      [ids.test_f],
    ),
    [{ status: 'pending' }],
  )
})

console.log('\n── Privacy, before test_c accepts ──')
await transaction('test_a', async () => {
  check('test_c’s RSVPs are hidden (private)', await rsvpsOf('test_c'), 0)
  check('test_d’s RSVPs show (public)', await rsvpsOf('test_d'), 2)
  check('test_f’s RSVP is hidden (private)', await rsvpsOf('test_f'), 0)
  check(
    'can_see_plans: test_c false, test_d true, test_f false, yourself true',
    await attempt(
      `select public.can_see_plans(person => $1) as c,
              public.can_see_plans(person => $2) as d,
              public.can_see_plans(person => $3) as f,
              public.can_see_plans(auth.uid()) as me`,
      [ids.test_c, ids.test_d, ids.test_f],
    ),
    [{ c: false, d: true, f: false, me: true }],
  )
  check(
    'test_a still sees their own RSVP',
    await attempt(
      `select status from public.rsvps where user_id = auth.uid() and event_id = $1`,
      [ev.e1],
    ),
    [{ status: 'going' }],
  )
  check(
    'test_b’s saves are hidden (saves_public off)',
    await savesOf('test_b'),
    0,
  )
  check(
    'test_d’s saves show (saves_public on, public)',
    await savesOf('test_d'),
    1,
  )
  check(
    'test_c’s saves are hidden (saves_public on, but private)',
    await savesOf('test_c'),
    0,
  )
  check(
    'can_see_saves: test_b false, test_d true, test_c false',
    await attempt(
      `select public.can_see_saves($1) as b, public.can_see_saves($2) as d,
              public.can_see_saves($3) as c`,
      [ids.test_b, ids.test_d, ids.test_c],
    ),
    [{ b: false, d: true, c: false }],
  )
  check(
    'The website can’t call is_following() (42501)',
    await attempt(`select public.is_following($1, $2)`, [
      ids.test_b,
      ids.test_e,
    ]),
    { error: '42501' },
  )
  check(
    'test_c’s followers and following lists are hidden',
    [
      await attempt(`select * from public.followers_of($1)`, [ids.test_c]),
      await attempt(`select * from public.following_of($1)`, [ids.test_c]),
    ],
    [[], []],
  )
  check(
    'follow_counts(test_c): 0 and 0 (a request doesn’t count)',
    await attempt(`select * from public.follow_counts($1)`, [ids.test_c]),
    [{ followers: 0, following: 0 }],
  )
})

await transaction(
  'test_c',
  async () => {
    check(
      'test_c accepts test_a, and accepted_at gets filled in',
      await attempt(
        `update public.follows set status = 'accepted'
         where follower_id = $1 and followee_id = auth.uid()
         returning status, accepted_at is not null as stamped`,
        [ids.test_a],
      ),
      [{ status: 'accepted', stamped: true }],
    )
  },
  { commit: true },
)

console.log('\n── After test_c accepts ──')
await transaction('test_a', async () => {
  check('test_a now sees test_c’s 2 RSVPs', await rsvpsOf('test_c'), 2)
  check('... and test_c’s save (saves_public on)', await savesOf('test_c'), 1)
  check(
    'following_going(Record swap): test_c going',
    await attempt(
      `select username, status from public.following_going(for_event => $1)`,
      [ev.e1],
    ),
    [{ username: 'test_c', status: 'going' }],
  )
  check(
    'following_going(Film night): test_b going, then test_c interested',
    await attempt(
      `select username, status from public.following_going(for_event => $1)`,
      [ev.e2],
    ),
    [
      { username: 'test_b', status: 'going' },
      { username: 'test_c', status: 'interested' },
    ],
  )
  check(
    'followers_of(test_c): test_a',
    usernames(
      await attempt(`select * from public.followers_of($1)`, [ids.test_c]),
    ),
    ['test_a'],
  )
  check(
    'followers_of(test_b): test_a; following_of(test_b): test_e',
    [
      usernames(
        await attempt(`select * from public.followers_of($1)`, [ids.test_b]),
      ),
      usernames(
        await attempt(`select * from public.following_of($1)`, [ids.test_b]),
      ),
    ],
    [['test_a'], ['test_e']],
  )
})
await transaction('test_b', async () => {
  check(
    'test_b (not a follower) still can’t see test_c’s RSVPs, saves or followers',
    [
      await rsvpsOf('test_c'),
      await savesOf('test_c'),
      await attempt(`select * from public.followers_of($1)`, [ids.test_c]),
    ],
    [0, 0, []],
  )
  check(
    '... but sees test_c’s follow counts',
    await attempt(`select * from public.follow_counts($1)`, [ids.test_c]),
    [{ followers: 1, following: 0 }],
  )
})

console.log('\n── Changing privacy and saves ──')
await transaction(null, async () => {
  await db.query(
    `insert into public.follows (follower_id, followee_id) values ($1, $2)`,
    [ids.test_e, ids.test_f],
  )
  await become('test_f')
  check(
    'test_f goes public',
    await attempt(
      `update public.profiles set privacy = 'public' where id = auth.uid()
       returning privacy`,
    ),
    [{ privacy: 'public' }],
  )
  await db.exec('reset role')
  check(
    '... and both waiting requests are accepted',
    (
      await db.query(
        `select p.username, f.status, f.accepted_at is not null as stamped
         from public.follows as f
         join public.profiles as p on p.id = f.follower_id
         where f.followee_id = $1 order by p.username`,
        [ids.test_f],
      )
    ).rows,
    [
      { username: 'test_e', status: 'accepted', stamped: true },
      { username: 'test_h', status: 'accepted', stamped: true },
    ],
  )
})
await transaction('test_a', async () => {
  check(
    'test_a goes private',
    await attempt(
      `update public.profiles set privacy = 'private' where id = auth.uid()
       returning privacy`,
    ),
    [{ privacy: 'private' }],
  )
  await become('test_d')
  check(
    '... test_d, already a follower, still sees test_a’s RSVP',
    await rsvpsOf('test_a'),
    1,
  )
  await become('test_e')
  check('... test_e, not a follower, doesn’t', await rsvpsOf('test_a'), 0)
  check(
    '... and following test_a is now a request',
    await attempt(
      `insert into public.follows (followee_id) values ($1) returning status`,
      [ids.test_a],
    ),
    [{ status: 'pending' }],
  )
})
await transaction('test_b', async () => {
  check(
    'test_b turns on saves_public',
    await attempt(
      `update public.profiles set saves_public = true where id = auth.uid()
       returning saves_public`,
    ),
    [{ saves_public: true }],
  )
  await become('test_a')
  check('... and test_a can see test_b’s save', await savesOf('test_b'), 1)
})
await transaction('test_b', async () => {
  const setPrivacy = (value) =>
    attempt(
      `update public.profiles set privacy = $1 where id = auth.uid() returning privacy`,
      [value],
    )
  check(
    'The old privacy values are refused (23514)',
    [await setPrivacy('friends'), await setPrivacy('everyone')],
    [{ error: '23514' }, { error: '23514' }],
  )
  check('"private" is allowed', await setPrivacy('private'), [
    { privacy: 'private' },
  ])
})

console.log('\n── Logged out ──')
await transaction('anon', async () => {
  check(
    'RSVPs: test_d’s show (public), test_c’s don’t (private)',
    [await rsvpsOf('test_d'), await rsvpsOf('test_c')],
    [2, 0],
  )
  check(
    'Saves: test_d’s show; test_c’s (private) and test_b’s (off) don’t',
    [await savesOf('test_d'), await savesOf('test_c'), await savesOf('test_b')],
    [1, 0, 0],
  )
  check(
    'Anyone can read whether an account is private and shows saves',
    await attempt(
      `select privacy, saves_public from public.profiles where username = 'test_c'`,
    ),
    [{ privacy: 'private', saves_public: true }],
  )
  check(
    'followers_of(test_b): test_a; follow_counts(test_b): 1 and 1',
    [
      usernames(
        await attempt(`select * from public.followers_of($1)`, [ids.test_b]),
      ),
      await attempt(`select * from public.follow_counts($1)`, [ids.test_b]),
    ],
    [['test_a'], [{ followers: 1, following: 1 }]],
  )
  check(
    'test_c’s followers list is hidden (private)',
    await attempt(`select * from public.followers_of($1)`, [ids.test_c]),
    [],
  )
  check(
    '... though public test_a still lists test_c under Following',
    usernames(
      await attempt(`select * from public.following_of($1)`, [ids.test_a]),
    ),
    ['test_b', 'test_c'],
  )
  check(
    'Requests are hidden',
    await count(
      `select count(*)::int as n from public.follows where status = 'pending'`,
    ),
    0,
  )
  check(
    'Following is refused (42501)',
    await attempt(`insert into public.follows (followee_id) values ($1)`, [
      ids.test_b,
    ]),
    { error: '42501' },
  )
  check(
    'my_follows is refused (42501)',
    await attempt(`select * from public.my_follows`),
    { error: '42501' },
  )
  for (const call of [
    `public.search_people(q => 'test')`,
    `public.follow_suggestions()`,
    `public.following_going(for_event => ${ev.e1})`,
  ]) {
    check(
      `${call.split('(')[0]}() is refused (42501)`,
      await attempt(`select * from ${call}`),
      { error: '42501' },
    )
  }
})

console.log('\n── Search ──')
await transaction('test_a', async () => {
  const search = (args) =>
    attempt(
      `select username, you_follow, follows_you, privacy
       from public.search_people(${args})`,
    )
  const none = { you_follow: 'none', follows_you: false, privacy: 'public' }
  check(
    '"test": everyone with a username except you',
    await search(`q => 'test'`),
    [
      {
        username: 'test_b',
        you_follow: 'following',
        follows_you: false,
        privacy: 'public',
      },
      {
        username: 'test_c',
        you_follow: 'following',
        follows_you: false,
        privacy: 'private',
      },
      {
        username: 'test_d',
        you_follow: 'none',
        follows_you: true,
        privacy: 'public',
      },
      { username: 'test_e', ...none },
      { username: 'test_f', ...none, privacy: 'private' },
      { username: 'test_h', ...none },
      { username: 'test_i', ...none },
      { username: 'testxk', ...none },
    ],
  )
  check(
    '"@TEST_B": the @ and capitals are ignored',
    usernames(await search(`q => '@TEST_B'`)),
    ['test_b'],
  )
  check(
    '"test_": _ is a plain character, so testxk isn’t matched',
    usernames(await search(`q => 'test_'`)),
    ['test_b', 'test_c', 'test_d', 'test_e', 'test_f', 'test_h', 'test_i'],
  )
  check(
    '"test c" matches a display name',
    usernames(await search(`q => 'test c'`)),
    ['test_c'],
  )
  check(
    'School only: Northeastern finds test_d (test_g has no username)',
    usernames(await search(`from_school => 'Northeastern'`)),
    ['test_d'],
  )
  check(
    'Nothing typed and no school: no results',
    await search(`q => '   '`),
    [],
  )
  check(
    'max_results => 2 gives 2',
    (await search(`q => 'test', max_results => 2`)).length,
    2,
  )
  await attempt(`insert into public.follows (followee_id) values ($1)`, [
    ids.test_f,
  ])
  check(
    'After asking to follow test_f: "requested"',
    (await search(`q => 'test_f'`))[0].you_follow,
    'requested',
  )
})

console.log('\n── Suggestions ──')
const suggestionsSql = `select username, follows_you, followed_by, shared_events,
                               same_school, shared_niches
                        from public.follow_suggestions()`
await transaction('test_a', async () => {
  check(
    'test_a: test_d (follows you, event in common, school, niche), then test_e (followed by test_b)',
    await attempt(suggestionsSql),
    [
      {
        username: 'test_d',
        follows_you: true,
        followed_by: 0,
        shared_events: 1,
        same_school: true,
        shared_niches: ['Records'],
      },
      {
        username: 'test_e',
        follows_you: false,
        followed_by: 1,
        shared_events: 0,
        same_school: false,
        shared_niches: [],
      },
    ],
  )
  check(
    'max_results => 1 gives the top one',
    usernames(
      await attempt(
        `select * from public.follow_suggestions(max_results => 1)`,
      ),
    ),
    ['test_d'],
  )
})
await transaction('test_d', async () => {
  check(
    'test_d: test_b and test_c (followed by test_a); test_c’s hidden RSVP doesn’t count',
    await attempt(suggestionsSql),
    [
      {
        username: 'test_b',
        follows_you: false,
        followed_by: 1,
        shared_events: 1,
        same_school: false,
        shared_niches: [],
      },
      {
        username: 'test_c',
        follows_you: false,
        followed_by: 1,
        shared_events: 0,
        same_school: false,
        shared_niches: [],
      },
    ],
  )
})
await transaction('test_h', async () => {
  check(
    'test_h: nobody (school "Other" doesn’t count as the same school)',
    await attempt(suggestionsSql),
    [],
  )
})

console.log('\n── Existing RSVPs and saves still work ──')
await transaction('test_a', async () => {
  const going = () =>
    count(`select going as n from public.events where id = $1`, [ev.e3])
  check(
    'RSVP Going to Board game night',
    await attempt(
      `insert into public.rsvps (user_id, event_id, status)
       values (auth.uid(), $1, 'going')`,
      [ev.e3],
    ),
    [],
  )
  check('... going count 0 → 1', await going(), 1)
  await attempt(
    `update public.rsvps set status = 'interested'
     where user_id = auth.uid() and event_id = $1`,
    [ev.e3],
  )
  check('... switch to Interested: back to 0', await going(), 0)
  check(
    '... remove it',
    await attempt(
      `delete from public.rsvps where user_id = auth.uid() and event_id = $1
       returning status`,
      [ev.e3],
    ),
    [{ status: 'interested' }],
  )
  check(
    'RSVPing or saving for someone else is still refused (42501)',
    [
      await attempt(
        `insert into public.rsvps (user_id, event_id) values ($1, $2)`,
        [ids.test_b, ev.e3],
      ),
      await attempt(
        `insert into public.saves (user_id, event_id) values ($1, $2)`,
        [ids.test_b, ev.e3],
      ),
    ],
    [{ error: '42501' }, { error: '42501' }],
  )
  await attempt(
    `insert into public.saves (user_id, event_id) values (auth.uid(), $1)`,
    [ev.e2],
  )
  check('Saving an event still works', await savesOf('test_a'), 1)
})

console.log('\n── README previews ──')
await transaction(null, async () => {
  await db.exec(`create table public.notifications (
    id bigint generated always as identity primary key,
    user_id uuid not null,
    type text not null,
    payload jsonb not null default '{}',
    created_at timestamptz not null default now()
  )`)
  await db.exec(readmeSql('create function public.notify_follows'))
  await become('test_e')
  await attempt(`insert into public.follows (followee_id) values ($1)`, [
    ids.testxk,
  ])
  await attempt(`insert into public.follows (followee_id) values ($1)`, [
    ids.test_f,
  ])
  await become('test_f')
  await attempt(
    `update public.follows set status = 'accepted'
     where follower_id = $1 and followee_id = auth.uid()`,
    [ids.test_e],
  )
  await db.exec('reset role')
  check(
    'Notifications: new_follower, follow_request, then follow_accepted',
    (
      await db.query(
        `select n.type, p.username as for_whom
         from public.notifications as n
         join public.profiles as p on p.id = n.user_id
         order by n.id`,
      )
    ).rows,
    [
      { type: 'new_follower', for_whom: 'testxk' },
      { type: 'follow_request', for_whom: 'test_f' },
      { type: 'follow_accepted', for_whom: 'test_e' },
    ],
  )
})
await transaction(null, async () => {
  await db.exec(readmeSql('create table public.event_logs'))
  await become('test_a')
  check(
    'Event log sketch: test_a logs the zine fair',
    await attempt(
      `insert into public.event_logs (event_id, rating) values ($1, 8)`,
      [ev.e0],
    ),
    [],
  )
  await become('anon')
  check(
    '... and anyone can see it, since test_a is public',
    await count(`select count(*)::int as n from public.event_logs`),
    1,
  )
})

console.log(`\n${passed} passed, ${failed.length} failed`)
for (const name of failed) console.log(`  failed: ${name}`)
process.exit(failed.length ? 1 : 0)
