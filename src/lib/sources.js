// The names of the sites events come from, for "View on Ticketmaster".
// Keys match events.source, which the engine sets.
const NAMES = {
  ticketmaster: 'Ticketmaster',
  seatgeek: 'SeatGeek',
  eventbrite: 'Eventbrite',
  meetup: 'Meetup',
}

// "View on Ticketmaster", or a general label for sources without a name.
export function sourceLinkText(source) {
  const name = NAMES[source]
  return name ? `View on ${name}` : 'View the original listing'
}
