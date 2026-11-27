-- 0008 (DRAFT): Friends, friend requests, and privacy for RSVPs.
--
-- ⚠️ DRAFT FOR PLANNING. This has NOT been run anywhere, not even on a
-- local database. Don't paste it into the SQL Editor yet. When it's ready:
--   1. Claim 0008 in the team chat (see supabase/README.md).
--   2. Copy this file to supabase/migrations/0008_friends.sql.
--   3. Try it on a local or throwaway database first, using the checks in
--      docs/friends/README.md, then paste it into the SQL Editor.
--
-- Needs migrations 0001-0007.
--
-- What it adds:
--   - friendships: one row per pair of people. A row starts as a request
--     ('pending') and becomes a friendship ('accepted'). Declining,
--     cancelling and unfriending all delete the row.
--   - are_friends() and can_see_plans(): the two questions every later
--     social feature asks (messages, plans, notifications).
--   - RSVPs follow each person's privacy setting (Settings > Privacy),
--     instead of only being visible to the person who made them.
--   - my_friendships, friends_of(), search_people(), friend_suggestions()
--     and friends_going(): what the Friends page, profile pages and event
--     pages read.

-- ── Friendships ─────────────────────────────────────────────────────────
-- Points at profiles (not auth.users like rsvps does), so every friend
-- is someone with a profile, and the website can load a person's name
-- and photo along with the row if it wants to.
create table public.friendships (
  id bigint generated always as identity primary key,
  -- Who sent the request. The database fills this in with whoever is
  -- logged in, so nobody can send a request "from" someone else.
  requester_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  -- Who the request was sent to.
  addressee_id uuid not null
    references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  -- When the request was accepted (set by the trigger below).
  accepted_at timestamptz,

  constraint friendships_status_check
    check (status in ('pending', 'accepted')),
  constraint friendships_not_yourself_check
    check (requester_id <> addressee_id)
);

-- One row per pair, whichever way round: if Jordan asked Sam, Sam can't
-- also ask Jordan. Sending a request that already exists (either way)
-- fails with error 23505, the same "must be unique" error as a taken
-- username.
create unique index friendships_pair_unique
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

-- "My friends" and "my requests" look people up from either side.
create index friendships_requester_idx on public.friendships (requester_id);
create index friendships_addressee_idx on public.friendships (addressee_id);

-- Stamp accepted_at when a request is accepted. The website can only
-- change status (see the grants below), so it can't fake the date.
create function public.set_accepted_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.accepted_at = now();
  end if;
  return new;
end;
$$;

create trigger friendships_set_accepted_at
  before update on public.friendships
  for each row execute function public.set_accepted_at();

-- ── Who can do what with friendships ────────────────────────────────────
alter table public.friendships enable row level security;

-- Logged-in people can see anyone's friends (for friends lists on
-- profiles). A request is only visible to the two people in it.
create policy "People can see friendships and their own requests"
  on public.friendships for select
  to authenticated
  using (
    status = 'accepted'
    or (select auth.uid()) in (requester_id, addressee_id)
  );

-- Send a request as yourself. The website only gives addressee_id; the
-- database fills in requester_id (you) and status ('pending').
create policy "People can send friend requests as themselves"
  on public.friendships for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
  );

-- Only the person who got the request can accept it, and accepting is
-- the only change allowed. There's no going back to 'pending'.
create policy "People can accept requests sent to them"
  on public.friendships for update
  to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

-- Either person can delete the row: decline or cancel a request, or
-- unfriend.
create policy "People can remove their own requests and friendships"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Supabase lets the website do everything to a new table by default. The
-- policies above choose which rows; these choose which columns.
revoke all on public.friendships from anon, authenticated;
grant select, delete on public.friendships to authenticated;
grant insert (addressee_id) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

-- ── Are two people friends? ─────────────────────────────────────────────
-- For other database code: rules, triggers, and later messages and
-- plans. The website can't call it, so nobody can ask about two other
-- people.
create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null and exists (
    select 1
    from public.friendships as f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  )
$$;

revoke execute on function public.are_friends(uuid, uuid)
  from public, anon, authenticated;

