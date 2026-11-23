import { describe, expect, it } from 'vitest'
import { distanceMeters } from './geo'
import {
  AREA_BOUNDS,
  boundsFor,
  circle,
  eventsToGeoJSON,
  resultsKey,
  stopsToGeoJSON,
  walkAreaToGeoJSON,
} from './mapData'
import { STOPS, findStop } from './stops'

function event(id, { location = { lat: 42.35, lng: -71.06 }, ...rest } = {}) {
  return { id, title: `Event ${id}`, location, change: null, ...rest }
}

const ids = (geojson) => geojson.features.map((f) => f.properties.id)

describe('eventsToGeoJSON', () => {
  it('makes one point per event, longitude first', () => {
    const geojson = eventsToGeoJSON([
      event(1, { location: { lat: 42.34, lng: -71.09 } }),
    ])
    expect(geojson.features).toEqual([
      {
        type: 'Feature',
        properties: {
          id: 1,
          title: 'Event 1',
          selected: false,
          hovered: false,
          cancelled: false,
        },
        geometry: { type: 'Point', coordinates: [-71.09, 42.34] },
      },
    ])
  })

  it('leaves out events with no location', () => {
    expect(
      ids(eventsToGeoJSON([event(1), event(2, { location: null })])),
    ).toEqual([1])
  })

  it('marks cancelled events', () => {
    const geojson = eventsToGeoJSON([
      event(1, { change: { type: 'cancelled' } }),
      event(2, { change: { type: 'delayed' } }),
    ])
    expect(geojson.features.map((f) => f.properties.cancelled)).toEqual([
      true,
      false,
    ])
  })

  it('marks the selected and hovered pins and draws them last', () => {
    const geojson = eventsToGeoJSON([event(1), event(2), event(3)], {
      selectedId: 1,
      hoveredId: 2,
    })
    expect(ids(geojson)).toEqual([3, 2, 1])
    expect(geojson.features[2].properties.selected).toBe(true)
    expect(geojson.features[1].properties.hovered).toBe(true)
  })
})

describe('stopsToGeoJSON', () => {
  it('has every stop with its name and line', () => {
    const geojson = stopsToGeoJSON()
    expect(geojson.features).toHaveLength(STOPS.length)
    expect(geojson.features[0].properties).toEqual({
      name: STOPS[0].name,
      line: STOPS[0].line,
    })
  })
})

describe('circle', () => {
  const symphony = findStop('Symphony')

  it('puts every corner the same distance from the center', () => {
    const ring = circle(symphony, 800).coordinates[0]
    for (const [lng, lat] of ring) {
      expect(distanceMeters(symphony, { lat, lng })).toBeCloseTo(800, -1)
    }
  })

  it('closes the shape', () => {
    const ring = circle(symphony, 400).coordinates[0]
    expect(ring).toHaveLength(65)
    expect(ring[64]).toEqual(ring[0])
  })
})

describe('walkAreaToGeoJSON', () => {
  it('is empty without a walk filter', () => {
    expect(walkAreaToGeoJSON(null).features).toEqual([])
  })

  it('is one circle around the stop', () => {
    const stop = findStop('Kenmore')
    const geojson = walkAreaToGeoJSON({ stop, meters: 400 })
    expect(geojson.features).toHaveLength(1)
    expect(geojson.features[0].geometry.type).toBe('Polygon')
    expect(geojson.features[0].properties.stop).toBe('Kenmore')
  })
})

describe('boundsFor', () => {
  it('is the whole area when there are no pins', () => {
    expect(boundsFor([])).toBe(AREA_BOUNDS)
    expect(boundsFor([event(1, { location: null })])).toBe(AREA_BOUNDS)
  })

  it('fits every pin', () => {
    const bounds = boundsFor([
      event(1, { location: { lat: 42.34, lng: -71.1 } }),
      event(2, { location: { lat: 42.36, lng: -71.05 } }),
      event(3, { location: null }),
    ])
    expect(bounds).toEqual([
      [-71.1, 42.34],
      [-71.05, 42.36],
    ])
  })

  it('fits the whole walk circle too', () => {
    const stop = findStop('Symphony')
    const [[west, south], [east, north]] = boundsFor([], { stop, meters: 800 })
    expect(distanceMeters(stop, { lat: north, lng: stop.lng })).toBeCloseTo(
      800,
      -1,
    )
    expect(distanceMeters(stop, { lat: south, lng: stop.lng })).toBeCloseTo(
      800,
      -1,
    )
    expect(distanceMeters(stop, { lat: stop.lat, lng: east })).toBeCloseTo(
      800,
      -1,
    )
    expect(distanceMeters(stop, { lat: stop.lat, lng: west })).toBeCloseTo(
      800,
      -1,
    )
  })

  it('leaves room around a single pin', () => {
    const [[west, south], [east, north]] = boundsFor([event(1)])
    expect(west).toBeLessThan(-71.06)
    expect(east).toBeGreaterThan(-71.06)
    expect(south).toBeLessThan(42.35)
    expect(north).toBeGreaterThan(42.35)
  })
})

describe('resultsKey', () => {
  it('only changes when the events do', () => {
    expect(resultsKey([event(1), event(2)])).toBe(
      resultsKey([event(1), event(2)]),
    )
    expect(resultsKey([event(1)])).not.toBe(resultsKey([event(1), event(2)]))
  })
})
