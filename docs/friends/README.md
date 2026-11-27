# Friends: roadmap and draft backend

The plan for roadmap step 10 (friends, other people's profiles, and
privacy), with draft backend code and the other ways each part could be
built.

> **Status: planning only.** Nothing in the app uses this yet, and none of
> it has been run on the shared Supabase project. The SQL draft was tried
> on a throwaway local database (PGlite, Postgres 18, with stand-ins for
> Supabase's roles and `auth.uid()`): migrations 0001 to 0008 load, and 69
> checks pass. They cover every row of the [checks table](#phase-5-testing),
> plus search, suggestions, and the runnable SQL examples in this file.
> The JavaScript draft passes the project's lint and Prettier checks, and
> its tests pass when it's copied into `src/lib`.

| File                                               | What it is                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `README.md`                                        | This plan                                                                                               |
| [`0008_friends.draft.sql`](0008_friends.draft.sql) | Draft migration: the table, its rules, and the database functions                                       |
| [`friends.draft.js`](friends.draft.js)             | Draft `src/lib/friends.js`, written so it can be moved there as it is                                   |
| [`friends.test.draft.js`](friends.test.draft.js)   | Its tests, the future `src/lib/friends.test.js` (the name keeps them out of `npm run check` until then) |

## What's already there to build on

- **Profiles** (0005): username, display name, photo, bio, school and
  favorite niches are public. `privacy` (`everyone`, `friends` or
  `only_me`, default `friends`) is private, readable only through
  `my_profile()`.
- **Settings > Privacy** already saves that choice, with the hint "This
  starts to matter once you add friends." Nothing enforces it yet.
- **RSVPs** (0002, 0006): Going or Interested. Today only the person who
  made an RSVP can read it.
- **Saves** (0006): private, and they stay that way.
- **Patterns to copy:** `toProfile()` in `src/lib/profiles.js`,
  `fetchMyUpcoming()` and `upcoming()` in `src/lib/myEvents.js`, the React
  Query hooks in `src/lib/useMyEvents.js`, and the fake Supabase in
  `src/lib/myEvents.test.js`.
- **Pages:** `/friends` (login required) and `/u/:username` (public) exist
  as placeholders.
- **Not used here:** the old one-to-one `messages` table. Step 11 replaces
  it.

## Roadmap

| Phase             | What                                                                                                                                        | Size | Done when                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------- |
| 0. Agree          | Settle the [open questions](#open-questions-for-the-team), claim `0008` in the team chat, agree on function names with whoever builds pages | S    | Decisions written down                                                                          |
| 1. Friendships    | The table for requests and friendships, and the rules for who can do what                                                                   | M    | Requests can be sent, accepted and removed                                                      |
| 2. Privacy        | `are_friends()`, `can_see_plans()`, and RSVPs that follow each person's privacy setting                                                     | M    | Others see your RSVPs only when your setting allows it                                          |
| 3. Read functions | `my_friendships`, `friends_of()`, `search_people()`, `friend_suggestions()`, `friends_going()`                                              | M    | Each returns the right people for three test accounts                                           |
| 4. Data module    | `src/lib/friends.js`, `src/lib/useFriends.js` and their tests                                                                               | M    | `npm run check` passes                                                                          |
| 5. Test           | Three test accounts, the [checks](#phase-5-testing), then paste into the shared project                                                     | S    | Every check gives the expected result                                                           |
| 6. Pages          | `/friends`, `/u/:username`, "friends going", onboarding step 4, Settings wording                                                            | L    | The original "done when": two accounts can friend each other, and privacy hides and shows RSVPs |

Sizes are relative to each other. Phases 1 to 3 are one migration
(`0008`). Phase 6 is frontend work. If you're staying on the backend, hand
the [contract](#contract-for-the-pages) to whoever builds the pages.

## Phase 1: the friendships table

Draft (the full version is in the SQL file):

```sql
create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  addressee_id uuid not null
    references public.profiles (id) on delete cascade,
  status text not null default 'pending',  -- 'pending' or 'accepted'
  created_at timestamptz not null default now(),
  accepted_at timestamptz,                  -- set by a trigger
  check (requester_id <> addressee_id)
);

-- One row per pair, whichever way round.
create unique index friendships_pair_unique on public.friendships (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id)
);
```

How each action maps onto the table:

| Action         | Who    | What changes                                                                         |
| -------------- | ------ | ------------------------------------------------------------------------------------ |
| Send a request | A      | Insert `{ addressee_id: B }`. The database fills in `requester_id` (A) and `pending` |
| Accept         | B only | Update `status` to `accepted`                                                        |
| Decline        | B      | Delete the row                                                                       |
| Cancel         | A      | Delete the row                                                                       |
| Unfriend       | Either | Delete the row                                                                       |

The rules work the same way as the ones on `rsvps` in 0006: policies
choose which rows someone can touch, and column grants choose which
columns (insert only `addressee_id`, update only `status`).

### Alternatives

| Option                                                      | How                                                                                                                 | Good                                                          | Bad                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **A. One row per pair** (recommended, the original roadmap) | Above                                                                                                               | One table, one row to find, requests and friendships together | "My friends" has to check both columns                                                                                                |
| B. Two rows per friendship, plus a requests table           | `friend_requests (from_id, to_id)` and `friends (user_id, friend_id)`. Accepting inserts both `(a, b)` and `(b, a)` | "My friends" is just `where user_id = me`                     | Two rows to keep in step. Accepting and unfriending need special database functions, because the website can't safely write both rows |
| C. One-way follows, no requests                             | `follows (follower_id, followee_id)`. "Friends" means people who follow each other                                  | Simplest: no Requests tab, nothing to answer                  | Changes the product and what the `friends` privacy option means. Makes it easier to watch someone's plans without them knowing        |

**Declined requests: keep them or delete them?** The original roadmap had
a `declined` status. Keeping declined rows stops the same person asking
again, but they shouldn't be told "declined", so that status would have to
be hidden from them (more rules). The draft deletes the row instead, so
"declined" never exists. If repeated requests become a problem, add a
`blocks` table later. It would fit with reports in step 14.

## Phase 2: privacy

Draft:

```sql
-- Internal: for rules, triggers and later features. The website can't
-- call it.
create function public.are_friends(a uuid, b uuid) returns boolean ...

-- Can whoever is logged in see `person`'s plans?
--   everyone: anyone, even logged out
--   friends:  person's friends
--   only_me:  nobody else
create function public.can_see_plans(person uuid) returns boolean ...

drop policy "Users can read their own RSVPs" on public.rsvps;

create policy "People can see RSVPs their owner shares"
  on public.rsvps for select
  to anon, authenticated
  using (public.can_see_plans(user_id));
```

**One change from the original roadmap.** It described
`are_friends(a, b)` and `can_see_plans(viewer, owner)`. Both have to get
around the normal rules to read the private `privacy` column. If the
website could call them with any two people, anyone could ask "are Jordan
and Sam friends?" or work out someone's privacy setting. In the draft,
`can_see_plans(person)` only answers for whoever is logged in, and the
website can't call the two-person `are_friends()` at all.

Every RSVP query on the site today asks only for the logged-in person's
own RSVPs, so widening this rule doesn't change anything that already
works.

### Alternatives

| Option                                                               | How                                                                                                                              | Good                                                                                                        | Bad                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **A. A rule on the rsvps table** (recommended, the original roadmap) | The policy above                                                                                                                 | Applies everywhere at once, so friend activity (step 12) and recommendations (step 14) get privacy for free | Runs a function for each RSVP row read (fine at this size)                         |
| B. Keep RSVPs private, and read other people's through functions     | `rsvps` stays "only you". Functions like `upcoming_rsvps_of(person)` check `can_see_plans()` first, the way `my_profile()` works | The table stays locked, and it's easy to see what's exposed                                                 | Every new feature needs its own function, and any one that forgets the check leaks |

Option B, sketched:

```sql
create function public.upcoming_rsvps_of(person uuid)
returns table (event_id bigint, status text)
language sql stable security definer set search_path = ''
as $$
  select r.event_id, r.status
  from public.rsvps as r
  where r.user_id = person and public.can_see_plans(person)
$$;
```

## Phase 3: what the pages read

| Name                              | Kind     | For                                        | Returns                                                                                                         |
| --------------------------------- | -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `my_friendships`                  | View     | Friends and Requests tabs, profile buttons | Your friendships and requests, with the other person's name and photo, and `direction` (`sent` or `received`)   |
| `friends_of(person)`              | Function | Friends list on `/u/:username`             | That person's friends                                                                                           |
| `search_people(q, from_school)`   | Function | Find tab                                   | Matching people, and how each relates to you: `friends`, `sent`, `received` or `none`                           |
| `friend_suggestions(max_results)` | Function | Suggestions tab, onboarding                | People you might know, with the numbers behind each (mutual friends, shared events, same school, shared niches) |
| `friends_going(for_event)`        | Function | Event page                                 | Friends with an RSVP for that event, and whether each is going or interested                                    |
| `can_see_plans(person)`           | Function | `/u/:username`                             | Whether that person's plans are hidden from you                                                                 |

Loading a profile by username needs nothing new, because anyone can
already read the public profile columns.

The view and the four list functions run with the caller's own
permissions, like `search_events()` in 0007, so the Phase 1 and 2 rules
still apply inside them. Of the new code, only `are_friends()` and
`can_see_plans()` get around the rules, and all they return is true or
false.

### Alternatives

**Changes: plain table writes (recommended), or a function for each
action.** The draft writes to the table directly, the way RSVPs and saves
work, and lets the rules do the checking. The alternative is a function
like `send_friend_request(to_username)`, which can do several steps at
once, such as accepting their request if they already asked you:

```sql
create function public.send_friend_request(to_username text)
returns text  -- 'sent', 'accepted' (they'd already asked) or 'already'
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  them uuid;
begin
  select id into them from public.profiles where username = to_username;
  if them is null or them = me then
    raise exception 'Nobody to add';
  end if;

  update public.friendships set status = 'accepted'
    where requester_id = them and addressee_id = me and status = 'pending';
  if found then return 'accepted'; end if;

  insert into public.friendships (requester_id, addressee_id)
    values (me, them) on conflict do nothing;
  return case when found then 'sent' else 'already' end;
end;
$$;
```

That gives nicer messages and one place to add limits later. But it gets
around the rules, so a mistake in it is a security hole, and it works
differently from RSVPs and saves. With plain table writes, the page covers
the same case: when someone has already asked you, `search_people()` says
`received`, and the page shows "Accept" instead of "Add friend".

**Search: simple matching (recommended for now), full-text, or fuzzy.**
The draft matches the start of the username, or anywhere in the display
name. It needs no extensions and nothing has to be escaped, which matters
because `_` is allowed in usernames but is a wildcard in `like`. Later
options:

- A `search` column on profiles like the one on events. Use the `simple`
  dictionary, not `english`, so names aren't cut down to word stems.
- `pg_trgm`, so typos like "jordon" still match. Step 4 already plans to
  turn it on for finding duplicate events.

**Suggestions: scored (recommended), or same school only.** The scored
version still has suggestions on day one, when nobody has friends or
shared RSVPs yet, because school and niches count. The simplest version
is "people at your school you aren't connected to yet", about 10 lines of
SQL. That's enough for a demo, and it's easy to swap out later.

**Lists: a view (recommended), loading profiles through the links, or one
function per list.** Because `friendships` points at `profiles`, the
website could load names with
`select('*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')`.
Then every page has to work out which side is "the other person". The view
does that once.

## Phase 4: the data module

The [draft](friends.draft.js) follows `profiles.js` and `myEvents.js`:

| Function                                          | What it uses                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `fetchMyFriendships()`, `groupFriendships()`      | `my_friendships`, split into `{ friends, received, sent }`                                                       |
| `relationshipWith(personId, myId, friendships)`   | Nothing: works it out from your friendships. Gives `self`, `friends`, `sent`, `received` or `none`, plus the row |
| `searchPeople({ q, school })`                     | `search_people()`                                                                                                |
| `fetchSuggestions()`, `suggestionReason()`        | `friend_suggestions()`, then "3 mutual friends", "Also at Northeastern" and so on                                |
| `fetchFriendsOf(personId)`                        | `friends_of()`                                                                                                   |
| `fetchFriendsGoing(eventId)`                      | `friends_going()`, split into `{ going, interested }`                                                            |
| `fetchProfileByUsername(username)`                | `profiles`, public columns only                                                                                  |
| `fetchUpcomingFor(personId)`                      | `can_see_plans()` and `rsvps`, giving `{ visible, going, interested }`                                           |
| `sendFriendRequest(personId)`                     | Inserts into `friendships`. Turns error 23505 into "One of you already sent a friend request."                   |
| `acceptFriendRequest(id)`, `removeFriendship(id)` | Update and delete                                                                                                |

Hooks in the style of `useMyEvents.js`, for a future
`src/lib/useFriends.js`:

```js
const FRIENDS = ['friends']

// Your friends and requests: { all, friends, received, sent }
export function useMyFriendships() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...FRIENDS, user?.id],
    queryFn: fetchMyFriendships,
    select: (all) => ({ all, ...groupFriendships(all) }),
    enabled: Boolean(user),
  })
}

// Send, accept and remove. Each reloads every friends list when it's done.
export function useFriendActions() {
  const queryClient = useQueryClient()
  const onSettled = () => queryClient.invalidateQueries({ queryKey: FRIENDS })

  return {
    send: useMutation({ mutationFn: sendFriendRequest, onSettled }),
    accept: useMutation({ mutationFn: acceptFriendRequest, onSettled }),
    remove: useMutation({ mutationFn: removeFriendship, onSettled }),
  }
}

// "3 friends going" on an event page. Logged out, it doesn't run.
export function useFriendsGoing(eventId) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...FRIENDS, 'going', String(eventId), user?.id],
    queryFn: () => fetchFriendsGoing(eventId),
    enabled: Boolean(user),
  })
}
```

A sample from the [tests](friends.test.draft.js):

```js
describe('sendFriendRequest', () => {
  it('only sends who the request is for', async () => {
    await sendFriendRequest('sam-id')
    expect(fake.requests[0]).toEqual({
      table: 'friendships',
      steps: [['insert', { addressee_id: 'sam-id' }]],
    })
  })

  it('explains a request that already exists', async () => {
    fake.answers.push({ data: null, error: { code: '23505' } })
    await expect(sendFriendRequest('sam-id')).rejects.toThrow(
      /already sent a friend request/,
    )
  })
})
```

To run the tests now, copy `friends.draft.js` to `src/lib/friends.js` and
`friends.test.draft.js` to `src/lib/friends.test.js`, then run
`npx vitest run src/lib/friends.test.js`.

When this moves into `src/lib`, `fetchUpcomingFor()` and
`fetchMyUpcoming()` group RSVPs the same way. Pull that into one shared
helper in `myEvents.js`.

## Phase 5: testing

**Try it somewhere safe first.** Migrations go straight into the one
shared project, so run 0001 to 0008 on a throwaway database first:

- a local Supabase (the Supabase CLI's `supabase start`, which needs
  Docker Desktop running)
- a spare free Supabase project
- PGlite, which runs Postgres inside Node with no Docker. That's how this
  draft was tested, with small stand-ins for Supabase's roles,
  `auth.users` and `auth.uid()`.

**Test accounts.** Sign up three accounts on the site (email confirmation
is off): `test_a`, `test_b` and `test_c`. Log in as `test_c` and press
Going on a couple of events. Then, in the SQL Editor, which runs as an
admin so the rules don't apply:

```sql
-- test_a and test_b are friends, and test_c has asked test_a.
insert into public.friendships (requester_id, addressee_id, status, accepted_at)
select a.id, b.id, 'accepted', now()
from public.profiles as a, public.profiles as b
where a.username = 'test_a' and b.username = 'test_b';

insert into public.friendships (requester_id, addressee_id)
select c.id, a.id
from public.profiles as a, public.profiles as c
where a.username = 'test_a' and c.username = 'test_c';
```

**Acting as a test user.** If your SQL Editor has a role menu, choose
`authenticated` and the user there. Otherwise, wrap each check like this:

```sql
begin;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select id from public.profiles where username = 'test_a'),
  'role', 'authenticated')::text, true);
set local role authenticated;

select * from public.my_friendships;  -- test_b (friends), test_c (received)

rollback;  -- undoes anything the check changed
```

For the logged-out checks, start a fresh `begin;` with only
`set local role anon;`, so no user is set.

**Checks** (as `test_a` unless it says otherwise):

| Try                                                                                    | Expected                                          |
| -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Read `my_friendships`                                                                  | `test_b` (friends) and `test_c` (received)        |
| Send `test_b` a request                                                                | Error 23505: already friends                      |
| Send yourself a request                                                                | Error 23514                                       |
| Insert a row with `requester_id` set to `test_c`'s id                                  | Permission denied: only `addressee_id` can be set |
| As `test_c`, accept the request `test_c` sent                                          | 0 rows changed                                    |
| Accept `test_c`'s request                                                              | Works, and `accepted_at` is filled in             |
| As `test_b`, read the request from `test_c` (before it's accepted)                     | 0 rows                                            |
| Read `test_c`'s RSVPs while `test_c`'s privacy is `friends` and you aren't friends yet | 0 rows                                            |
| Same, after accepting `test_c`'s request                                               | `test_c`'s RSVPs show                             |
| Same, after `test_c` sets privacy to `only_me`                                         | 0 rows again                                      |
| Read `test_b`'s saves                                                                  | 0 rows                                            |
| Logged out: read `friendships`                                                         | Permission denied                                 |
| Logged out: read the RSVPs of someone whose privacy is `everyone`                      | They show                                         |
| Logged out: call `search_people()`                                                     | Permission denied                                 |

Then run `npm run check`, and once the pages exist, walk through it in two
browsers (or one normal and one private window).

## Contract for the pages

| Page                        | Uses                                                                               | Notes                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/friends`, Friends tab     | `useMyFriendships().friends`, `remove`                                             | Ask before unfriending                                                                 |
| `/friends`, Requests tab    | `.received` (accept, decline) and `.sent` (cancel)                                 | Decline and cancel are both `remove`                                                   |
| `/friends`, Find tab        | `searchPeople({ q, school })`                                                      | Reuse `SCHOOL_OPTIONS` from `src/lib/schools.js`. The button comes from `relationship` |
| `/friends`, Suggestions tab | `fetchSuggestions()`, `suggestionReason()`                                         | "Add friend" removes the card                                                          |
| `/u/:username`              | `fetchProfileByUsername`, `relationshipWith`, `fetchFriendsOf`, `fetchUpcomingFor` | It's a public page: logged out, show the profile and "Log in to see friends"           |
| `/events/:id`               | `useFriendsGoing`                                                                  | "3 friends going" with `Avatar`s, next to the going count. Logged in only              |
| Onboarding step 4           | `fetchSuggestions`, `searchPeople`                                                 | Can be skipped. Adds a fourth entry to `STEPS` in `Onboarding.jsx`                     |
| Settings > Privacy          | Nothing new                                                                        | Replace the "starts to matter" hint with what each choice shows                        |

## What later steps reuse

- **Messages (step 11):** `are_friends()`, if only friends may start a DM.
  That's a decision for step 11.
- **Plans and polls (step 12):** inviting friends checks `are_friends()`.
  The friend activity feed reads `rsvps`, which already follows privacy.
- **Notifications (step 13):** a trigger on `friendships` creates the
  "friend request" and "request accepted" notifications:

  ```sql
  create function public.notify_friendships()
  returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if tg_op = 'INSERT' then
      insert into public.notifications (user_id, type, payload)
      values (new.addressee_id, 'friend_request',
              jsonb_build_object('from', new.requester_id));
    elsif old.status = 'pending' and new.status = 'accepted' then
      insert into public.notifications (user_id, type, payload)
      values (new.requester_id, 'friend_accepted',
              jsonb_build_object('by', new.addressee_id));
    end if;
    return null;
  end;
  $$;

  create trigger friendships_notify
    after insert or update of status on public.friendships
    for each row execute function public.notify_friendships();
  ```

- **Recommendations (step 14):** "because 3 friends are going" comes from
  `friends_going()`.

## Changes from the original step 10

| Original                                               | This plan                                                               | Why                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `are_friends(a, b)` and `can_see_plans(viewer, owner)` | `are_friends(a, b)` for database code only, and `can_see_plans(person)` | Nobody can look up other people's friendships or privacy settings |
| `status`: pending, accepted or declined                | Pending or accepted. Declining deletes the row                          | Simpler, and nobody gets told "declined"                          |
| Suggestions from mutual friends and shared RSVPs       | Also school and shared niches                                           | New users get suggestions on day one                              |
| Separate functions for each list                       | One `my_friendships` view                                               | One query fills all three Friends lists                           |

## Open questions for the team

1. **Who can see a friends list?** The draft says anyone logged in. The
   alternatives are everyone (even logged out), or following each
   person's privacy setting.
2. **Does Interested count as a plan?** The draft says yes: people who can
   see your plans see both Going and Interested. The alternative is
   sharing Going only.
3. **Keep declined requests?** The draft says no (see Phase 1).
4. **Requests or follows?** The draft uses requests (see Phase 1,
   option C).
5. **Who builds the pages, and when?** The backend can be finished and
   tested without them.
6. **Live updates for new requests:** turn on realtime for `friendships`
   now (one commented-out line in the draft), or wait for notifications in
   step 13?
