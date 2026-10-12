-- The events table: one row per event.
create table public.events (
  id bigint generated always as identity primary key,
  title text not null,
  niche text not null,
  neighborhood text,
  venue text,
  stop text,
  line text,
  walk_minutes integer,
  going integer not null default 0,
  start_at timestamptz not null,
  change_type text check (change_type in ('delayed', 'early', 'cancelled', 'detour')),
  change_new_start timestamptz,
  change_new_venue text,
  source_url text,
  created_at timestamptz not null default now()
);

-- Lock the table, then let anyone read it (but not write).
alter table public.events enable row level security;

create policy "Anyone can read events"
  on public.events for select
  to anon, authenticated
  using (true);

-- Tell the website when rows change, so it can update live.
alter publication supabase_realtime add table public.events;