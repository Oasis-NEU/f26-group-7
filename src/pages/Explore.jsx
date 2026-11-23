import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import EventList from '../components/EventList'
import FilterBar from '../components/FilterBar'
import LazyEventMap from '../components/LazyEventMap'
import { Button } from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SEARCH_LIMIT } from '../lib/events'
import {
  DEFAULT_FILTERS,
  hasFilters,
  readFilters,
  walkArea,
  whenText,
  writeFilters,
} from '../lib/filters'
import { useAuth } from '../lib/useAuth'
import { useEventSearch } from '../lib/useEventSearch'

// "14 events this week." or "3 results for “jazz” this weekend.", plus a
// note when some events have no exact spot to pin.
function countText(search, filters) {
  if (search.isPending) return 'Loading events…'
  if (search.isError) return 'Events didn’t load.'

  const { events, capped } = search.data
  const count = capped ? `${SEARCH_LIMIT}+` : events.length
  const one = events.length === 1
  const words = filters.q.trim()
  const what = words
    ? `${one ? 'result' : 'results'} for “${words}”`
    : one
      ? 'event'
      : 'events'
  const text = `${count} ${what} ${whenText(filters)}.`

  const unpinned = events.filter((event) => !event.location).length
  if (!unpinned) return text
  return `${text} ${unpinned} without an exact spot ${unpinned === 1 ? 'is' : 'are'} only in the list.`
}

// Scroll something into view, if it isn't already. (Not every browser
// used in tests can scroll.)
function reveal(element) {
  element?.scrollIntoView?.({ block: 'nearest' })
}

// The full map: the same filters as Home, with a map and a list that stay
// in step. Picking a pin marks its row; "Show on map" marks its pin.
export default function Explore() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const search = useEventSearch(filters)
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const mapRef = useRef(null)
  const listRef = useRef(null)

  function changeFilters(changes, { replace = false } = {}) {
    setParams(writeFilters({ ...filters, ...changes }), { replace })
  }

  // From the map: mark the event's row and bring it into view.
  function selectFromMap(id) {
    setSelectedId(id)
    if (id !== null) {
      reveal(listRef.current?.querySelector(`[data-event-id="${id}"]`))
    }
  }

  // From the list: mark the pin, and on phones, where the map is above
  // the list, scroll up to it.
  function selectFromList(id) {
    setSelectedId(id)
    reveal(mapRef.current)
  }

  const events = search.data?.events ?? []
  const filtered = hasFilters(filters)

  let list
  if (search.isPending) {
    list = null
  } else if (search.isError) {
    list = (
      <p className="py-4 text-lg">
        Something went wrong loading events. Try refreshing the page.
      </p>
    )
  } else if (events.length === 0) {
    list = filtered ? (
      <EmptyState
        title="Nothing matches these filters"
        message="Try a longer date range, more niches or a farther walk."
      >
        <Button onClick={() => changeFilters(DEFAULT_FILTERS)}>
          Clear filters
        </Button>
      </EmptyState>
    ) : (
      <p className="py-4 text-lg">No events this week yet.</p>
    )
  } else {
    list = (
      <EventList
        events={events}
        selectedId={selectedId}
        onSelect={selectFromList}
        onHover={setHoveredId}
      />
    )
  }

  return (
    <main className="mx-auto max-w-content px-4 pb-20 md:px-10">
      <section className="grid gap-6 py-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-12 md:py-12">
        <h1 className="text-display font-extrabold text-balance">Explore</h1>
        <p className="text-lg md:pt-3" role="status">
          {countText(search, filters)}
        </p>
      </section>

      <section aria-label="Filters" className="pb-8">
        <FilterBar
          filters={filters}
          onChange={changeFilters}
          homeStop={profile?.homeStop}
        />
      </section>

      <div className="grid gap-8 border-t-[6px] border-ink pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        {/* On wide screens the map stays put while the list scrolls. */}
        <div
          ref={mapRef}
          className="scroll-mt-4 lg:sticky lg:top-4 lg:self-start"
        >
          <LazyEventMap
            events={events}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={selectFromMap}
            walkArea={walkArea(filters)}
            className="h-[60vh] min-h-80 lg:h-[calc(100vh-2rem)]"
          />
        </div>

        <section
          ref={listRef}
          aria-label="Events"
          className={search.isPlaceholderData ? 'opacity-60' : ''}
          aria-busy={search.isFetching}
        >
          {list}
          {search.data?.capped && (
            <p className="mt-6 font-bold">
              Showing the first {SEARCH_LIMIT}. Narrow the filters to see the
              rest.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
