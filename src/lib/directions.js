import { actualVenue } from './schedule'

// Where to send Google Maps. The exact address when we have one, unless
// the event moved: the address belongs to the old venue, so use the new
// venue's name instead.
export function destination(event) {
  const moved = event.change?.type === 'detour'
  if (event.address && !moved) return event.address
  return `${actualVenue(event)}, Boston, MA`
}

// Transit directions to the event in Google Maps.
export function directionsUrl(event) {
  const params = new URLSearchParams({
    api: '1',
    travelmode: 'transit',
    destination: destination(event),
  })
  return `https://www.google.com/maps/dir/?${params}`
}
