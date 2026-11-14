// When and where an event is really happening, once changed plans
// (delayed, running early, cancelled, venue change) are taken into account.

// The new time if the event was delayed or moved earlier.
export function actualStart(event) {
  return event.change?.newStart ?? event.start
}

// The end time, if we know it. A delay pushes the end back by the same
// amount.
export function actualEnd(event) {
  if (!event.end) return null
  const shift = actualStart(event) - event.start
  return new Date(event.end.getTime() + shift)
}

// The new venue if the event moved.
export function actualVenue(event) {
  return event.change?.type === 'detour' ? event.change.newVenue : event.venue
}

export function isCancelled(event) {
  return event.change?.type === 'cancelled'
}

// Started and not over yet. Without an end time we can't tell, so no.
export function isHappening(event, now) {
  const end = actualEnd(event)
  return end !== null && actualStart(event) <= now && now < end
}

// The event to show next: happening now or still to come, soonest first.
// Cancelled events are skipped. An event with no end time counts as over
// once it starts.
export function nextEvent(events, now) {
  let next = null
  for (const event of events) {
    if (isCancelled(event)) continue
    const over = actualEnd(event) ?? actualStart(event)
    if (over <= now) continue
    if (!next || actualStart(event) < actualStart(next)) next = event
  }
  return next
}
