-- 0008 (DRAFT): Follows, follow requests, and privacy for RSVPs and saves.
--
-- ⚠️ DRAFT FOR PLANNING. Don't paste it into the SQL Editor yet. Check it
-- with docs/follows/db-checks first (see docs/follows/README.md). When
-- it's ready:
--   1. Claim 0008 in the team chat (see supabase/README.md).
--   2. Copy this file to supabase/migrations/0008_follows.sql.
--   3. Change the Settings page's privacy choices in the same pull request
--      (see "Privacy" below), or saving Settings will fail.
--   4. Try it on a local or throwaway database, then paste it into the
--      SQL Editor.
--
-- Needs migrations 0001-0007.
--
-- What it adds:
--   - Accounts are public by default, and can be made private.
--   - follows: one-way follows. Following a public account starts at
--     once. Following a private account sends a request, which its owner
--     accepts or declines. Declining, cancelling, unfollowing and removing
--     a follower all delete the row, as if it never existed, so anyone can
--     ask again later.
--   - RSVPs follow the account's privacy: anyone can see a public
--     account's RSVPs; only accepted followers see a private account's.
--   - Saved events stay private unless their owner turns on saves_public.
--   - my_follows, followers_of(), following_of(), follow_counts(),
--     search_people(), follow_suggestions() and following_going(): what
--     the People page, profile pages and event pages read.

-- ── Privacy: public by default, private if you choose ───────────────────
-- Before: 'everyone', 'friends' (the default) or 'only_me', and only you
-- could read it. Now: 'public' (the default) or 'private', and anyone can
-- read it, so profile pages can say "This account is private" and show
-- the right button ("Follow" or "Request to follow").
--
-- Existing accounts: 'only_me' becomes 'private'. 'friends' becomes
-- 'public', because it was only ever the default: the setting did nothing
-- yet ("This starts to matter once you add friends"). Change that line to
-- make 'friends' private instead if you'd rather not make anyone public.
alter table public.profiles drop constraint profiles_privacy_check;

update public.profiles
set privacy = case when privacy = 'only_me' then 'private' else 'public' end;

alter table public.profiles
  alter column privacy set default 'public',
  add constraint profiles_privacy_check
    check (privacy in ('public', 'private'));

-- Saved events stay private unless you choose to show them.
alter table public.profiles
  add column saves_public boolean not null default false;

grant select (privacy, saves_public) on public.profiles to anon, authenticated;
grant update (saves_public) on public.profiles to authenticated;

-- ── Follows ─────────────────────────────────────────────────────────────
-- One row per follower and person followed. Following is one-way: if Sam
-- follows Jordan, Jordan can follow Sam back, or not.
create table public.follows (
  -- Who follows. The database fills this in with whoever is logged in,
  -- so nobody can follow "as" someone else.
  follower_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  -- Who they follow.
  followee_id uuid not null
    references public.profiles (id) on delete cascade,
  -- 'accepted', or 'pending' while a private account hasn't answered.
  -- The database sets it (see set_follow_status below).
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,

  primary key (follower_id, followee_id),
  constraint follows_status_check
    check (status in ('pending', 'accepted')),
  constraint follows_not_yourself_check
    check (follower_id <> followee_id)
);

-- Followers lists look rows up by who is followed. (The primary key
-- already covers looking them up by follower.)
create index follows_followee_idx on public.follows (followee_id);

-- ── Does one person follow another? ─────────────────────────────────────
-- Accepted follows only. For other database code: rules, triggers, and
-- later messages and plans. The website can't call it, so nobody can ask
-- about two other people.
create function public.is_following(follower uuid, followee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.follows as f
    where f.follower_id = follower
      and f.followee_id = followee
      and f.status = 'accepted'
  )
$$;

revoke execute on function public.is_following(uuid, uuid)
  from public, anon, authenticated;

-- ── Can I see this person's activity? ───────────────────────────────────
-- Their RSVPs (coming up, and the events they went to) and who they
-- follow. True for your own, for public accounts (even when logged out),
-- and for private accounts you follow.
--
-- It only ever answers for whoever is asking. The website calls it too,
-- to tell "This account is private" apart from "Nothing here yet".
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
        select p.privacy = 'public'
          or public.is_following((select auth.uid()), person)
        from public.profiles as p
        where p.id = person
      ),
      false
    )
  end
