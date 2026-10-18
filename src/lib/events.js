import { daysFromNow } from './dates'
import { supabase } from './supabase'

// The database uses snake_case names (start_at); our components use
// camelCase (start). This turns one row into the shape the page expects.
function toEvent(row) {
  return {
    id: row.id,
    title: row.title,
    niche: row.niche,
    neighborhood: row.neighborhood,
    venue: row.venue,
    stop: row.stop,
    line: row.line,
    walkMinutes: row.walk_minutes,
    going: row.going,
    start: new Date(row.start_at),
    change: row.change_type
      ? {
          type: row.change_type,
          newStart: row.change_new_start
            ? new Date(row.change_new_start)
            : null,
          newVenue: row.change_new_venue,
        }
      : null,
  }
}

// Events from the start of today through the next 7 days, soonest first.
export async function fetchWeek() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('start_at', daysFromNow(0, 0).toISOString())
    .lt('start_at', daysFromNow(7, 0).toISOString())
    .order('start_at')

  if (error) throw error
  return data.map(toEvent)
}

// Calls onChange whenever a row is added, changed or deleted, so the page
// can reload. Returns a function that stops listening.
export function watchEvents(onChange) {
  const channel = supabase
    .channel('events-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      onChange,
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
