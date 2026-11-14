-- 0002: Tables Aidan created by hand in the Supabase dashboard (Oct 2026).
--
-- ⚠️ ALREADY APPLIED to the hosted project. Do NOT run this there.
-- This file records what exists so the database can be rebuilt from git.
-- It was rebuilt from the live database's columns, constraints, policies,
-- triggers and functions.

-- ── events: which API an event came from ────────────────────────────────
alter table public.events
  add column source text,
  add column source_id text;

-- ── profiles: one row per user ──────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  home_neighborhood text,
  favorite_niches text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Anyone can read profiles"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Give every new user an empty profile as soon as they sign up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

-- Runs on Supabase's own users table (verified against the live database).
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── rsvps: who is going to what ─────────────────────────────────────────
create table public.rsvps (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id bigint not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.rsvps enable row level security;

create policy "Users can RSVP for themselves"
  on public.rsvps for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can cancel their own RSVPs"
  on public.rsvps for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read their own RSVPs"
  on public.rsvps for select
  to authenticated
  using (auth.uid() = user_id);

-- Keep events.going in step with the rsvps table.
create function public.update_going()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.events set going = going + 1 where id = new.event_id;
  elsif tg_op = 'DELETE' then
    update public.events set going = greatest(going - 1, 0)
      where id = old.event_id;
  end if;
  return null;
end;
$$;

-- It returns null, so it has to run AFTER the change (a BEFORE trigger
-- returning null would cancel the RSVP).
create trigger rsvps_update_going
  after insert or delete on public.rsvps
  for each row execute function public.update_going();

-- ── messages: one-to-one messages between users ─────────────────────────
create table public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

alter table public.messages enable row level security;

create policy "Users can read their own messages"
  on public.messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Users can send messages as themselves"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "Recipients can mark messages read"
  on public.messages for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- Tell the website when messages arrive, so chats update live.
alter publication supabase_realtime add table public.messages;