$$;

-- ── Can I see this person's saved events? ───────────────────────────────
-- Only if they've turned saves_public on, and you can see their activity.
create function public.can_see_saves(person uuid)
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
        select p.saves_public and public.can_see_plans(person)
        from public.profiles as p
        where p.id = person
      ),
      false
    )
  end
$$;

revoke execute on function public.can_see_plans(uuid) from public;
revoke execute on function public.can_see_saves(uuid) from public;
grant execute on function public.can_see_plans(uuid) to anon, authenticated;
grant execute on function public.can_see_saves(uuid) to anon, authenticated;

-- ── Following or asking: the database decides ───────────────────────────
-- Following a public account starts at once. Following a private account
-- is a request until its owner accepts. The website never chooses.
create function public.set_follow_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select p.privacy from public.profiles as p where p.id = new.followee_id
  ) = 'private' then
    new.status = 'pending';
    new.accepted_at = null;
  else
    new.status = 'accepted';
    new.accepted_at = now();
  end if;
  return new;
end;
$$;

create trigger follows_set_status
  before insert on public.follows
  for each row execute function public.set_follow_status();

-- Stamp accepted_at when a request is accepted.
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

create trigger follows_set_accepted_at
  before update on public.follows
  for each row execute function public.set_accepted_at();

-- ── Who can do what with follows ────────────────────────────────────────
alter table public.follows enable row level security;

-- A request is only visible to the two people in it. An accepted follow
-- is visible to anyone who can see either person's activity. So a
-- private account's followers list stays hidden (followers_of() returns
-- nothing), though its public followers still list it on their own
-- Following lists, as on Instagram.
create policy "People can see follows they're allowed to"
  on public.follows for select
  to anon, authenticated
  using (
    (select auth.uid()) in (follower_id, followee_id)
    or (
      status = 'accepted'
      and (
        public.can_see_plans(follower_id)
        or public.can_see_plans(followee_id)
      )
    )
  );

-- Follow as yourself. The website only gives followee_id; the database
-- fills in follower_id (you) and status.
create policy "People can follow as themselves"
  on public.follows for insert
  to authenticated
  with check (follower_id = (select auth.uid()));

-- Only the person being followed can accept a request, and accepting is
-- the only change allowed.
create policy "People can accept requests to follow them"
  on public.follows for update
  to authenticated
  using (followee_id = (select auth.uid()) and status = 'pending')
  with check (followee_id = (select auth.uid()) and status = 'accepted');

-- Either person can delete the row: the follower unfollows or cancels a
-- request; the person followed declines a request or removes a follower.
-- It's as if it never happened, so either of them can ask again later.
create policy "People can remove follows they're in"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) in (follower_id, followee_id));

-- Supabase lets the website do everything to a new table by default. The
-- policies above choose which rows; these choose which columns.
revoke all on public.follows from anon, authenticated;
grant select on public.follows to anon, authenticated;
grant insert (followee_id) on public.follows to authenticated;
grant update (status) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- ── Going public lets everyone waiting in ───────────────────────────────
-- A public account has no requests, so when a private account goes
-- public, waiting requests are accepted. Going private keeps the
-- followers you already have.
create function public.accept_requests_when_public()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.privacy = 'private' and new.privacy = 'public' then
    update public.follows
    set status = 'accepted'
    where followee_id = new.id and status = 'pending';
  end if;
  return null;
end;
$$;

create trigger profiles_accept_requests_when_public
  after update of privacy on public.profiles
  for each row execute function public.accept_requests_when_public();

-- ── RSVPs and saves follow each person's privacy ────────────────────────
-- Before: only you could see your RSVPs and saves. Now: whoever
-- can_see_plans() and can_see_saves() allow.
drop policy "Users can read their own RSVPs" on public.rsvps;

create policy "People can see RSVPs their owner shares"
  on public.rsvps for select
  to anon, authenticated
  using (public.can_see_plans(user_id));

