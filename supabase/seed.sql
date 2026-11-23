-- Sample events for building the site before the engine is connected.
--
-- Not a migration: this adds rows, not structure. Paste it into the
-- Supabase SQL editor and run it. It's safe to run again any time; it
-- replaces the old sample rows and moves them to the coming month.
-- Needs migrations 0001-0004.
--
-- Every row is tagged source = 'seed', so real events from the engine are
-- never touched. Dates are "today + N days" in Boston time, so the events
-- always land in the weeks the site shows.
--
-- Stops, lines, neighborhoods and coordinates match engine/stops.py on
-- engine-v1. Each event is placed a short walk from its stop, in a
-- different direction for each event, so map pins don't stack up.
--
-- What's covered, so every part of the site has something to show:
--   - about 50 events over 30 days, in all 13 niches and at all 16 stops
--   - every alert (delayed, early, cancelled, detour)
--   - walks from 1 to 13 minutes, so the walk filter has something to cut
--   - free, cheap, over $20, over $50 and unknown prices
--   - addresses (street only, never a house number), a few left empty
--   - three 21+ events
--   - three hidden events (two pending, one rejected) that must NOT show
--     anywhere on the site; they check the "only published events are
--     public" rule from 0004

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
    n, title, niche, neighborhood, venue, address, stop, line, walk_minutes,
    going, day_offset, start_time, change_type, new_day_offset, new_time,
    new_venue, price_min, price_max, description
  ) as (
    values
      -- n, title, niche, neighborhood, venue, address, stop, line, walk,
      -- going, day, time, change, new day, new time, new venue,
      -- price min, price max (dollars; empty = unknown), description
      --
      -- Days are counted from whenever this file is run, so titles must
      -- not name a weekday ("Sunday flea" could land on a Tuesday).

      -- Today
      (1, 'Vinyl listening hour', 'Records', 'Fenway', 'Westland Ave record nook', 'Westland Ave, Boston, MA 02115', 'Symphony', 'GL E', 3,
        12, 0, '17:00'::time, null::text, null::int, null::time, null::text,
        0::numeric, 0::numeric, 'One album, start to finish, on a good turntable. Bring a record to suggest for next week.'),
      (2, 'Board game night in a laundromat', 'Games', 'Fenway', 'Mass Ave laundromat back room', 'Massachusetts Ave, Boston, MA 02115', 'Massachusetts Avenue', 'OL', 2,
        18, 0, '19:00', null, null, null, null,
        5, 5, 'Dozens of games and a table for anyone who shows up. Five dollars gets you snacks and a seat.'),
      (3, 'Open mic on the second floor', 'Live music', 'Downtown', 'Winter St walk-up', 'Winter St, Boston, MA 02108', 'Downtown Crossing', 'OL', 2,
        27, 0, '20:00', 'delayed', 0, '21:00', null,
        0, 0, 'Sign up at the door for a three-song slot. All instruments and all levels.'),
      (4, 'Late study hall with free tea', 'Third spots', 'Fenway', 'Huntington Ave reading room', 'Huntington Ave, Boston, MA 02115', 'Northeastern University', 'GL E', 3,
        9, 0, '21:00', null, null, null, null,
        0, 0, 'A quiet room, good lamps and a kettle that stays on until midnight.'),

      -- Tomorrow
      (5, 'Bird walk in the Victory Gardens', 'Outdoors', 'Fenway', 'Fenway Victory Gardens', 'Park Dr, Boston, MA 02215', 'Fenway', 'GL D', 6,
        14, 1, '08:00', null, null, null, null,
        0, 0, 'An easy hour looking for migrating warblers. Binoculars to borrow.'),
      (6, 'Free sketch hour in the galleries', 'Museums', 'Fenway', 'Museum of Fine Arts', 'Huntington Ave, Boston, MA 02115', 'Museum of Fine Arts', 'GL E', 1,
        31, 1, '13:00', null, null, null, null,
        0, 0, 'Pencils and paper provided. Pick a painting and draw it, no experience needed.'),
      (7, 'Dumpling-folding pop-up market', 'Markets', 'Chinatown', 'Tyler St courtyard', 'Tyler St, Boston, MA 02111', 'Chinatown', 'OL', 2,
        44, 1, '16:00', null, null, null, null,
        0, 0, 'Local vendors, a folding demo every hour, and dumplings to take home. Free to walk in.'),
      (8, 'Short film night in a church basement', 'Film', 'Downtown', 'Tremont St parish hall', 'Tremont St, Boston, MA 02108', 'Park Street', 'RL', 3,
        19, 1, '19:00', 'early', 1, '18:30', null,
        8, 8, 'Six short films by Boston students, with the directors there to answer questions.'),
      (9, 'Improv jam for beginners', 'Stage', 'Downtown', 'Boylston St black box', 'Boylston St, Boston, MA 02116', 'Boylston', 'GL', 2,
        15, 1, '20:00', null, null, null, null,
        10, 10, 'Warm-ups, games and short scenes. Nobody has to perform alone.'),

      -- In 2 days
      (10, 'Clothing swap on the plaza', 'Thrift', 'Downtown', 'City Hall Plaza', 'City Hall Plaza, Boston, MA 02201', 'Government Center', 'BL', 2,
        52, 2, '11:00', null, null, null, null,
        0, 0, 'Bring clothes you don''t wear, leave with ones you will. Leftovers are donated.'),
      (11, 'Screen-printing drop-in', 'Makers', 'Chinatown', 'Washington St print studio', 'Washington St, Boston, MA 02111', 'Tufts Medical Center', 'OL', 4,
        11, 2, '17:00', null, null, null, null,
        15, 25, 'Print a tote or a shirt with one of the studio''s designs. Bring your own shirt for the cheaper price.'),
      (12, 'Poetry reading in a bookshop basement', 'Books', 'Downtown', 'School St used bookshop', 'School St, Boston, MA 02108', 'State', 'OL', 3,
        16, 2, '18:00', null, null, null, null,
        0, 0, 'Three local poets, then an open list for anyone with something to read.'),
      (13, 'Courtyard jazz trio', 'Live music', 'Fenway', 'Peterborough St courtyard', 'Peterborough St, Boston, MA 02215', 'Fenway', 'GL D', 6,
        9, 2, '19:30', 'cancelled', null, null, null,
        10, 10, 'Standards under the string lights. Bring a chair if you have one.'),
      (31, 'Stand-up in a bar back room', 'Stage', 'Downtown', 'Bromfield St bar back room', 'Bromfield St, Boston, MA 02108', 'Park Street', 'RL', 3,
        21, 2, '21:00', null, null, null, null,
        10, 10, 'Six comics, ten minutes each. Bring an ID; the bar checks at the door.'),

      -- In 3 days
      (14, 'Kenmore thrift pop-up', 'Thrift', 'Fenway', 'Commonwealth Ave storefront', 'Commonwealth Ave, Boston, MA 02215', 'Kenmore', 'GL', 2,
        35, 3, '12:00', null, null, null, null,
        0, 0, 'Racks of vintage jackets and denim, most under twenty dollars.'),
      (15, 'Student gallery opening', 'Galleries', 'Fenway', 'Ruggles St student gallery', 'Ruggles St, Boston, MA 02120', 'Ruggles', 'OL', 3,
        22, 3, '18:00', null, null, null, null,
        0, 0, 'New work from this semester''s painting studio. The artists will be there.'),
      (16, 'Speed chess at the food hall', 'Games', 'Downtown', 'South Station food hall', 'Atlantic Ave, Boston, MA 02110', 'South Station', 'RL', 1,
        13, 3, '18:30', 'detour', null, null, 'Summer St atrium',
        0, 0, 'Five-minute games, boards provided. Play as many rounds as you like.'),
      (17, 'Pay-what-you-can classical recital', 'Live music', 'Fenway', 'Gainsborough St music school hall', 'Gainsborough St, Boston, MA 02115', 'Symphony', 'GL E', 4,
        24, 3, '19:30', null, null, null, null,
        0, 20, 'Senior recitals from conservatory students: piano, strings and voice.'),

      -- In 4 days
      (18, 'Leather District gallery walk', 'Galleries', 'Downtown', 'Lincoln St lofts', 'Lincoln St, Boston, MA 02111', 'South Station', 'RL', 5,
        26, 4, '17:00', null, null, null, null,
        0, 0, 'Five studios open their doors for one evening. Start anywhere.'),
      (19, 'Record swap at a noodle bar', 'Records', 'Chinatown', 'Beach St noodle bar', 'Beach St, Boston, MA 02111', 'Chinatown', 'OL', 3,
        23, 4, '18:00', null, null, null, null,
        0, 0, 'Bring a crate, trade a crate. Noodles are sold separately.'),
      (20, 'Knit and sip', 'Makers', 'Fenway', 'Longwood Ave cafe', 'Longwood Ave, Boston, MA 02115', 'Longwood', 'GL D', 3,
        10, 4, '19:00', 'delayed', 5, '19:00', null,
        12, 12, 'Bring a project or learn a basic stitch. Includes a drink.'),
      -- No address, on purpose: the event page skips the line.
      (21, 'Midnight movie: cult classics', 'Film', 'Fenway', 'Brookline Ave screening room', null, 'Kenmore', 'GL', 4,
        38, 4, '23:00', null, null, null, null,
        12, 12, 'A different cult favorite every week, on a real projector.'),

      -- In 5 days
      (22, 'Makers market on Washington St', 'Markets', 'Downtown', 'Washington St pedestrian zone', 'Washington St, Boston, MA 02108', 'Downtown Crossing', 'OL', 1,
        61, 5, '10:00', null, null, null, null,
        0, 0, 'Forty tables of ceramics, prints, candles and jewelry by local makers.'),
      -- A park, so no street address.
      (23, 'Greenway walking tour', 'Outdoors', 'Downtown', 'Rose Kennedy Greenway', null, 'State', 'OL', 4,
        20, 5, '11:00', null, null, null, null,
        0, 0, 'A slow walk through the gardens and public art, about an hour.'),
      (24, 'Zine swap and print fair', 'Books', 'Downtown', 'Boylston St print shop', 'Boylston St, Boston, MA 02116', 'Boylston', 'GL', 2,
        17, 5, '13:00', null, null, null, null,
        0, 0, 'Trade zines, buy a few, or make one at the free copy table.'),
      (25, 'Staged reading of a new play', 'Stage', 'Fenway', 'Huntington Ave rehearsal room', 'Huntington Ave, Boston, MA 02115', 'Northeastern University', 'GL E', 3,
        14, 5, '19:00', 'early', 5, '18:00', null,
        0, 15, 'A first look at a student play, read by the cast, with a talk afterward.'),
      (26, 'Basement punk show', 'Live music', 'Fenway', 'Hemenway St co-op', 'Hemenway St, Boston, MA 02115', 'Symphony', 'GL E', 4,
        29, 5, '20:00', null, null, null, null,
        8, 10, 'Three local bands. All ages; bring earplugs.'),

      -- In 6 days
      (27, 'Vintage flea on the plaza', 'Thrift', 'Downtown', 'City Hall Plaza', 'City Hall Plaza, Boston, MA 02201', 'Government Center', 'BL', 2,
        41, 6, '10:00', null, null, null, null,
        0, 0, 'Clothes, lamps, cameras and records from a dozen sellers.'),
      (28, 'Co-working brunch at a tea house', 'Third spots', 'Chinatown', 'Kneeland St tea house', 'Kneeland St, Boston, MA 02111', 'Tufts Medical Center', 'OL', 2,
        12, 6, '11:00', null, null, null, null,
        null, null, 'Bring a laptop and work alongside others over dim sum. Food is ordered at the table.'),
      (29, 'Pay-what-you-wish museum afternoon', 'Museums', 'Fenway', 'Palace Rd museum courtyard', 'Palace Rd, Boston, MA 02115', 'Museum of Fine Arts', 'GL E', 5,
        33, 6, '15:00', null, null, null, null,
        0, 25, 'The galleries and courtyard on a pay-what-you-wish ticket.'),
      (30, 'Trivia night at a dumpling house', 'Games', 'Chinatown', 'Harrison Ave dumpling house', 'Harrison Ave, Boston, MA 02111', 'Chinatown', 'OL', 3,
        25, 6, '19:00', null, null, null, null,
        0, 0, 'Teams of up to six. The winning team eats free.'),

      -- Next week (days 7-13)
      (32, 'Record fair in a parish hall', 'Records', 'Fenway', 'Jersey St parish hall', 'Jersey St, Boston, MA 02215', 'Kenmore', 'GL', 9,
        40, 7, '11:00', null, null, null, null,
        0, 0, 'Crates from a dozen local sellers, from one-dollar bins to rare pressings.'),
      (33, 'Bar trivia: music edition', 'Games', 'Fenway', 'Boylston St pub', 'Boylston St, Boston, MA 02215', 'Fenway', 'GL D', 8,
        30, 9, '20:00', null, null, null, null,
        0, 0, 'Five rounds of music questions. Teams of up to five.'),
      (34, 'Pottery wheel taster', 'Makers', 'Fenway', 'Ruggles St clay studio', 'Ruggles St, Boston, MA 02120', 'Ruggles', 'OL', 11,
        8, 10, '18:00', null, null, null, null,
        35, 35, 'Two hours on the wheel with an instructor. Clay and firing included.'),
      -- A riverside path, so no street address.
      (35, 'Lantern walk along the Muddy River', 'Outdoors', 'Fenway', 'Riverway path', null, 'Longwood', 'GL D', 12,
        27, 11, '17:30', null, null, null, null,
        0, 0, 'Bring a lantern or borrow one. About an hour at an easy pace.'),
      (36, 'Open studios on Harrison Ave', 'Galleries', 'Chinatown', 'Harrison Ave artist lofts', 'Harrison Ave, Boston, MA 02118', 'Tufts Medical Center', 'OL', 13,
        34, 12, '17:00', null, null, null, null,
        0, 0, 'A building full of studios, every door open. Prints and small works for sale.'),
      (37, 'Documentary and discussion', 'Film', 'Fenway', 'Huntington Ave lecture hall', 'Huntington Ave, Boston, MA 02115', 'Northeastern University', 'GL E', 5,
        18, 13, '19:00', 'delayed', 13, '19:30', null,
        0, 0, 'A documentary about Boston''s neighborhoods, then a conversation with the filmmaker.'),

      -- In two weeks (days 14-20)
      (38, 'Used book sale in a reading room', 'Books', 'Downtown', 'Tremont St reading room', 'Tremont St, Boston, MA 02111', 'Boylston', 'GL', 4,
        22, 14, '10:00', null, null, null, null,
        1, 2, 'Paperbacks one dollar, hardcovers two. Proceeds buy new books for the room.'),
      (40, 'Winter craft market', 'Markets', 'Fenway', 'Mass Ave church hall', 'Massachusetts Ave, Boston, MA 02115', 'Massachusetts Avenue', 'OL', 3,
        48, 15, '10:00', 'detour', null, null, 'Columbus Ave community room',
        0, 0, 'Knitwear, candles, prints and baked goods from thirty local makers.'),
      (39, 'Late jazz set', 'Live music', 'Chinatown', 'Essex St cocktail bar', 'Essex St, Boston, MA 02111', 'Chinatown', 'OL', 4,
        16, 16, '22:30', null, null, null, null,
        15, 25, 'A quartet playing until one in the morning. Seats at the bar cost less.'),
      (41, 'Free museum evening', 'Museums', 'Fenway', 'Museum of Fine Arts', 'Huntington Ave, Boston, MA 02115', 'Museum of Fine Arts', 'GL E', 1,
        57, 17, '16:00', null, null, null, null,
        0, 0, 'Free entry to the galleries after four, with music in the courtyard.'),
      (42, 'Thrift run with a stylist', 'Thrift', 'Downtown', 'Washington St thrift store', 'Washington St, Boston, MA 02108', 'Downtown Crossing', 'OL', 10,
        13, 18, '14:00', null, null, null, null,
        20, 20, 'An hour of tips on fit and fabric, then shop the racks with a stylist.'),
      -- Price unknown: you just order at the counter.
      (43, 'Quiet morning at a reading cafe', 'Third spots', 'Downtown', 'Court St cafe', 'Court St, Boston, MA 02108', 'Government Center', 'BL', 9,
        7, 19, '08:00', null, null, null, null,
        null, null, 'Open tables and slow coffee before work. Order at the counter.'),
      (44, 'Chamber orchestra open rehearsal', 'Live music', 'Fenway', 'Huntington Ave concert hall', 'Huntington Ave, Boston, MA 02115', 'Symphony', 'GL E', 2,
        36, 20, '19:00', null, null, null, null,
        25, 60, 'Watch a full orchestra work through its program. Student tickets cost the lower price.'),

      -- In three to four weeks (days 21-29)
      (45, 'Indie game showcase', 'Games', 'Downtown', 'Summer St co-working floor', 'Summer St, Boston, MA 02110', 'South Station', 'RL', 6,
        28, 21, '18:00', null, null, null, null,
        0, 0, 'Play unreleased games by local developers and tell them what you think.'),
      (46, 'Shakespeare in a courtyard', 'Stage', 'Downtown', 'State St courtyard', 'State St, Boston, MA 02109', 'State', 'OL', 5,
        31, 22, '19:00', 'cancelled', null, null, null,
        0, 15, 'A short comedy, performed in the round. Blankets provided.'),
      (47, 'Photography show opening', 'Galleries', 'Fenway', 'Forsyth St gallery', 'Forsyth St, Boston, MA 02115', 'Northeastern University', 'GL E', 7,
        19, 23, '18:00', null, null, null, null,
        0, 0, 'Black-and-white street photography from the last year in Boston.'),
      (51, 'Lunchtime talk at a medical library', 'Museums', 'Fenway', 'Longwood Ave medical library', 'Longwood Ave, Boston, MA 02115', 'Longwood', 'GL D', 7,
        11, 24, '12:00', null, null, null, null,
        0, 0, 'A curator shows old instruments from the library''s collection.'),
      (48, 'Vintage market in a parking garage', 'Thrift', 'Fenway', 'Lansdowne St garage level', 'Lansdowne St, Boston, MA 02215', 'Kenmore', 'GL', 6,
        55, 25, '11:00', null, null, null, null,
        0, 0, 'Sixty sellers on one level: clothes, furniture, records and cameras.'),
      (49, 'Night market in a parking lot', 'Markets', 'Chinatown', 'Hudson St lot', 'Hudson St, Boston, MA 02111', 'Chinatown', 'OL', 2,
        70, 27, '17:00', 'early', 27, '16:00', null,
        0, 0, 'Street food, lanterns and craft stalls. Cash helps; some stalls take cards.'),
      (50, 'Cassette and CD swap', 'Records', 'Downtown', 'Province St basement', 'Province St, Boston, MA 02108', 'Park Street', 'RL', 3,
        15, 29, '19:00', null, null, null, null,
        0, 5, 'Trade tapes and CDs, or pay what you can for one from the free-for-all box.'),

      -- Hidden: waiting for approval, or turned down. These must never
      -- appear on the site (see `special` below).
      (52, 'Rooftop clothing swap', 'Thrift', 'Downtown', 'Summer St rooftop', 'Summer St, Boston, MA 02110', 'South Station', 'RL', 4,
        0, 8, '13:00', null, null, null, null,
        0, 0, 'Sent in by a reader and waiting for approval.'),
      (53, 'Open night at a print shop', 'Makers', 'Chinatown', 'Kneeland St print shop', 'Kneeland St, Boston, MA 02111', 'Tufts Medical Center', 'OL', 3,
        0, 12, '18:00', null, null, null, null,
        5, 5, 'Sent in by a reader and waiting for approval.'),
      (54, 'HUGE SALE everything must go', 'Markets', 'Downtown', 'Washington St storefront', 'Washington St, Boston, MA 02108', 'Downtown Crossing', 'OL', 1,
        0, 5, '09:00', null, null, null, null,
        0, 0, 'A store advertisement, not an event, so it was turned down.')
  ),

  -- The few rows that differ from the usual "published, all ages".
  special (n, adults_only, status) as (
    values
      (31, true, 'published'),
      (33, true, 'published'),
      (39, true, 'published'),
      (52, false, 'pending'),
      (53, false, 'pending'),
      (54, false, 'rejected')
  )

insert into public.events (
  title, niche, neighborhood, venue, address, stop, line, walk_minutes,
  going, start_at, ends_at, change_type, change_new_start, change_new_venue,
  description, price_min, price_max, is_free, adults_only, status, lat, lng,
  source, source_id
)
select
  v.title, v.niche, v.neighborhood, v.venue, v.address, v.stop, v.line,
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
  coalesce(special.adults_only, false),
  coalesce(special.status, 'published'),
  -- About 56 m of straight line per walking minute, in a different
  -- direction for each event. (1 degree of latitude is about 111 km; at
  -- Boston, 1 degree of longitude is about 82 km.)
  s.lat + v.walk_minutes * 56 / 111000.0 * sin(v.n * 2.4),
  s.lng + v.walk_minutes * 56 / 82000.0 * cos(v.n * 2.4),
  'seed',
  'seed:' || v.n
from v
cross join today
join stops s on s.name = v.stop
left join special on special.n = v.n;
