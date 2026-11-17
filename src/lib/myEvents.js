import { EVENT_COLUMNS, toEvent } from './events'
import { actualStart, isOver } from './schedule'
import { supabase } from './supabase'

// Your RSVPs ("going" or "interested") and saved events.

// Your RSVP for one event: 'going', 'interested' or null.
export async function fetchMyRsvp(userId, eventId) {
  const { data, error } = await supabase
    .from('rsvps')
    .select('status')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) throw error
  return data?.status ?? null
}

// Changes your RSVP from `current` to `status` (either can be null).
// A new RSVP is added, a change of status is an update (the only change
// the database allows), and null removes it.
export async function setMyRsvp(userId, eventId, status, current) {
  const mine = (query) => query.eq('user_id', userId).eq('event_id', eventId)

  let result
  if (status === null) {
    result = await mine(supabase.from('rsvps').delete())
  } else if (current === null) {
    result = await supabase
      .from('rsvps')
      .insert({ user_id: userId, event_id: eventId, status })
    // Already there (say, from another tab): change it instead.
    if (result.error?.code === '23505') {
      result = await mine(supabase.from('rsvps').update({ status }))
    }
  } else {
    result = await mine(supabase.from('rsvps').update({ status }))
  }

  if (result.error) throw result.error
}

export async function fetchIsSaved(userId, eventId) {
  const { data, error } = await supabase
    .from('saves')
    .select('event_id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

export async function setSaved(userId, eventId, saved) {
  if (saved) {
    const { error } = await supabase
      .from('saves')
      .insert({ user_id: userId, event_id: eventId })
    // Already saved is fine.
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase
      .from('saves')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId)
    if (error) throw error
  }
}

// Events that haven't finished yet, soonest first. Events that aren't
// published any more come back empty, so they're left out too.
export function upcoming(events, now = new Date()) {
  return events
    .filter((event) => event && !isOver(event, now))
    .sort((a, b) => actualStart(a) - actualStart(b))
}

// Your upcoming events: { going: [...], interested: [...], saved: [...] }
export async function fetchMyUpcoming(userId) {
  const [rsvps, saves] = await Promise.all([
    supabase
      .from('rsvps')
      .select(`status, event:events(${EVENT_COLUMNS})`)
      .eq('user_id', userId),
    supabase
      .from('saves')
      .select(`event:events(${EVENT_COLUMNS})`)
      .eq('user_id', userId),
  ])
  if (rsvps.error) throw rsvps.error
  if (saves.error) throw saves.error

  const withStatus = (status) =>
    upcoming(
      rsvps.data
        .filter((row) => row.status === status && row.event)
        .map((row) => toEvent(row.event)),
    )

  return {
    going: withStatus('going'),
    interested: withStatus('interested'),
    saved: upcoming(
      saves.data.filter((row) => row.event).map((row) => toEvent(row.event)),
    ),
  }
}
