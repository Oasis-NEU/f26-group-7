import { toSearchArgs } from './filters'
import { supabase } from './supabase'

// The columns the site uses. Not '*': the table also has a large `search`
// column (words for searching) that the browser never needs. Exported for
// queries that load events along with something else (RSVPs, saves).
export const EVENT_COLUMNS = [
  'id',
  'title',
  'niche',
  'description',
  'image_url',
  'neighborhood',
  'venue',
  'address',
  'lat',
  'lng',
  'stop',
  'line',
  'walk_minutes',
  'going',
  'start_at',
  'ends_at',
  'change_type',
  'change_new_start',
  'change_new_venue',
  'price_min',
  'price_max',
  'is_free',
  'adults_only',
  'source',
  'source_url',
].join(',')

function toDate(value) {
  return value ? new Date(value) : null
}

// The database uses snake_case names (start_at); our components use
// camelCase (start). This turns one row into the shape the page expects.
export function toEvent(row) {
  return {
    id: row.id,
    title: row.title,
    niche: row.niche,
    description: row.description,
    imageUrl: row.image_url,
    neighborhood: row.neighborhood,
    venue: row.venue,
    address: row.address,
    // Where to put the pin on the map, if we know.
    location:
      row.lat == null || row.lng == null
        ? null
        : { lat: row.lat, lng: row.lng },
    stop: row.stop,
    line: row.line,
    walkMinutes: row.walk_minutes,
    going: row.going,
    start: new Date(row.start_at),
    end: toDate(row.ends_at),
    change: row.change_type
      ? {
          type: row.change_type,
          newStart: toDate(row.change_new_start),
          newVenue: row.change_new_venue,
        }
      : null,
    // In dollars, or null when the price is unknown.
    price:
      row.price_max == null
        ? null
        : {
            min: Number(row.price_min ?? row.price_max),
            max: Number(row.price_max),
          },
    isFree: row.is_free,
    adultsOnly: row.adults_only,
    source: row.source,
    sourceUrl: row.source_url,
  }
}

// The most events one search brings back. More than this and the page
// says so, rather than quietly leaving some out.
export const SEARCH_LIMIT = 200

// Events matching the Home page's filters, soonest first:
// { events, capped }, where `capped` means there were more than the limit.
export async function searchEvents(filters, now = new Date()) {
  const { data, error } = await supabase
    .rpc('search_events', toSearchArgs(filters, now))
    .select(EVENT_COLUMNS)
    // One extra, to tell whether there were more.
    .range(0, SEARCH_LIMIT)

  if (error) throw error
  return {
    events: data.slice(0, SEARCH_LIMIT).map(toEvent),
    capped: data.length > SEARCH_LIMIT,
  }
}

// One event by its id, or null if there's no published event with that id.
export async function fetchEvent(id) {
  // Ids are whole numbers; anything else ("/events/abc") can't match.
  if (!/^\d+$/.test(String(id))) return null

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data ? toEvent(data) : null
}

// Calls onChange when rows are added, changed or deleted, so the page can
// reload. Changes often come in bursts (the engine saves many events at
// once), so it waits until there's been a quiet `waitMs` and calls
// onChange once. Pass `id` to watch just one event. Returns a function
// that stops listening.
export function watchEvents(onChange, { waitMs = 2000, id } = {}) {
  let timer

  const channel = supabase
    // Each watcher needs its own channel name.
    .channel(id ? `event-${id}` : 'events-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        ...(id && { filter: `id=eq.${id}` }),
      },
      () => {
        clearTimeout(timer)
        timer = setTimeout(onChange, waitMs)
      },
    )
    .subscribe()

  return () => {
    clearTimeout(timer)
    supabase.removeChannel(channel)
  }
}