drop policy "Users can read their own saves" on public.saves;

create policy "People can see saves their owner shares"
  on public.saves for select
  to anon, authenticated
  using (public.can_see_saves(user_id));

grant select on public.rsvps to anon, authenticated;
grant select on public.saves to anon, authenticated;

-- ── Your follows, followers and requests, in one list ───────────────────
-- One row per follow you're in, with the other person's public details:
--   direction 'following': you follow them ('pending' means you asked)
--   direction 'follower':  they follow you ('pending' means they asked)
-- Someone who follows you back has two rows, one each way.
-- security_invoker means it runs with the viewer's own permissions, so
-- the rules above still apply.
create view public.my_follows
with (security_invoker = true)
as
select
  case
    when f.follower_id = (select auth.uid()) then 'following'
    else 'follower'
  end as direction,
  f.status,
  f.created_at,
  f.accepted_at,
  p.id as person_id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.school,
  p.privacy
from public.follows as f
join public.profiles as p
  on p.id = case
    when f.follower_id = (select auth.uid()) then f.followee_id
    else f.follower_id
  end
where (select auth.uid()) in (f.follower_id, f.followee_id);

revoke all on public.my_follows from anon, authenticated;
grant select on public.my_follows to authenticated;

-- ── Someone's followers, and who they follow ────────────────────────────
-- For profile pages. Empty for a private account you don't follow.
create function public.followers_of(person uuid)
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
  from public.follows as f
  join public.profiles as p on p.id = f.follower_id
  where f.followee_id = person
    and f.status = 'accepted'
    and public.can_see_plans(person)
  order by coalesce(p.display_name, p.username)
$$;

create function public.following_of(person uuid)
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
  from public.follows as f
  join public.profiles as p on p.id = f.followee_id
  where f.follower_id = person
    and f.status = 'accepted'
    and public.can_see_plans(person)
  order by coalesce(p.display_name, p.username)
$$;

-- ── Follower and following counts ───────────────────────────────────────
-- Shown on every profile, private ones too (like Instagram). It only
-- returns numbers, so it's safe for it to count past the rules.
create function public.follow_counts(person uuid)
returns table (followers integer, following integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)::integer
      from public.follows as f
      where f.followee_id = person and f.status = 'accepted'
    ),
    (
      select count(*)::integer
      from public.follows as f
      where f.follower_id = person and f.status = 'accepted'
    )
$$;

-- ── Find people ─────────────────────────────────────────────────────────
-- The Find tab: people whose username starts with what was typed ("@" is
-- ignored), or whose name contains it, optionally only from one school.
-- Each result says whether you follow them ('following', 'requested' or
-- 'none') and whether they follow you, so the page knows which button to
-- show.
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
  privacy text,
  you_follow text,
  follows_you boolean
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
    p.privacy,
    case mine.status
      when 'accepted' then 'following'
      when 'pending' then 'requested'
      else 'none'
    end,
    coalesce(theirs.status = 'accepted', false)
  from public.profiles as p
  cross join typed
  left join public.follows as mine
    on mine.follower_id = (select auth.uid()) and mine.followee_id = p.id
  left join public.follows as theirs
    on theirs.follower_id = p.id and theirs.followee_id = (select auth.uid())
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

