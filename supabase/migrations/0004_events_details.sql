-- 0004: More details on each event, and rules that keep events tidy.
--
-- Before running: the check query in the step notes must return no rows,
-- or the new niche/line rules will refuse to be added.

-- ── New columns ─────────────────────────────────────────────────────────
alter table public.events
  -- What the event page shows
  add column description text,
  add column image_url text,
  add column ends_at timestamptz,

  -- Exactly where it is, for the map. The engine already works these out.
  add column address text,
  add column lat double precision,
  add column lng double precision,

  -- Cost in dollars. Empty means unknown; is_free is true for free events.
  add column price_min numeric(8, 2),
  add column price_max numeric(8, 2),
  add column is_free boolean,

  -- 21+ events. The engine already sends this.
  add column adults_only boolean not null default false,

  -- Events people post wait as 'pending' until they're approved.
  add column status text not null default 'published',
  add column submitted_by uuid references auth.users (id) on delete set null,

  -- When the row last changed (kept up to date by the trigger below).
  add column updated_at timestamptz not null default now();

-- ── Rules ───────────────────────────────────────────────────────────────
alter table public.events
  add constraint events_status_check
    check (status in ('published', 'pending', 'rejected')),

  -- Must match src/lib/niches.js (without 'All') and src/lib/lines.js.
  -- To add a niche or line, change those files and add a migration.
  add constraint events_niche_check
    check (niche in (
      'Thrift', 'Markets', 'Records', 'Live music', 'Museums', 'Galleries',
      'Film', 'Stage', 'Books', 'Third spots', 'Outdoors', 'Games', 'Makers'
    )),
  add constraint events_line_check
    check (line in ('GL B', 'GL C', 'GL D', 'GL E', 'GL', 'RL', 'OL', 'BL')),

  add constraint events_price_check
    check (price_min >= 0 and price_max >= price_min),
  add constraint events_ends_after_start_check
    check (ends_at > start_at),

  -- One row per event per source, so re-running the engine updates an
  -- event instead of adding a copy. Rows with no source aren't affected.
  add constraint events_source_unique unique (source, source_id);

-- ── Keep updated_at current ─────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ── Search and speed ────────────────────────────────────────────────────
-- Words to search by, kept up to date by the database itself.
alter table public.events
  add column search tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(venue, '') || ' ' ||
      coalesce(neighborhood, '') || ' ' ||
      coalesce(niche, ''))
  ) stored;

create index events_search_idx on public.events using gin (search);

-- The Home page asks for events by date, so look them up by date quickly.
create index events_start_at_idx on public.events (start_at);

-- ── Who can read events ─────────────────────────────────────────────────
-- Before: anyone could read every event. Now: only published ones, so
-- posted events stay hidden until they're approved.
drop policy "Anyone can read events" on public.events;

create policy "Anyone can read published events"
  on public.events for select
  to anon, authenticated
  using (status = 'published');

-- ── Log ─────────────────────────────────────────────────────────────────
insert into public.schema_migrations (version, name)
values ('0004', 'events_details');
