-- Sample events for building the site before the engine is connected.
--
-- Not a migration: this adds rows, not structure. Paste it into the
-- Supabase SQL editor and run it. It's safe to run again any time; it
-- replaces the old sample rows and moves them to the coming week.
--
-- Every row is tagged source = 'seed', so real events from the engine are
-- never touched. Dates are "today + N days" in Boston time, so the events
-- always land in the week the Home page shows.
--
-- Stops, lines and neighborhoods match engine/stops.py on engine-v1.

-- Remove the previous sample rows.
delete from public.events where source = 'seed';

-- Optional: also remove the old hand-made placeholder rows (no source)
-- that are already in the past. This also deletes any RSVPs on them.
-- delete from public.events where source is null and start_at < now();

insert into public.events (
  title, niche, neighborhood, venue, stop, line, walk_minutes, going,
  start_at, change_type, change_new_start, change_new_venue,
  source, source_id
)
select
  v.title, v.niche, v.neighborhood, v.venue, v.stop, v.line,
  v.walk_minutes, v.going,
  (today.d + v.day_offset + v.start_time) at time zone 'America/New_York',
  v.change_type,
  (today.d + v.new_day_offset + v.new_time) at time zone 'America/New_York',
  v.new_venue,
  'seed',
  'seed:' || v.n