-- ── People you might want to follow ─────────────────────────────────────
-- The Suggestions tab and the "find people" onboarding step. Scores
-- everyone you don't follow or haven't asked to follow yet:
--   3 points if they follow you (so you can follow back)
--   3 points for each person you follow who follows them
--   2 points for each event you've both RSVP'd to (only RSVPs you're
--     allowed to see count, so privacy settings still apply)
--   2 points for the same school ('Other' and 'Not a student' don't count)
--   1 point for each favorite niche you share
-- School and niches mean new people get suggestions before they follow
-- anyone. It returns the numbers behind each score, so the page can say
-- why ("Follows you", "Followed by 2 people you follow"). The points are
-- a starting guess: tune them once there are real users.
create function public.follow_suggestions(max_results integer default 10)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  school text,
  privacy text,
  follows_you boolean,
  followed_by integer,
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
  -- People you follow, or have asked to follow.
  asked as (
    select f.followee_id as id, f.status
    from public.follows as f
    join me on f.follower_id = me.id
  ),
  -- People who follow you.
  fans as (
    select f.follower_id as id
    from public.follows as f
    join me on f.followee_id = me.id
    where f.status = 'accepted'
  ),
  -- How many of the people you follow follow each person.
  via_following as (
    select f.followee_id as id, count(*)::integer as n
    from public.follows as f
    join asked as a on a.id = f.follower_id and a.status = 'accepted'
    where f.status = 'accepted'
    group by f.followee_id
  ),
  -- People with RSVPs on the same events as you.
  shared as (
    select their_rsvp.user_id as id, count(*)::integer as n
    from public.rsvps as my_rsvp
    join public.rsvps as their_rsvp
      on their_rsvp.event_id = my_rsvp.event_id
     and their_rsvp.user_id <> my_rsvp.user_id
    where my_rsvp.user_id = (select auth.uid())
    group by their_rsvp.user_id
  ),
  scored as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.school,
      p.privacy,
      p.created_at,
      exists (select 1 from fans where fans.id = p.id) as follows_you,
      coalesce(v.n, 0) as followed_by,
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
    left join via_following as v on v.id = p.id
    left join shared as s on s.id = p.id
    where p.id <> me.id
      and p.username is not null
      and not exists (select 1 from asked as a where a.id = p.id)
  )
  select
    sc.id,
    sc.username,
    sc.display_name,
    sc.avatar_url,
    sc.school,
    sc.privacy,
    sc.follows_you,
    sc.followed_by,
    sc.shared_events,
    sc.same_school,
    sc.shared_niches
  from scored as sc
  where sc.follows_you
     or sc.followed_by > 0
     or sc.shared_events > 0
     or sc.same_school
     or cardinality(sc.shared_niches) > 0
  order by
    3 * sc.follows_you::integer
      + 3 * sc.followed_by
      + 2 * sc.shared_events
      + 2 * sc.same_school::integer
      + cardinality(sc.shared_niches) desc,
    sc.created_at desc
  limit least(greatest(coalesce(max_results, 10), 1), 50)
$$;

-- ── People you follow who are going to an event ─────────────────────────
-- "3 people you follow are going", with their photos, on the event page.
create function public.following_going(for_event bigint)
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
  from public.follows as f
  join public.rsvps as r
    on r.user_id = f.followee_id and r.event_id = for_event
  join public.profiles as p on p.id = f.followee_id
  where f.follower_id = (select auth.uid())
    and f.status = 'accepted'
  order by r.status, coalesce(p.display_name, p.username)
$$;

-- ── Who can call what ───────────────────────────────────────────────────
-- Profiles are public pages (like Letterboxd), so these work logged out
-- too. Like search_events(), the list functions run with the caller's own
-- permissions, so every rule above still applies inside them.
revoke execute on function public.followers_of(uuid) from public;
revoke execute on function public.following_of(uuid) from public;
revoke execute on function public.follow_counts(uuid) from public;
grant execute on function public.followers_of(uuid) to anon, authenticated;
grant execute on function public.following_of(uuid) to anon, authenticated;
grant execute on function public.follow_counts(uuid) to anon, authenticated;

-- These are about "you", so only logged-in people can call them.
revoke execute on function public.search_people(text, text, integer)
  from public, anon;
revoke execute on function public.follow_suggestions(integer)
  from public, anon;
revoke execute on function public.following_going(bigint)
  from public, anon;
grant execute on function public.search_people(text, text, integer)
  to authenticated;
grant execute on function public.follow_suggestions(integer)
  to authenticated;
grant execute on function public.following_going(bigint) to authenticated;

-- ── Live updates (optional) ─────────────────────────────────────────────
-- Uncomment to have new followers and requests show up without a refresh.
-- Supabase only sends each person the rows the rules above let them see.
-- alter publication supabase_realtime add table public.follows;

-- ── Log ─────────────────────────────────────────────────────────────────
insert into public.schema_migrations (version, name)
values ('0008', 'follows');
