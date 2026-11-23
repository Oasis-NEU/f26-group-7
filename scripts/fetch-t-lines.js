// Downloads the shapes of the subway lines from the MBTA's official API
// (https://api-v3.mbta.com, no key needed) and saves them as GeoJSON in
// src/data/t-lines.json, which the map draws. The site reads the saved
// file and never calls the MBTA itself.
//
// Run it again only if the MBTA changes a route:
//   npm run fetch-lines

import { mkdir, writeFile } from 'node:fs/promises'

const API = 'https://api-v3.mbta.com'
const OUT = new URL('../src/data/t-lines.json', import.meta.url)

// MBTA route id -> the line names Espial uses (src/lib/lines.js).
const ROUTES = {
  Red: 'RL',
  Orange: 'OL',
  Blue: 'BL',
  'Green-B': 'GL B',
  'Green-C': 'GL C',
  'Green-D': 'GL D',
  'Green-E': 'GL E',
}

// The MBTA sends shapes as Google "encoded polylines"; this turns one
// back into [lng, lat] pairs, rounded to about a meter.
// https://developers.google.com/maps/documentation/utilities/polylinealgorithm
function decodePolyline(text) {
  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  function next() {
    let result = 0
    let shift = 0
    let byte
    do {
      byte = text.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }

  while (index < text.length) {
    lat += next()
    lng += next()
    points.push([lng / 1e5, lat / 1e5])
  }
  return points
}

async function get(path) {
  const response = await fetch(`${API}${path}`)
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function main() {
  const routes = await get(
    `/routes?filter[id]=${Object.keys(ROUTES).join(',')}&fields[route]=color,long_name`,
  )

  // Each route's usual pattern ("canonical"), one direction only, since
  // both directions run on the same tracks. The Red Line has two: one
  // to Ashmont and one to Braintree.
  const patterns = await get(
    `/route_patterns?filter[route]=${Object.keys(ROUTES).join(',')}` +
      '&filter[canonical]=true&filter[direction_id]=0' +
      '&include=representative_trip.shape' +
      '&fields[route_pattern]=name&fields[trip]=shape&fields[shape]=polyline',
  )

  const included = new Map(
    patterns.included.map((item) => [`${item.type}:${item.id}`, item]),
  )

  // The MBTA also sends patterns for temporary shuttle buses that replace
  // a line during track work ("Shuttle-..."). Keep only the subway lines.
  const subway = patterns.data.filter(
    (pattern) => pattern.relationships.route.data.id in ROUTES,
  )

  const features = subway.map((pattern) => {
    const routeId = pattern.relationships.route.data.id
    const route = routes.data.find((r) => r.id === routeId)
    const trip = included.get(
      `trip:${pattern.relationships.representative_trip.data.id}`,
    )
    const shape = included.get(`shape:${trip.relationships.shape.data.id}`)

    return {
      type: 'Feature',
      properties: {
        line: ROUTES[routeId],
        name: route.attributes.long_name,
        pattern: pattern.attributes.name,
        color: `#${route.attributes.color}`,
      },
      geometry: {
        type: 'LineString',
        coordinates: decodePolyline(shape.attributes.polyline),
      },
    }
  })

  const geojson = {
    type: 'FeatureCollection',
    // The MBTA's data license asks apps to say where the data came from.
    attribution: 'Massachusetts Bay Transportation Authority (MBTA)',
    features,
  }

  await mkdir(new URL('.', OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(geojson) + '\n')
  for (const feature of features) {
    const { name, pattern } = feature.properties
    const points = feature.geometry.coordinates.length
    console.log(`${name}: ${pattern} (${points} points)`)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
