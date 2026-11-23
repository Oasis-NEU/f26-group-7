// Turns events, stops and the walk filter into GeoJSON, the format the map
// draws. GeoJSON writes points as [longitude, latitude]: east-west first,
// the opposite of how we usually say them.

import { isCancelled } from './schedule'
import { STOPS } from './stops'

// Fenway to downtown, as [[west, south], [east, north]]. The map starts
// here, and shows it when there are no pins to fit.
export const AREA_BOUNDS = [
  [-71.115, 42.333],
  [-71.05, 42.363],
]

function point({ lat, lng }) {
  return { type: 'Point', coordinates: [lng, lat] }
}

// One pin per event that has a location. `selectedId` and `hoveredId`
// mark the pins to highlight; they're listed last so they're drawn on top.
export function eventsToGeoJSON(events, { selectedId, hoveredId } = {}) {
  const features = events
    .filter((event) => event.location)
    .map((event) => ({
      type: 'Feature',
      properties: {
        id: event.id,
        title: event.title,
        selected: event.id === selectedId,
        hovered: event.id === hoveredId,
        cancelled: isCancelled(event),
      },
      geometry: point(event.location),
    }))

  const onTop = (feature) =>
    feature.properties.selected ? 2 : feature.properties.hovered ? 1 : 0
  features.sort((a, b) => onTop(a) - onTop(b))

  return { type: 'FeatureCollection', features }
}

// The T stops Espial covers.
export function stopsToGeoJSON(stops = STOPS) {
  return {
    type: 'FeatureCollection',
    features: stops.map((stop) => ({
      type: 'Feature',
      properties: { name: stop.name, line: stop.line },
      geometry: point(stop),
    })),
  }
}

const EARTH_RADIUS_M = 6371000

// A circle `meters` around `center`, as a 64-sided shape. A degree of
// longitude shrinks away from the equator, so the east-west size is
// stretched to keep it round on the ground.
export function circle(center, meters, sides = 64) {
  const degrees = (meters / EARTH_RADIUS_M) * (180 / Math.PI)
  const stretch = 1 / Math.cos((center.lat * Math.PI) / 180)

  const ring = []
  for (let i = 0; i <= sides; i++) {
    // The last corner repeats the first, which closes the shape.
    const angle = ((i % sides) / sides) * 2 * Math.PI
    ring.push([
      center.lng + degrees * stretch * Math.cos(angle),
      center.lat + degrees * Math.sin(angle),
    ])
  }
  return { type: 'Polygon', coordinates: [ring] }
}

const EMPTY = { type: 'FeatureCollection', features: [] }

// The walk filter's area (from walkArea() in filters.js) as a circle,
// or nothing when there's no walk filter.
export function walkAreaToGeoJSON(area) {
  if (!area) return EMPTY
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { stop: area.stop.name },
        geometry: circle(area.stop, area.meters),
      },
    ],
  }
}

// About 300 m around a single pin, so the map doesn't zoom all the way in.
const LONE_PIN_PADDING = 0.003

// The smallest box holding every pin, as [[west, south], [east, north]].
// With no pins, the whole area.
export function boundsFor(events) {
  const spots = events.filter((event) => event.location)
  if (spots.length === 0) return AREA_BOUNDS

  const lngs = spots.map((event) => event.location.lng)
  const lats = spots.map((event) => event.location.lat)
  let [west, east] = [Math.min(...lngs), Math.max(...lngs)]
  let [south, north] = [Math.min(...lats), Math.max(...lats)]

  if (west === east && south === north) {
    west -= LONE_PIN_PADDING
    east += LONE_PIN_PADDING
    south -= LONE_PIN_PADDING
    north += LONE_PIN_PADDING
  }
  return [
    [west, south],
    [east, north],
  ]
}

// The events' ids in order, as text. It only changes when the results do,
// not when the same results reload, so the map refits only when needed.
export function resultsKey(events) {
  return events.map((event) => event.id).join(',')
}