from
  (select (now() at time zone 'America/New_York')::date as d) as today,
  (values
    -- n, title, niche, neighborhood, venue, stop, line, walk, going,
    -- day, time, change, new day, new time, new venue
    --
    -- Days are counted from whenever this file is run, so titles must
    -- not name a weekday ("Sunday flea" could land on a Tuesday).

    -- Today
    (1, 'Vinyl listening hour', 'Records', 'Fenway', 'Westland Ave record nook', 'Symphony', 'GL E', 3, 12,
      0, '17:00'::time, null::text, null::int, null::time, null::text),
    (2, 'Board game night in a laundromat', 'Games', 'Fenway', 'Mass Ave laundromat back room', 'Massachusetts Avenue', 'OL', 2, 18,
      0, '19:00', null, null, null, null),
    (3, 'Open mic on the second floor', 'Live music', 'Downtown', 'Winter St walk-up', 'Downtown Crossing', 'OL', 2, 27,
      0, '20:00', 'delayed', 0, '21:00', null),
    (4, 'Late study hall with free tea', 'Third spots', 'Fenway', 'Huntington Ave reading room', 'Northeastern University', 'GL E', 3, 9,
      0, '21:00', null, null, null, null),

    -- Tomorrow
    (5, 'Bird walk in the Victory Gardens', 'Outdoors', 'Fenway', 'Fenway Victory Gardens', 'Fenway', 'GL D', 6, 14,
      1, '08:00', null, null, null, null),
    (6, 'Free sketch hour in the galleries', 'Museums', 'Fenway', 'Museum of Fine Arts', 'Museum of Fine Arts', 'GL E', 1, 31,
      1, '13:00', null, null, null, null),
    (7, 'Dumpling-folding pop-up market', 'Markets', 'Chinatown', 'Tyler St courtyard', 'Chinatown', 'OL', 2, 44,
      1, '16:00', null, null, null, null),
    (8, 'Short film night in a church basement', 'Film', 'Downtown', 'Tremont St parish hall', 'Park Street', 'RL', 3, 19,
      1, '19:00', 'early', 1, '18:30', null),
    (9, 'Improv jam for beginners', 'Stage', 'Downtown', 'Boylston St black box', 'Boylston', 'GL', 2, 15,
      1, '20:00', null, null, null, null),

    -- In 2 days
    (10, 'Clothing swap on the plaza', 'Thrift', 'Downtown', 'City Hall Plaza', 'Government Center', 'BL', 2, 52,
      2, '11:00', null, null, null, null),
    (11, 'Screen-printing drop-in', 'Makers', 'Chinatown', 'Washington St print studio', 'Tufts Medical Center', 'OL', 4, 11,
      2, '17:00', null, null, null, null),
    (12, 'Poetry reading in a bookshop basement', 'Books', 'Downtown', 'School St used bookshop', 'State', 'OL', 3, 16,
      2, '18:00', null, null, null, null),
    (13, 'Courtyard jazz trio', 'Live music', 'Fenway', 'Peterborough St courtyard', 'Fenway', 'GL D', 6, 9,
      2, '19:30', 'cancelled', null, null, null),

    -- In 3 days
    (14, 'Kenmore thrift pop-up', 'Thrift', 'Fenway', 'Commonwealth Ave storefront', 'Kenmore', 'GL', 2, 35,
      3, '12:00', null, null, null, null),
    (15, 'Student gallery opening', 'Galleries', 'Fenway', 'Ruggles St student gallery', 'Ruggles', 'OL', 3, 22,
      3, '18:00', null, null, null, null),
    (16, 'Speed chess at the food hall', 'Games', 'Downtown', 'South Station food hall', 'South Station', 'RL', 1, 13,
      3, '18:30', 'detour', null, null, 'Summer St atrium'),
    (17, 'Pay-what-you-can classical recital', 'Live music', 'Fenway', 'Gainsborough St music school hall', 'Symphony', 'GL E', 4, 24,
      3, '19:30', null, null, null, null),

    -- In 4 days
    (18, 'Leather District gallery walk', 'Galleries', 'Downtown', 'Lincoln St lofts', 'South Station', 'RL', 5, 26,
      4, '17:00', null, null, null, null),
    (19, 'Record swap at a noodle bar', 'Records', 'Chinatown', 'Beach St noodle bar', 'Chinatown', 'OL', 3, 23,
      4, '18:00', null, null, null, null),
    (20, 'Knit and sip', 'Makers', 'Fenway', 'Longwood Ave cafe', 'Longwood', 'GL D', 3, 10,
      4, '19:00', 'delayed', 5, '19:00', null),
    (21, 'Midnight movie: cult classics', 'Film', 'Fenway', 'Brookline Ave screening room', 'Kenmore', 'GL', 4, 38,
      4, '23:00', null, null, null, null),

    -- In 5 days
    (22, 'Makers market on Washington St', 'Markets', 'Downtown', 'Washington St pedestrian zone', 'Downtown Crossing', 'OL', 1, 61,
      5, '10:00', null, null, null, null),
    (23, 'Greenway walking tour', 'Outdoors', 'Downtown', 'Rose Kennedy Greenway', 'State', 'OL', 4, 20,
      5, '11:00', null, null, null, null),
    (24, 'Zine swap and print fair', 'Books', 'Downtown', 'Boylston St print shop', 'Boylston', 'GL', 2, 17,
      5, '13:00', null, null, null, null),
    (25, 'Staged reading of a new play', 'Stage', 'Fenway', 'Huntington Ave rehearsal room', 'Northeastern University', 'GL E', 3, 14,
      5, '19:00', 'early', 5, '18:00', null),
    (26, 'Basement punk show', 'Live music', 'Fenway', 'Hemenway St co-op', 'Symphony', 'GL E', 4, 29,
      5, '20:00', null, null, null, null),

    -- In 6 days
    (27, 'Vintage flea on the plaza', 'Thrift', 'Downtown', 'City Hall Plaza', 'Government Center', 'BL', 2, 41,
      6, '10:00', null, null, null, null),
    (28, 'Co-working brunch at a tea house', 'Third spots', 'Chinatown', 'Kneeland St tea house', 'Tufts Medical Center', 'OL', 2, 12,
      6, '11:00', null, null, null, null),
    (29, 'Pay-what-you-wish museum afternoon', 'Museums', 'Fenway', 'Palace Rd museum courtyard', 'Museum of Fine Arts', 'GL E', 5, 33,
      6, '15:00', null, null, null, null),
    (30, 'Trivia night at a dumpling house', 'Games', 'Chinatown', 'Harrison Ave dumpling house', 'Chinatown', 'OL', 3, 25,
      6, '19:00', null, null, null, null)
  ) as v (
    n, title, niche, neighborhood, venue, stop, line, walk_minutes, going,
    day_offset, start_time, change_type, new_day_offset, new_time, new_venue
  );
