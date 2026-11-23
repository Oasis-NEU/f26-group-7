import { lazy, Suspense } from 'react'

// The map library is large (about 1 MB), so it's downloaded separately,
// only when a page shows a map, instead of slowing down every page.
const EventMap = lazy(() => import('./EventMap'))

// Takes the same props as EventMap. Shows a plain box while it downloads.
export default function LazyEventMap(props) {
  return (
    <Suspense
      fallback={
        <div
          className={`grid place-items-center border-2 border-ink bg-map-land text-coal ${props.className ?? ''}`}
        >
          <p className="text-sm font-bold">Loading the map…</p>
        </div>
      }
    >
      <EventMap {...props} />
    </Suspense>
  )
}