-- ── Can I see this person's plans? ──────────────────────────────────────
-- True when whoever is asking (logged in or not) may see which events
-- `person` is going to, going by person's privacy setting:
--   everyone  anyone, even logged out
--   friends   person's friends
--   only_me   nobody else
-- Your own plans are always visible to you.
--
-- It only ever answers for whoever is logged in, so it can't be used to
-- look up someone's privacy setting on behalf of someone else. The
-- website calls it too, to tell "Sam keeps their plans private" apart
-- from "Sam isn't going to anything yet".
create function public.can_see_plans(person uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when person = (select auth.uid()) then true
    else coalesce(
      (
        select p.privacy = 'everyone'
          or (
            p.privacy = 'friends'
            and public.are_friends((select auth.uid()), person)
          )
        from public.profiles as p
        where p.id = person
      ),
      false
    )
  end
$$;

revoke execute on function public.can_see_plans(uuid) from public;
grant execute on function public.can_see_plans(uuid) to anon, authenticated;

-- ── RSVPs follow each person's privacy setting ──────────────────────────
-- Before: only you could see your RSVPs. Now: whoever can_see_plans()
-- allows. Saved events stay private (only you), so saves isn't changed.
drop policy "Users can read their own RSVPs" on public.rsvps;

create policy "People can see RSVPs their owner shares"
  on public.rsvps for select
  to anon, authenticated
  using (public.can_see_plans(user_id));

grant select on public.rsvps to anon, authenticated;

-- ── Your friends and requests, in one list ──────────────────────────────
-- One row per friendship or request you're in, with the other person's
-- public profile details. direction is 'sent' (you asked them) or
-- 'received' (they asked you).
--   your friends:        status = 'accepted'
--   requests to answer:  status = 'pending' and direction = 'received'
--   requests you sent:   status = 'pending' and direction = 'sent'
-- security_invoker means it runs with the viewer's own permissions, so
-- the rules above still apply.
create view public.my_friendships
with (security_invoker = true)
as
select
  f.id,
  f.status,
  case
    when f.requester_id = (select auth.uid()) then 'sent'
    else 'received'
  end as direction,
  f.created_at,
  f.accepted_at,
  p.id as person_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.school
from public.friendships as f
join public.profiles as p
  on p.id = case
    when f.requester_id = (select auth.uid()) then f.addressee_id
    else f.requester_id
  end
where (select auth.uid()) in (f.requester_id, f.addressee_id);

revoke all on public.my_friendships from anon, authenticated;
grant select on public.my_friendships to authenticated;

-- ── Someone's friends ───────────────────────────────────────────────────
-- The friends list on a profile page (/u/:username).
create function public.friends_of(person uuid)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  school text
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.school
  from public.friendships as f
  join public.profiles as p
    on p.id = case
      when f.requester_id = person then f.addressee_id
      else f.requester_id
    end
  where f.status = 'accepted'
    and person in (f.requester_id, f.addressee_id)
  order by coalesce(p.display_name, p.username)
$$;

-- ── Find people ─────────────────────────────────────────────────────────
-- The Find tab: people whose username starts with what was typed ("@" is
-- ignored), or whose name contains it, optionally only from one school.
-- Each result says how they relate to you, so the page knows which
-- button to show: 'friends', 'sent' (you asked them), 'received' (they
-- asked you) or 'none'.
--
-- People without a username (who haven't finished onboarding) never show.
-- With nothing typed and no school, nothing comes back, rather than
-- everyone on the site.
create function public.search_people(
  q text default null,
  from_school text default null,
  max_results integer default 20
)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  school text,
  relationship text
)
language sql
stable
set search_path = ''
as $$
  with typed as (
    select nullif(ltrim(lower(trim(q)), '@'), '') as words
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.school,
    case
      when f.status = 'accepted' then 'friends'
      when f.requester_id = (select auth.uid()) then 'sent'
      when f.addressee_id = (select auth.uid()) then 'received'
      else 'none'
    end
  from public.profiles as p
  cross join typed
  left join public.friendships as f
    on least(f.requester_id, f.addressee_id)
         = least(p.id, (select auth.uid()))
   and greatest(f.requester_id, f.addressee_id)
         = greatest(p.id, (select auth.uid()))
  where p.id <> (select auth.uid())
    and p.username is not null
    and (typed.words is not null or from_school is not null)
    and (
      typed.words is null
      or starts_with(p.username, typed.words)
      or strpos(lower(p.display_name), typed.words) > 0
    )
    and (from_school is null or p.school = from_school)
  order by
    p.username = typed.words desc,  -- an exact username first
    starts_with(p.username, coalesce(typed.words, '')) desc,
    coalesce(p.display_name, p.username)
  limit least(greatest(coalesce(max_results, 20), 1), 50)
$$;

-- ── People you might know ───────────────────────────────────────────────
-- The Suggestions tab and the "find friends" onboarding step. Scores
-- everyone you aren't already connected to:
--   3 points for each mutual friend
--   2 points for each event you've both RSVP'd to (only RSVPs you're
--     allowed to see count, so privacy settings still apply)
--   2 points for the same school ('Other' and 'Not a student' don't count)
--   1 point for each favorite niche you share
-- School and niches mean new users get suggestions before anyone has
-- friends. It returns the numbers behind each score, so the page can say
-- why ("3 mutual friends"). The points are a starting guess: tune them
-- once there are real users.
create function public.friend_suggestions(max_results integer default 10)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  school text,
  mutual_friends integer,
  shared_events integer,
  same_school boolean,
  shared_niches text[]
)
language sql
stable
set search_path = ''
as $$
  with me as (
    select p.id, p.school, p.favorite_niches
    from public.profiles as p
    where p.id = (select auth.uid())
  ),
  -- Everyone you're friends with or have a request with, either way.
  connected as (
    select
      case when f.requester_id = me.id then f.addressee_id
           else f.requester_id end as id,
      f.status
    from public.friendships as f
    join me on me.id in (f.requester_id, f.addressee_id)
  ),
  -- Friends of your friends, and how many of your friends each one has.
  mutuals as (
    select
      case when f.requester_id = c.id then f.addressee_id
           else f.requester_id end as id,
      count(*)::integer as n
    from public.friendships as f
    join connected as c
      on c.status = 'accepted'
     and c.id in (f.requester_id, f.addressee_id)
    where f.status = 'accepted'
    group by 1
  ),
  -- People with RSVPs on the same events as you.
  shared as (
    select theirs.user_id as id, count(*)::integer as n
    from public.rsvps as mine
    join public.rsvps as theirs
      on theirs.event_id = mine.event_id
     and theirs.user_id <> mine.user_id
    where mine.user_id = (select auth.uid())
    group by theirs.user_id
  ),
  scored as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.school,
      p.created_at,
      coalesce(m.n, 0) as mutual_friends,
      coalesce(s.n, 0) as shared_events,
      coalesce(
        p.school = me.school
          and me.school not in ('Other', 'Not a student'),
        false
      ) as same_school,
      array(
        select unnest(p.favorite_niches)
        intersect
        select unnest(me.favorite_niches)
      ) as shared_niches
    from public.profiles as p
    cross join me
    left join mutuals as m on m.id = p.id
    left join shared as s on s.id = p.id
    where p.id <> me.id
      and p.username is not null
      and not exists (select 1 from connected as c where c.id = p.id)
  )
  select
    sc.id,
    sc.username,
    sc.display_name,
    sc.avatar_url,
    sc.school,
    sc.mutual_friends,
    sc.shared_events,
    sc.same_school,
    sc.shared_niches
  from scored as sc
  where sc.mutual_friends > 0
     or sc.shared_events > 0
     or sc.same_school
     or cardinality(sc.shared_niches) > 0
  order by
    3 * sc.mutual_friends
      + 2 * sc.shared_events
      + 2 * sc.same_school::integer
      + cardinality(sc.shared_niches) desc,
    sc.created_at desc
  limit least(greatest(coalesce(max_results, 10), 1), 50)
$$;

-- ── Friends going to an event ───────────────────────────────────────────
-- "3 friends going", with their photos, on the event page. Friends whose
-- privacy is "Only me" are left out by the RSVP rule above.
create function public.friends_going(for_event bigint)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  status text
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, r.status
  from public.rsvps as r
  join public.friendships as f
    on f.status = 'accepted'
   and (select auth.uid()) in (f.requester_id, f.addressee_id)
   and r.user_id = case
     when f.requester_id = (select auth.uid()) then f.addressee_id
     else f.requester_id
   end
  join public.profiles as p on p.id = r.user_id
  where r.event_id = for_event
  order by r.status, coalesce(p.display_name, p.username)
$$;

-- These read friendships, which logged-out visitors can't, so only
-- logged-in people can call them. Like search_events(), they run with
-- the caller's own permissions, so every rule above still applies.
revoke execute on function public.friends_of(uuid) from public, anon;
revoke execute on function public.search_people(text, text, integer)
  from public, anon;
revoke execute on function public.friend_suggestions(integer)
  from public, anon;
revoke execute on function public.friends_going(bigint) from public, anon;

grant execute on function public.friends_of(uuid) to authenticated;
grant execute on function public.search_people(text, text, integer)
  to authenticated;
grant execute on function public.friend_suggestions(integer)
  to authenticated;
grant execute on function public.friends_going(bigint) to authenticated;

-- ── Live updates (optional) ─────────────────────────────────────────────
-- Uncomment to have new requests show up on the Friends page without a
-- refresh. Supabase only sends each person the rows the rules above let
-- them see.
-- alter publication supabase_realtime add table public.friendships;

-- ── Log ─────────────────────────────────────────────────────────────────
insert into public.schema_migrations (version, name)
values ('0008', 'friends');
