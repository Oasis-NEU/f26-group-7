-- 0007: Searching and filtering events in one place.

-- ── Distance ────────────────────────────────────────────────────────────
-- Straight-line distance in meters between two points, the same formula
-- as haversine_dist in engine/stops.py.
create function public.distance_m(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2))
      * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- ── Search words ────────────────────────────────────────────────────────
-- Turns what someone typed into a search that matches the start of
-- words: "Rec swap!" -> 'rec':* & 'swap':* (finds "record swap"). Anything
-- that isn't a letter or number is ignored, so odd input can't break it.
-- Empty input gives null, meaning "don't filter by words".
create function public.prefix_query(q text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select to_tsquery('english', string_agg(word || ':*', ' & '))
  from regexp_split_to_table(lower(coalesce(q, '')), '[^a-z0-9]+') as word
  where word <> ''
$$;

-- ── Search ──────────────────────────────────────────────────────────────
-- Every filter on the Home page at once, soonest first. Leave a filter
-- out (null) to skip it. Runs with the visitor's own permissions, so only
-- published events come back.
--
--   q              words to look for in title, description, venue,
--                  neighborhood and niche
--   starts_after   events starting at or after this time
--   starts_before  events starting before this time
--   niches         any of these niches
--   near_lat/lng   a point (a T stop) ...
--   within_m       ... and how far from it, in meters
--   free_only      only free events
--   max_price      events whose lowest price is at most this; events with
--                  no price listed are left out
--
-- Dates use each event's scheduled start, like the timetable, so a delayed
-- event stays in its original slot (where its alert chip explains it).
create function public.search_events(
  q text default null,
  starts_after timestamptz default null,
  starts_before timestamptz default null,
  niches text[] default null,
  near_lat double precision default null,
  near_lng double precision default null,
  within_m double precision default null,
  free_only boolean default false,
  max_price numeric default null
)
returns setof public.events
language sql
stable
set search_path = ''
as $$
  select e.*
  from public.events as e,
       (select public.prefix_query(q) as words) as typed
  where (typed.words is null
         or numnode(typed.words) = 0  -- only words like "the"
         or e.search @@ typed.words)
    and (starts_after is null or e.start_at >= starts_after)
    and (starts_before is null or e.start_at < starts_before)
    and (niches is null or cardinality(niches) = 0 or e.niche = any (niches))
    and (not free_only or e.is_free)
    and (max_price is null or e.is_free or e.price_min <= max_price)
    and (within_m is null or near_lat is null or near_lng is null
         or (e.lat is not null
             and public.distance_m(near_lat, near_lng, e.lat, e.lng) <= within_m))
  order by e.start_at
$$;

grant execute on function public.distance_m(
  double precision, double precision, double precision, double precision
) to anon, authenticated;
grant execute on function public.prefix_query(text) to anon, authenticated;
grant execute on function public.search_events(
  text, timestamptz, timestamptz, text[], double precision, double precision,
  double precision, boolean, numeric
) to anon, authenticated;

-- ── Log ─────────────────────────────────────────────────────────────────
insert into public.schema_migrations (version, name)
values ('0007', 'search_events');
