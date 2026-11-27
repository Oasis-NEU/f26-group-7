# Follows: roadmap and draft backend

The plan for roadmap step 10 (other people's profiles, following, and
privacy), with the decisions made so far, draft backend code, and checks
that prove the rules work.

> **Status: planning only.** Nothing in the app uses this yet, and none of
> it has been run on the shared Supabase project. The SQL draft passes
> every check in [`db-checks`](db-checks/run.js) on a throwaway local
> database. The JavaScript draft passes the project's lint and Prettier
> checks, and its tests pass when it's copied into `src/lib`.

## The idea

Profiles work like Letterboxd for events: a profile shows the events
someone went to and the ones they've RSVP'd to, and you can follow people
to keep up with them. Following is one-way. They can follow you back if
they want to.

## Decisions

| Question                       | Decision                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Friends or follows?            | One-way follows. Following a public account starts at once. Following a private account sends a request.                                                          |
| Public or private by default?  | Public. Anyone can make their account private.                                                                                                                    |
| Saved events                   | Private by default, with a setting to show them.                                                                                                                  |
| Declined requests              | Deleted, as if they were never sent, so people can change their minds and ask again. Unfollowing, cancelling a request and removing a follower work the same way. |
| Where RSVP privacy is enforced | A rule on the `rsvps` table (saves work the same way), so every query follows it.                                                                                 |
| Phase 3 (what pages read)      | The defaults: plain table writes checked by rules, simple matching for search, scored suggestions, and one view for your own follows.                             |
| Phase 4 (data module)          | The default: `src/lib/follows.js`, in the style of `profiles.js` and `myEvents.js`.                                                                               |
| Phase 5 (testing)              | As planned: test accounts and checks, plus the automated `db-checks` script.                                                                                      |

