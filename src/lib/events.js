import { daysFromNow } from './dates'
import { supabase } from './supabase'

// The columns the site uses. Not '*': the table also has a large `search`
// column (words for searching) that the browser never needs.
const COLUMNS = [
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

// Events from the start of today through the next 7 days, soonest first.
export async function fetchWeek() {
  const { data, error } = await supabase
    .from('events')
    .select(COLUMNS)
    .gte('start_at', daysFromNow(0, 0).toISOString())
    .lt('start_at', daysFromNow(7, 0).toISOString())
    .order('start_at')

  if (error) throw error
  return data.map(toEvent)
}

// Calls onChange when rows are added, changed or deleted, so the page can
// reload. Changes often come in bursts (the engine saves many events at
// once), so it waits until there's been a quiet `waitMs` and calls
// onChange once. Returns a function that stops listening.
export function watchEvents(onChange, waitMs = 2000) {
  let timer

  const channel = supabase
    .channel('events-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
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
