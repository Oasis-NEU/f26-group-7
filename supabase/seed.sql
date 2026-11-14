-- Sample events for building the site before the engine is connected.
--
-- Not a migration: this adds rows, not structure. Paste it into the
-- Supabase SQL editor and run it. It's safe to run again any time; it
-- replaces the old sample rows and moves them to the coming week.
-- Needs migrations 0001-0004.
--
-- Every row is tagged source = 'seed', so real events from the engine are
-- never touched. Dates are "today + N days" in Boston time, so the events
-- always land in the week the Home page shows.
--
-- Stops, lines, neighborhoods and coordinates match engine/stops.py on
-- engine-v1. Each event is placed a short walk from its stop, in a
-- different direction for each event, so map pins don't stack up.

-- Remove the previous sample rows.
delete from public.events where source = 'seed';

-- Optional: also remove the old hand-made placeholder rows (no source)
-- that are already in the past. This also deletes any RSVPs on them.
-- delete from public.events where source is null and start_at < now();

with
  today as (
    select (now() at time zone 'America/New_York')::date as d
  ),

  stops (name, lat, lng) as (
    values
      ('Kenmore', 42.348949, -71.095169),
      ('Fenway', 42.345403, -71.104213),
      ('Longwood', 42.341702, -71.109956),
      ('Museum of Fine Arts', 42.337711, -71.095512),
      ('Northeastern University', 42.340401, -71.088806),
      ('Symphony', 42.342687, -71.085056),
      ('Massachusetts Avenue', 42.341512, -71.083423),
      ('Ruggles', 42.336377, -71.088961),
      ('Park Street', 42.3563946, -71.0624242),
      ('Downtown Crossing', 42.355518, -71.060225),
      ('State', 42.358978, -71.057598),
      ('Government Center', 42.359705, -71.059215),
      ('Boylston', 42.35302, -71.06459),
      ('Chinatown', 42.352547, -71.062752),
      ('Tufts Medical Center', 42.349662, -71.063917),
      ('South Station', 42.352271, -71.055242)
  ),

  v (
    n, title, niche, neighborhood, venue, stop, line, walk_minutes, going,
    day_offset, start_time, change_type, new_day_offset, new_time, new_venue,
    price_min, price_max, description
  ) as (
    values
      -- n, title, niche, neighborhood, venue, stop, line, walk, going,
      -- day, time, change, new day, new time, new venue,
      -- price min, price max (dollars; empty = unknown), description
      --
      -- Days are counted from whenever this file is run, so titles must
      -- not name a weekday ("Sunday flea" could land on a Tuesday).

      -- Today
      (1, 'Vinyl listening hour', 'Records', 'Fenway', 'Westland Ave record nook', 'Symphony', 'GL E', 3, 12,
        0, '17:00'::time, null::text, null::int, null::time, null::text,
        0::numeric, 0::numeric, 'One album, start to finish, on a good turntable. Bring a record to suggest for next week.'),
      (2, 'Board game night in a laundromat', 'Games', 'Fenway', 'Mass Ave laundromat back room', 'Massachusetts Avenue', 'OL', 2, 18,
        0, '19:00', null, null, null, null,
        5, 5, 'Dozens of games and a table for anyone who shows up. Five dollars gets you snacks and a seat.'),
      (3, 'Open mic on the second floor', 'Live music', 'Downtown', 'Winter St walk-up', 'Downtown Crossing', 'OL', 2, 27,
        0, '20:00', 'delayed', 0, '21:00', null,
        0, 0, 'Sign up at the door for a three-song slot. All instruments and all levels.'),
      (4, 'Late study hall with free tea', 'Third spots', 'Fenway', 'Huntington Ave reading room', 'Northeastern University', 'GL E', 3, 9,
        0, '21:00', null, null, null, null,
        0, 0, 'A quiet room, good lamps and a kettle that stays on until midnight.'),

      -- Tomorrow
      (5, 'Bird walk in the Victory Gardens', 'Outdoors', 'Fenway', 'Fenway Victory Gardens', 'Fenway', 'GL D', 6, 14,
        1, '08:00', null, null, null, null,
        0, 0, 'An easy hour looking for migrating warblers. Binoculars to borrow.'),
      (6, 'Free sketch hour in the galleries', 'Museums', 'Fenway', 'Museum of Fine Arts', 'Museum of Fine Arts', 'GL E', 1, 31,
        1, '13:00', null, null, null, null,
        0, 0, 'Pencils and paper provided. Pick a painting and draw it, no experience needed.'),
      (7, 'Dumpling-folding pop-up market', 'Markets', 'Chinatown', 'Tyler St courtyard', 'Chinatown', 'OL', 2, 44,
        1, '16:00', null, null, null, null,
        0, 0, 'Local vendors, a folding demo every hour, and dumplings to take home. Free to walk in.'),
      (8, 'Short film night in a church basement', 'Film', 'Downtown', 'Tremont St parish hall', 'Park Street', 'RL', 3, 19,
        1, '19:00', 'early', 1, '18:30', null,
        8, 8, 'Six short films by Boston students, with the directors there to answer questions.'),
      (9, 'Improv jam for beginners', 'Stage', 'Downtown', 'Boylston St black box', 'Boylston', 'GL', 2, 15,
        1, '20:00', null, null, null, null,
        10, 10, 'Warm-ups, games and short scenes. Nobody has to perform alone.'),

      -- In 2 days
      (10, 'Clothing swap on the plaza', 'Thrift', 'Downtown', 'City Hall Plaza', 'Government Center', 'BL', 2, 52,
        2, '11:00', null, null, null, null,
        0, 0, 'Bring clothes you don''t wear, leave with ones you will. Leftovers are donated.'),
      (11, 'Screen-printing drop-in', 'Makers', 'Chinatown', 'Washington St print studio', 'Tufts Medical Center', 'OL', 4, 11,
        2, '17:00', null, null, null, null,
        15, 25, 'Print a tote or a shirt with one of the studio''s designs. Bring your own shirt for the cheaper price.'),
      (12, 'Poetry reading in a bookshop basement', 'Books', 'Downtown', 'School St used bookshop', 'State', 'OL', 3, 16,
        2, '18:00', null, null, null, null,
        0, 0, 'Three local poets, then an open list for anyone with something to read.'),
      (13, 'Courtyard jazz trio', 'Live music', 'Fenway', 'Peterborough St courtyard', 'Fenway', 'GL D', 6, 9,
        2, '19:30', 'cancelled', null, null, null,
        10, 10, 'Standards under the string lights. Bring a chair if you have one.'),

      -- In 3 days
      (14, 'Kenmore thrift pop-up', 'Thrift', 'Fenway', 'Commonwealth Ave storefront', 'Kenmore', 'GL', 2, 35,
        3, '12:00', null, null, null, null,
        0, 0, 'Racks of vintage jackets and denim, most under twenty dollars.'),
      (15, 'Student gallery opening', 'Galleries', 'Fenway', 'Ruggles St student gallery', 'Ruggles', 'OL', 3, 22,
        3, '18:00', null, null, null, null,
        0, 0, 'New work from this semester''s painting studio. The artists will be there.'),
      (16, 'Speed chess at the food hall', 'Games', 'Downtown', 'South Station food hall', 'South Station', 'RL', 1, 13,
        3, '18:30', 'detour', null, null, 'Summer St atrium',
        0, 0, 'Five-minute games, boards provided. Play as many rounds as you like.'),
      (17, 'Pay-what-you-can classical recital', 'Live music', 'Fenway', 'Gainsborough St music school hall', 'Symphony', 'GL E', 4, 24,
        3, '19:30', null, null, null, null,
        0, 20, 'Senior recitals from conservatory students: piano, strings and voice.'),

      -- In 4 days
      (18, 'Leather District gallery walk', 'Galleries', 'Downtown', 'Lincoln St lofts', 'South Station', 'RL', 5, 26,
        4, '17:00', null, null, null, null,
        0, 0, 'Five studios open their doors for one evening. Start anywhere.'),
      (19, 'Record swap at a noodle bar', 'Records', 'Chinatown', 'Beach St noodle bar', 'Chinatown', 'OL', 3, 23,
        4, '18:00', null, null, null, null,
        0, 0, 'Bring a crate, trade a crate. Noodles are sold separately.'),
      (20, 'Knit and sip', 'Makers', 'Fenway', 'Longwood Ave cafe', 'Longwood', 'GL D', 3, 10,
        4, '19:00', 'delayed', 5, '19:00', null,
        12, 12, 'Bring a project or learn a basic stitch. Includes a drink.'),
      (21, 'Midnight movie: cult classics', 'Film', 'Fenway', 'Brookline Ave screening room', 'Kenmore', 'GL', 4, 38,
        4, '23:00', null, null, null, null,
        12, 12, 'A different cult favorite every week, on a real projector.'),

      -- In 5 days
      (22, 'Makers market on Washington St', 'Markets', 'Downtown', 'Washington St pedestrian zone', 'Downtown Crossing', 'OL', 1, 61,
        5, '10:00', null, null, null, null,
        0, 0, 'Forty tables of ceramics, prints, candles and jewelry by local makers.'),
      (23, 'Greenway walking tour', 'Outdoors', 'Downtown', 'Rose Kennedy Greenway', 'State', 'OL', 4, 20,
        5, '11:00', null, null, null, null,
        0, 0, 'A slow walk through the gardens and public art, about an hour.'),
      (24, 'Zine swap and print fair', 'Books', 'Downtown', 'Boylston St print shop', 'Boylston', 'GL', 2, 17,
        5, '13:00', null, null, null, null,
        0, 0, 'Trade zines, buy a few, or make one at the free copy table.'),
      (25, 'Staged reading of a new play', 'Stage', 'Fenway', 'Huntington Ave rehearsal room', 'Northeastern University', 'GL E', 3, 14,
        5, '19:00', 'early', 5, '18:00', null,
        0, 15, 'A first look at a student play, read by the cast, with a talk afterward.'),
      (26, 'Basement punk show', 'Live music', 'Fenway', 'Hemenway St co-op', 'Symphony', 'GL E', 4, 29,
        5, '20:00', null, null, null, null,
        8, 10, 'Three local bands. All ages; bring earplugs.'),

      -- In 6 days
      (27, 'Vintage flea on the plaza', 'Thrift', 'Downtown', 'City Hall Plaza', 'Government Center', 'BL', 2, 41,
        6, '10:00', null, null, null, null,
        0, 0, 'Clothes, lamps, cameras and records from a dozen sellers.'),
      (28, 'Co-working brunch at a tea house', 'Third spots', 'Chinatown', 'Kneeland St tea house', 'Tufts Medical Center', 'OL', 2, 12,
        6, '11:00', null, null, null, null,
        null, null, 'Bring a laptop and work alongside others over dim sum. Food is ordered at the table.'),
      (29, 'Pay-what-you-wish museum afternoon', 'Museums', 'Fenway', 'Palace Rd museum courtyard', 'Museum of Fine Arts', 'GL E', 5, 33,
        6, '15:00', null, null, null, null,
        0, 25, 'The galleries and courtyard on a pay-what-you-wish ticket.'),
      (30, 'Trivia night at a dumpling house', 'Games', 'Chinatown', 'Harrison Ave dumpling house', 'Chinatown', 'OL', 3, 25,
        6, '19:00', null, null, null, null,
        0, 0, 'Teams of up to six. The winning team eats free.')
  )

