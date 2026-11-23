import 'maplibre-gl/dist/maplibre-gl.css'
import {
  AttributionControl,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import tLines from '../data/t-lines.json'
import { timeRange } from '../lib/dates'
import {
  AREA_BOUNDS,
  boundsFor,
  eventsToGeoJSON,
  resultsKey,
  stopsToGeoJSON,
  walkAreaToGeoJSON,
} from '../lib/mapData'
import { actualEnd, actualStart, actualVenue } from '../lib/schedule'
import AlertChip from './AlertChip'
import LineBadge from './LineBadge'

// The streets underneath: OpenFreeMap's light "Positron" style, built from
// OpenStreetMap. Free, with no account or key. It adds its own credits to
// the corner of the map.
const STREETS_STYLE = 'https://tiles.openfreemap.org/styles/positron'

// MapLibre does its heavy lifting (cutting the map into tiles) in a
// background "worker" file, which it looks for next to its own code. Vite
// moves its code when it bundles the site, so tell MapLibre where Vite put
// the worker. (`?url` makes Vite copy the file and give us its address.)
setWorkerUrl(workerUrl)

const EMPTY = { type: 'FeatureCollection', features: [] }

// The site's color tokens (src/index.css), so the map uses the same colors
// as everything else. Tailwind only puts a token in the page's CSS when a
// class uses it (bg-red-line, text-coal...), so keep each of these in use
// somewhere, or the map gets no color for it.
function colors() {
  const css = getComputedStyle(document.documentElement)
  const token = (name) => css.getPropertyValue(`--color-${name}`).trim()
  return {
    paper: token('paper'),
    ink: token('ink'),
    coal: token('coal'),
    alert: token('alert'),
    land: token('map-land'),
    green: token('green-line'),
    red: token('red-line'),
    orange: token('orange-line'),
    blue: token('blue-line'),
  }
}

// MapLibre draws with WebGL, the browser's way of using the graphics chip.
// It's on in nearly every browser, but can be turned off.
function canDrawMaps() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

// Everything drawn on top of the streets, bottom to top.
function addLayers(map) {
  const c = colors()
  const selectedOrHovered = ['any', ['get', 'selected'], ['get', 'hovered']]

  map.addSource('t-lines', {
    type: 'geojson',
    data: tLines,
    // The MBTA's data license asks apps to credit it.
    attribution: '<a href="https://www.mbta.com/developers">MBTA</a>',
  })
  map.addSource('walk', { type: 'geojson', data: EMPTY })
  map.addSource('stops', { type: 'geojson', data: stopsToGeoJSON() })
  map.addSource('events', { type: 'geojson', data: EMPTY })

  // The T lines, in their own colors, thicker as you zoom in.
  map.addLayer({
    id: 't-lines',
    type: 'line',
    source: 't-lines',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': [
        'match',
        ['get', 'line'],
        'RL',
        c.red,
        'OL',
        c.orange,
        'BL',
        c.blue,
        c.green,
      ],
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 16, 6],
    },
  })

  // The walk filter's circle: a light wash with a dashed edge.
  map.addLayer({
    id: 'walk-fill',
    type: 'fill',
    source: 'walk',
    paint: { 'fill-color': c.paper, 'fill-opacity': 0.1 },
  })
  map.addLayer({
    id: 'walk-edge',
    type: 'line',
    source: 'walk',
    paint: {
      'line-color': c.paper,
      'line-width': 2,
      'line-dasharray': [2, 2],
    },
  })

  // The stops Espial covers, with names once you zoom in.
  map.addLayer({
    id: 'stops',
    type: 'circle',
    source: 'stops',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 6],
      'circle-color': c.land,
      'circle-stroke-color': c.coal,
      'circle-stroke-width': 2,
    },
  })
  map.addLayer({
    id: 'stop-names',
    type: 'symbol',
    source: 'stops',
    minzoom: 14,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 0.8],
    },
    paint: {
      'text-color': c.coal,
      'text-halo-color': c.land,
      'text-halo-width': 1.5,
    },
  })

  // The events: purple pins with a cream ring. Bigger with a dark ring
  // when hovered in the list, and yellow when selected. Cancelled events
  // are hollow.
  map.addLayer({
    id: 'events',
    type: 'circle',
    source: 'events',
    paint: {
      'circle-radius': ['case', selectedOrHovered, 10, 7],
      'circle-color': [
        'case',
        ['get', 'selected'],
        c.alert,
        ['get', 'cancelled'],
        c.land,
        c.paper,
      ],
      'circle-stroke-color': [
        'case',
        selectedOrHovered,
        c.coal,
        ['get', 'cancelled'],
        c.paper,
        c.ink,
      ],
      'circle-stroke-width': 2.5,
    },
  })
}