The draft also makes a few choices of its own. They're listed under
[open questions](#open-questions).

## Files

| File                                                           | What it is                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `README.md`                                                    | This plan                                                                                               |
| [`0008_follows.draft.sql`](0008_follows.draft.sql)             | Draft migration: privacy changes, the follows table, its rules, and the database functions              |
| [`follows.draft.js`](follows.draft.js)                         | Draft `src/lib/follows.js`, written so it can be moved there as it is                                   |
| [`follows.test.draft.js`](follows.test.draft.js)               | Its tests, the future `src/lib/follows.test.js` (the name keeps them out of `npm run check` until then) |
| [`db-checks/run.js`](db-checks/run.js)                         | Loads every migration and the draft into a throwaway database and checks the rules as test users        |
| [`db-checks/supabase-stubs.sql`](db-checks/supabase-stubs.sql) | Stand-ins for the parts of Supabase the migrations need: its roles, `auth.users` and `auth.uid()`       |

## What's already there to build on

- **Profiles** (0005): username, display name, photo, bio, school and
  favorite niches are public. `privacy` is private and has three values
  (`everyone`, `friends`, `only_me`). Phase 2 changes it.
- **Settings > Privacy** saves those three values. It has to change along
  with the migration.
- **RSVPs** (0002, 0006): Going or Interested. Today only the person who
  made an RSVP can read it.
- **Saves** (0006): only the person who saved can read them.
- **Your own profile** (`/profile`) already lists your Going, Interested
  and Saved events.
- **Patterns to copy:** `toProfile()` in `src/lib/profiles.js`,
  `fetchMyUpcoming()` and `upcoming()` in `src/lib/myEvents.js`, `isOver()`
  and `isCancelled()` in `src/lib/schedule.js`, the React Query hooks in
  `src/lib/useMyEvents.js`, and the fake Supabase in
  `src/lib/myEvents.test.js`.
- **Pages:** `/friends` (login required) and `/u/:username` (public) exist
  as placeholders.
- **Not used here:** the old one-to-one `messages` table. Step 11 replaces
  it.

## Roadmap

| Phase             | What                                                                                                                                                                   | Size | Done when                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| 0. Agree          | The decisions above are made. Still to do: the [open questions](#open-questions), claim `0008` in the team chat, and agree on function names with whoever builds pages | S    | Open questions answered                                               |
| 1. Follows        | The follows table and the rules for who can do what                                                                                                                    | M    | Follow, ask, accept, decline, unfollow and remove a follower all work |
| 2. Privacy        | Public and private accounts, the saves setting, `can_see_plans()`, `can_see_saves()`, and the rules on RSVPs and saves                                                 | M    | A private account's RSVPs and saves only reach followers it accepted  |
| 3. Read functions | `my_follows`, `followers_of()`, `following_of()`, `follow_counts()`, `search_people()`, `follow_suggestions()`, `following_going()`                                    | M    | Each returns the right people for the test accounts                   |
| 4. Data module    | `src/lib/follows.js`, `src/lib/useFollows.js` and their tests                                                                                                          | M    | `npm run check` passes                                                |
| 5. Test           | The `db-checks` script, then test accounts on a throwaway Supabase project, then the shared one                                                                        | S    | Every check passes                                                    |
| 6. Pages          | People page, `/u/:username`, "people you follow are going", onboarding step 4, Settings                                                                                | L    | Two accounts can follow each other, and privacy hides and shows RSVPs |

Sizes are relative to each other. Phases 1 to 3 are one migration
(`0008`). Phase 6 is frontend work. If you're staying on the backend, hand
the [contract](#contract-for-the-pages) to whoever builds the pages.

## Phase 1: follows

Draft (the full version is in the SQL file):

```sql
create table public.follows (
  follower_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  followee_id uuid not null
    references public.profiles (id) on delete cascade,
  status text not null default 'pending',  -- 'pending' or 'accepted'
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
```

A trigger sets `status` when a follow is made: `accepted` if the account
is public, `pending` if it's private. The website never chooses.

How each action maps onto the table:

| Action                          | Who    | What changes                                                  |
| ------------------------------- | ------ | ------------------------------------------------------------- |
| Follow a public account         | A      | Insert `{ followee_id: B }`. The database makes it `accepted` |
| Ask to follow a private account | A      | The same insert. The database makes it `pending`              |
| Accept a request                | B only | Update `status` to `accepted`                                 |
| Decline a request               | B      | Delete the row                                                |
| Cancel a request, or unfollow   | A      | Delete the row                                                |
| Remove a follower               | B      | Delete the row                                                |
| Go public                       | B      | Every waiting request is accepted                             |
| Go private                      | B      | Existing followers stay. New follows become requests          |

The rules work like the ones on `rsvps` in 0006: policies choose which
rows someone can touch, and column grants choose which columns (insert
only `followee_id`, update only `status`).

**The options that were considered:**

| Option                                                   | How it works                                   | Why not                                                                  |
| -------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Mutual friends (the original roadmap)                    | Both people agree, and it's one row per pair   | Not how Letterboxd works: you can't follow someone without them agreeing |
| Follows with no private accounts                         | Anyone can follow anyone, everything is public | No way to keep your plans to people you know                             |
| **Follows, with requests for private accounts (chosen)** | Above                                          |                                                                          |

## Phase 2: privacy

**Public or private.** `privacy` becomes `'public'` (the default) or
`'private'`, and anyone can read it, so a profile can say "This account is
private" and show "Request to follow" instead of "Follow". When the
migration runs:

- `only_me` accounts become private.
- `friends` and `everyone` accounts become public. `friends` was only ever
  the default, and the setting didn't do anything yet.

**Saved events.** A new `saves_public` column, off by default. When it's
on, your saves are visible to whoever can see your RSVPs.

**Settings has to change in the same pull request,** because the old
values stop being allowed:

```js
const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
]
```

It also needs a "Show my saved events" checkbox, and `src/lib/profiles.js`
needs `savesPublic` in `toProfile()` and in its list of editable fields.

**Who sees what:**

```sql
-- Internal: does `follower` follow `followee` (accepted)? For rules and
-- triggers only; the website can't call it.
create function public.is_following(follower uuid, followee uuid) ...

-- Can whoever is asking see `person`'s RSVPs, the events they went to,
-- and who they follow?
--   public account:  yes, even logged out
--   private account: only if you follow them (accepted)
create function public.can_see_plans(person uuid) ...

-- Can whoever is asking see `person`'s saved events? Only if saves_public
-- is on and can_see_plans(person) is true.
create function public.can_see_saves(person uuid) ...

create policy "People can see RSVPs their owner shares"
  on public.rsvps for select
  to anon, authenticated
  using (public.can_see_plans(user_id));

create policy "People can see saves their owner shares"
  on public.saves for select
  to anon, authenticated
  using (public.can_see_saves(user_id));
```

These replace the "only you" rules. Every RSVP and save query on the site
today asks only for your own, so nothing that works today changes.

`can_see_plans()` and `can_see_saves()` only ever answer for whoever is
asking, so nobody can use them to look up other people's follows or
settings. The website calls them too, to tell "This account is private"
apart from "Nothing here yet".

**"Went to" events** are the Going RSVPs on events that are over
(cancelled ones left out), so they need nothing new in the database. A
Letterboxd-style diary, where you log the events you went to with an
optional rating and review, could come later:

```sql
-- Later: a log of events you went to, with an optional rating and
-- review. Visible to whoever can_see_plans() allows.
create table public.event_logs (
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  event_id bigint not null references public.events (id) on delete cascade,
  rating smallint check (rating between 1 and 10),  -- half stars, out of 5
  review text check (char_length(review) <= 2000),
  logged_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.event_logs enable row level security;

create policy "People can see logs their owner shares"
  on public.event_logs for select
  to anon, authenticated
  using (public.can_see_plans(user_id));

create policy "People can log events for themselves"
  on public.event_logs for insert
  to authenticated
  with check (user_id = (select auth.uid()));
```

## Phase 3: what the pages read

| Name                                             | Kind     | For                          | Returns                                                                                        | Logged out |
| ------------------------------------------------ | -------- | ---------------------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| `my_follows`                                     | View     | People page, profile buttons | Everyone you follow or who follows you, and requests either way, with `direction` and `status` | No         |
| `followers_of(person)`                           | Function | Profile pages                | That person's followers (empty for a private account you don't follow)                         | Yes        |
| `following_of(person)`                           | Function | Profile pages                | Who that person follows (empty for a private account you don't follow)                         | Yes        |
| `follow_counts(person)`                          | Function | Profile pages                | `{ followers, following }`, even for private accounts                                          | Yes        |
| `search_people(q, from_school)`                  | Function | Find tab                     | Matching people, with `you_follow` (`following`, `requested` or `none`) and `follows_you`      | No         |
| `follow_suggestions(max_results)`                | Function | Suggestions tab, onboarding  | People you might want to follow, with the numbers behind each suggestion                       | No         |
| `following_going(for_event)`                     | Function | Event page                   | People you follow with an RSVP for that event, going or interested                             | No         |
| `can_see_plans(person)`, `can_see_saves(person)` | Function | Profile pages                | Whether that person's events and saves are hidden from you                                     | Yes        |

Loading a profile by username needs nothing new: anyone can read the
public profile columns, now including `privacy` and `saves_public`.

Suggestions score everyone you don't follow yet:

- 3 points if they follow you (so you can follow back)
- 3 points for each person you follow who follows them
- 2 points for each event you've both RSVP'd to (only RSVPs you're allowed
  to see count)
- 2 points for the same school (`Other` and `Not a student` don't count)
- 1 point for each favorite niche you share

School and niches mean new people get suggestions before they follow
anyone. The points are a starting guess, to tune once there are real
users.

The view and the list functions run with the caller's own permissions,
like `search_events()` in 0007, so the rules from Phases 1 and 2 still
apply inside them. Of the new code, only `is_following()`,
`can_see_plans()`, `can_see_saves()` and `follow_counts()` get around the
rules, and they only return true or false, or numbers.

## Phase 4: the data module

The [draft](follows.draft.js) follows `profiles.js` and `myEvents.js`:

| Function                                                      | What it uses                                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `fetchMyFollows()`, `groupFollows()`                          | `my_follows`, split into `{ following, followers, requests, requested }`                                                           |
| `relationshipWith(personId, myId, follows)`                   | Nothing new: works it out from your follows. Gives `youFollow`, `followsYou` and `theyAsked`                                       |
| `followButtonText(person, youFollow)`                         | Nothing: "Follow", "Request to follow", "Requested" or "Following"                                                                 |
| `searchPeople({ q, school })`                                 | `search_people()`                                                                                                                  |
| `fetchSuggestions()`, `suggestionReason()`                    | `follow_suggestions()`, then "Follows you", "Followed by 2 people you follow" and so on                                            |
| `fetchFollowers()`, `fetchFollowing()`, `fetchFollowCounts()` | `followers_of()`, `following_of()`, `follow_counts()`                                                                              |
| `fetchFollowingGoing(eventId)`                                | `following_going()`, split into `{ going, interested }`                                                                            |
| `fetchProfileByUsername(username)`                            | `profiles`, public columns only                                                                                                    |
| `fetchProfileEvents(personId)`, `past()`                      | `can_see_plans()`, `can_see_saves()`, `rsvps` and `saves`, giving `{ plansVisible, savesVisible, going, interested, went, saved }` |
| `follow(personId)`                                            | Inserts into `follows`. Gives `'following'` or `'requested'`, or null if you already did                                           |
| `unfollow()`, `acceptFollower()`, `removeFollower()`          | Delete or update one row of `follows`                                                                                              |

Hooks in the style of `useMyEvents.js`, for a future
`src/lib/useFollows.js`:

```js
const FOLLOWS = ['follows']

// { all, following, followers, requests, requested }
export function useMyFollows() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...FOLLOWS, user?.id],
    queryFn: fetchMyFollows,
    select: (all) => ({ all, ...groupFollows(all) }),
    enabled: Boolean(user),
  })
}

// Follow, unfollow, accept and remove. Each one reloads everything about
// follows when it's done, including what profiles show.
export function useFollowActions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const onSettled = () => queryClient.invalidateQueries({ queryKey: FOLLOWS })

  return {
    follow: useMutation({ mutationFn: follow, onSettled }),
    unfollow: useMutation({
      mutationFn: (personId) => unfollow(user.id, personId),
      onSettled,
    }),
    accept: useMutation({
      mutationFn: (personId) => acceptFollower(user.id, personId),
      onSettled,
    }),
    remove: useMutation({
      mutationFn: (personId) => removeFollower(user.id, personId),
      onSettled,
    }),
  }
}

// What someone's profile shows you. The key includes who's looking,
// because that changes what's visible.
export function useProfileEvents(personId) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...FOLLOWS, 'events', personId, user?.id],
    queryFn: () => fetchProfileEvents(personId),
    enabled: Boolean(personId),
  })
}
```

A sample from the [tests](follows.test.draft.js):

```js
describe('follow', () => {
  it('only sends who to follow, and says when it started', async () => {
    fake.answers.push({ data: { status: 'accepted' }, error: null })
    expect(await follow('sam-id')).toBe('following')
    expect(fake.requests[0]).toEqual({
      table: 'follows',
      steps: [
        ['insert', { followee_id: 'sam-id' }],
        ['select', 'status'],
        ['single'],
      ],
    })
  })

  it('says "requested" for a private account', async () => {
    fake.answers.push({ data: { status: 'pending' }, error: null })
    expect(await follow('sam-id')).toBe('requested')
  })
})
```

To run the tests now, copy `follows.draft.js` to `src/lib/follows.js` and
`follows.test.draft.js` to `src/lib/follows.test.js`, then run
`npx vitest run src/lib/follows.test.js`.

When this moves into `src/lib`, `fetchProfileEvents()` and
`fetchMyUpcoming()` group RSVPs the same way. Pull that into one shared
helper in `myEvents.js`.

## Phase 5: testing

### The automated checks

[`db-checks/run.js`](db-checks/run.js) loads every migration and then this
draft into PGlite (Postgres that runs inside Node, so no Docker), sets up
test accounts, and acts as each of them to check what's allowed and
what's refused. It covers:

- following, asking, accepting, declining and asking again, unfollowing,
  and removing a follower
- what a private account hides, and from whom, before and after a request
  is accepted
- going public (waiting requests get accepted) and going private
  (followers stay)
- the saves setting, and the old privacy values being refused
- what logged-out visitors can and can't see
- search, suggestions, and "people you follow are going"
- RSVPs and saves still working as before
- the SQL examples in this README, run exactly as written

PGlite isn't one of the project's packages, so install it without saving
it:

```bash
npm install --no-save @electric-sql/pglite@0.5.16
node docs/follows/db-checks/run.js
```

It prints PASS or FAIL for each check, and exits with an error if any
fail. The stand-ins for Supabase's roles, `auth.users` and `auth.uid()`
are in [`db-checks/supabase-stubs.sql`](db-checks/supabase-stubs.sql).
Once the draft moves to `supabase/migrations/`, the script loads it from
there instead.

It isn't real Supabase: it doesn't check the API layer the website talks
to, or live updates. So still try the migration on a throwaway Supabase
project (or `supabase start`, which needs Docker) before the shared one.
If the team wants these checks in `npm run check`, add PGlite as a dev
dependency. That fits with the database tests planned for step 15.

### By hand, on a throwaway Supabase project

**Test accounts.** Sign up three accounts on the site (email confirmation
is off): `test_a`, `test_b` and `test_c`. Log in as `test_c` and press
Going on a couple of events. Then, in the SQL Editor, which runs as an
admin so the rules don't apply:

```sql
-- test_c's account is private. test_a follows test_b, and asks to
-- follow test_c.
update public.profiles set privacy = 'private' where username = 'test_c';

insert into public.follows (follower_id, followee_id)
select a.id, b.id
from public.profiles as a, public.profiles as b
where a.username = 'test_a' and b.username in ('test_b', 'test_c');
```

**Acting as a test user.** If your SQL Editor has a role menu, choose
`authenticated` and the user there. Otherwise, wrap each check like this:

```sql
begin;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select id from public.profiles where username = 'test_a'),
  'role', 'authenticated')::text, true);
set local role authenticated;

select * from public.my_follows;  -- test_b (accepted), test_c (pending)

rollback;  -- undoes anything the check changed
```

For the logged-out checks, start a fresh `begin;` with only
`set local role anon;`, so no user is set.

**Checks** (as `test_a` unless it says otherwise):

| Try                                                                  | Expected                                         |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| Read `my_follows`                                                    | `test_b` (accepted) and `test_c` (pending)       |
| Follow `test_b` again                                                | Error 23505: already following                   |
| Follow yourself                                                      | Error 23514                                      |
| Insert a row with `follower_id` set to someone else                  | Permission denied: only `followee_id` can be set |
| Read `test_c`'s RSVPs before `test_c` accepts                        | 0 rows                                           |
| As `test_c`, accept `test_a`'s request                               | Works, and `accepted_at` is filled in            |
| Read `test_c`'s RSVPs after that                                     | They show                                        |
| As `test_b`, read `test_c`'s RSVPs                                   | 0 rows: `test_b` doesn't follow `test_c`         |
| Read `test_c`'s saves with `saves_public` off, then on               | 0 rows, then they show                           |
| As `test_c`, decline a request (delete it), then have them ask again | Works both times                                 |
| As `test_c`, go public with a request waiting                        | The request becomes accepted                     |
| Logged out: read a public account's RSVPs                            | They show                                        |
| Logged out: read a private account's RSVPs or `followers_of()`       | 0 rows                                           |
| Logged out: follow someone, or call `search_people()`                | Permission denied                                |

Then run `npm run check`, and once the pages exist, walk through it in two
browsers (or one normal and one private window).

## Contract for the pages

| Page                             | Uses                                                                                                                      | Notes                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/friends`: Following, Followers | `useMyFollows().following` and `.followers`, `unfollow`, `remove`                                                         | Worth renaming the page to People (`/people`), since nobody is a "friend" now                                                                                                                                   |
| `/friends`: Requests             | `.requests` (accept, or decline with `remove`), `.requested` (cancel with `unfollow`)                                     | Only private accounts get requests                                                                                                                                                                              |
| `/friends`: Find                 | `searchPeople({ q, school })`, `followButtonText()`                                                                       | Reuse `SCHOOL_OPTIONS` from `src/lib/schools.js`                                                                                                                                                                |
| `/friends`: Suggestions          | `fetchSuggestions()`, `suggestionReason()`                                                                                | Following someone removes their card                                                                                                                                                                            |
| `/u/:username`                   | `fetchProfileByUsername`, `fetchFollowCounts`, `relationshipWith`, `useProfileEvents`, `fetchFollowers`, `fetchFollowing` | Tabs: Going, Went to, Saved (when `savesVisible`). A private account you don't follow shows "This account is private" and "Request to follow". It's a public page: logged out, the follow button goes to Log in |
| `/profile` (your own)            | `fetchProfileEvents` for yourself, `fetchFollowCounts`                                                                    | Already lists Going, Interested and Saved. Add Went to and follower counts                                                                                                                                      |
| `/events/:id`                    | `fetchFollowingGoing`                                                                                                     | "3 people you follow are going", with `Avatar`s, next to the going count. Logged in only                                                                                                                        |
| Onboarding step 4                | `fetchSuggestions`, `searchPeople`                                                                                        | "Find people to follow". Can be skipped. Adds a fourth entry to `STEPS` in `Onboarding.jsx`                                                                                                                     |
| Settings > Privacy               | Nothing new                                                                                                               | Public or Private, and a "Show my saved events" checkbox. Has to ship with the migration                                                                                                                        |
| `src/lib/profiles.js`            | Nothing new                                                                                                               | Add `savesPublic` to `toProfile()` and to the editable fields                                                                                                                                                   |

## What later steps reuse

- **Messages (step 11):** who may message whom, such as "anyone can
  message a public account, but only people a private account follows can
  message it". `is_following()` is ready for that rule.
- **Plans and polls (step 12):** inviting people you follow, and a feed of
  what they're going to. The feed reads `rsvps`, which already follows
  privacy.
- **Notifications (step 13):** a trigger on `follows` creates the "new
  follower", "follow request" and "request accepted" notifications. The
  `db-checks` script runs it against a stand-in `notifications` table:

  ```sql
  create function public.notify_follows()
  returns trigger
  language plpgsql security definer set search_path = ''
  as $$
  begin
    if tg_op = 'INSERT' then
      insert into public.notifications (user_id, type, payload)
      values (
        new.followee_id,
        case when new.status = 'pending' then 'follow_request'
             else 'new_follower' end,
        jsonb_build_object('from', new.follower_id)
      );
    elsif old.status = 'pending' and new.status = 'accepted' then
      insert into public.notifications (user_id, type, payload)
      values (new.follower_id, 'follow_accepted',
              jsonb_build_object('by', new.followee_id));
    end if;
    return null;
  end;
  $$;

  create trigger follows_notify
    after insert or update of status on public.follows
    for each row execute function public.notify_follows();
  ```

- **Recommendations (step 14):** "because 3 people you follow are going"
  comes from `following_going()`.

## Changes from the original step 10

| Original                                                | Now                                                                                                  | Why                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Mutual friends, with requests                           | One-way follows, with requests only for private accounts                                             | Your decision                                         |
| Privacy: everyone, friends or only me (default friends) | Public or private (default public), readable by anyone                                               | Your decision                                         |
| Saved events always private                             | Private by default, with a setting to show them                                                      | Your decision                                         |
| A `declined` status                                     | Declined requests are deleted                                                                        | Your decision                                         |
| `are_friends(a, b)` and `can_see_plans(viewer, owner)`  | `is_following(a, b)` for database code only, and `can_see_plans(person)` and `can_see_saves(person)` | Nobody can look up other people's follows or settings |
| Suggestions from mutual friends and shared RSVPs        | Also "follows you", "followed by people you follow", school and niches                               | New people get suggestions on day one                 |

## Open questions

These are choices the draft makes that nobody has decided yet:

1. **A private account's followers and following lists.** The draft hides
   them from people who don't follow the account. Their public followers
   still list them on their own Following lists, as on Instagram. The
   alternative is showing the lists to everyone.
2. **Logged-out visitors.** The draft shows them public profiles in full:
   RSVPs, events they went to, and followers. That's how Letterboxd works.
   The alternative is requiring a login to see anyone's events.
3. **"Went to".** The draft counts Going RSVPs on events that are over.
   The alternative is an explicit "I went" log, with ratings and reviews
   later (see the `event_logs` sketch in Phase 2).
4. **Interested on profiles.** The draft shows Interested next to Going.
   The alternative is showing Going only.
5. **Existing "Friends only" accounts.** The draft makes them public,
   since that was the default nobody chose. The alternative is making
   them private.
6. **The page name.** Rename `/friends` to People?
7. **Live updates** for new followers and requests: turn on realtime for
   `follows` now (one commented-out line in the draft), or wait for
   notifications in step 13?