insert into public.events (
  title, niche, neighborhood, venue, stop, line, walk_minutes, going,
  start_at, ends_at, change_type, change_new_start, change_new_venue,
  description, price_min, price_max, is_free, lat, lng,
  source, source_id
)
select
  v.title, v.niche, v.neighborhood, v.venue, v.stop, v.line,
  v.walk_minutes, v.going,
  (today.d + v.day_offset + v.start_time) at time zone 'America/New_York',
  -- Markets and thrift run longer than most events.
  (today.d + v.day_offset + v.start_time) at time zone 'America/New_York'
    + case when v.niche in ('Markets', 'Thrift') then interval '4 hours'
           else interval '2 hours' end,
  v.change_type,
  (today.d + v.new_day_offset + v.new_time) at time zone 'America/New_York',
  v.new_venue,
  v.description,
  v.price_min,
  v.price_max,
  -- Free when it costs nothing at most; unknown when there's no price.
  case when v.price_max is null then null else v.price_max = 0 end,
  -- About 56 m of straight line per walking minute, in a different
  -- direction for each event. (1 degree of latitude is about 111 km; at
  -- Boston, 1 degree of longitude is about 82 km.)
  s.lat + v.walk_minutes * 56 / 111000.0 * sin(v.n * 2.4),
  s.lng + v.walk_minutes * 56 / 82000.0 * cos(v.n * 2.4),
  'seed',
  'seed:' || v.n
from v
cross join today
join stops s on s.name = v.stop;