// The selected event, in a card over the map. On a compact map, only the
// time and title, so the card doesn't cover the pin.
function SelectedCard({ event, compact, onClose }) {
  return (
    <section
      aria-label="Selected event"
      className={`absolute top-3 right-14 left-3 max-w-80 border-2 border-ink bg-paper text-ink ${compact ? 'px-3 py-2' : 'p-4'}`}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-1 right-2 px-1 text-xl leading-none font-bold"
      >
        ×
      </button>
      <p className="pr-6 text-sm font-bold">
        {timeRange(actualStart(event), actualEnd(event))}
      </p>
      <h3
        className={`font-bold ${compact ? 'text-[15px]' : 'mt-1 text-title'}`}
      >
        <Link to={`/events/${event.id}`} className="hover:underline">
          {event.title}
        </Link>
      </h3>
      {!compact && (
        <>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px]">
            <LineBadge line={event.line} />
            {actualVenue(event)}, {event.walkMinutes} min from {event.stop}
          </p>
          {event.change && <AlertChip change={event.change} />}
          <Link
            to={`/events/${event.id}`}
            className="mt-3 inline-block font-bold underline"
          >
            See event
          </Link>
        </>
      )}
    </section>
  )
}

// A map of events with the T lines and stops.
//
//   events      the events to pin (ones without a location are skipped)
//   selectedId  the event shown in the card and as a yellow pin
//   hoveredId   an event to highlight, such as the list row under the mouse
//   onSelect    called with an event id when a pin is clicked, or null
//               when the empty map is clicked or the card is closed
//   walkArea    the walk filter's area (walkArea() in filters.js), drawn
//               as a circle
//   compact     a small map inside a page: scrolling over it scrolls the
//               page, and zooming needs Ctrl/⌘ or two fingers
//   className   its size, such as "aspect-4/3" or "h-[60vh]"
export default function EventMap({
  events,
  selectedId = null,
  hoveredId = null,
  onSelect,
  walkArea = null,
  compact = false,
  className = '',
}) {
  const containerRef = useRef(null)
  const [supported] = useState(canDrawMaps)
  // The map, once it has loaded and its layers are in.
  const [map, setMap] = useState(null)

  // The newest onSelect, for the click handler that's only added once.
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  // Make the map once, and remove it when the page goes away.
  useEffect(() => {
    if (!supported) return

    let created
    try {
      created = new MapLibreMap({
        container: containerRef.current,
        style: STREETS_STYLE,
        bounds: AREA_BOUNDS,
        attributionControl: false,
        cooperativeGestures: compact,
        // A flat map: no tilting or turning.
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      })
    } catch (error) {
      console.error('The map could not start:', error)
      return
    }

    created.addControl(new AttributionControl({ compact: true }))
    created.addControl(
      new NavigationControl({ showCompass: false }),
      'top-right',
    )
    created.touchZoomRotate.disableRotation()

    created.on('load', () => {
      addLayers(created)

      // A click on a pin selects it; a click anywhere else clears it.
      created.on('click', (click) => {
        const [pin] = created.queryRenderedFeatures(click.point, {
          layers: ['events'],
        })
        onSelectRef.current?.(pin ? pin.properties.id : null)
      })
      created.on('mouseenter', 'events', () => {
        created.getCanvas().style.cursor = 'pointer'
      })
      created.on('mouseleave', 'events', () => {
        created.getCanvas().style.cursor = ''
      })

      setMap(created)
    })

    return () => created.remove()
  }, [supported, compact])

  // Redraw the pins when the events or the highlighted ones change.
  useEffect(() => {
    map
      ?.getSource('events')
      .setData(eventsToGeoJSON(events, { selectedId, hoveredId }))
  }, [map, events, selectedId, hoveredId])

  // Redraw the walk circle.
  useEffect(() => {
    map?.getSource('walk').setData(walkAreaToGeoJSON(walkArea))
  }, [map, walkArea])

  // Fit the map to the pins when the results change. Not when the same
  // results reload in the background, which would undo the visitor's own
  // zooming. MapLibre skips the animation for visitors who ask their
  // computer for less motion.
  const results = resultsKey(events)
  useEffect(() => {
    // Extra room on the right for the zoom buttons and at the bottom for
    // the credits, so no pin hides under them.
    const room = compact ? 32 : 64
    map?.fitBounds(boundsFor(events), {
      padding: { top: room, left: room, right: room + 40, bottom: room + 40 },
      maxZoom: 15,
    })
    // `events` changes on every reload; `results` only when they differ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, results, compact])

  // Bring a newly selected pin into view if it's off the edge of the map
  // (when it was picked from the list). A pin that was clicked is already
  // in view, so the map stays still.
  const selected = events.find((event) => event.id === selectedId) ?? null
  const selectedSpot = selected?.location
  useEffect(() => {
    if (!map || !selectedSpot) return
    const spot = [selectedSpot.lng, selectedSpot.lat]
    if (!map.getBounds().contains(spot)) map.easeTo({ center: spot })
  }, [map, selectedSpot])

  return (
    <div
      role="region"
      aria-label="Map of events"
      className={`relative overflow-hidden border-2 border-ink bg-map-land text-coal ${className}`}
    >
      {supported ? (
        <div ref={containerRef} className="size-full" />
      ) : (
        <p className="grid size-full place-items-center p-6 text-center text-sm font-bold">
          This browser can’t show the map. The list has every event.
        </p>
      )}
      {selected && (
        <SelectedCard
          event={selected}
          compact={compact}
          onClose={() => onSelect?.(null)}
        />
      )}
    </div>
  )
}
