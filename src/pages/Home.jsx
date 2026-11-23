import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import FilterBar from '../components/FilterBar'
import ForYou from '../components/ForYou'
import LazyEventMap from '../components/LazyEventMap'
import Timetable from '../components/Timetable'
import TonightPanel from '../components/TonightPanel'
import { SEARCH_LIMIT } from '../lib/events'
import {
  DEFAULT_FILTERS,
  hasFilters,
  readFilters,
  walkArea,
  whenText,
  writeFilters,
} from '../lib/filters'
import { pickForYou } from '../lib/forYou'
import { firstName } from '../lib/names'
import { nextEvent } from '../lib/schedule'
import { useAuth } from '../lib/useAuth'
import { useEventSearch, useForYou } from '../lib/useEventSearch'

// "Welcome back, Jordan" when logged in. The display size is huge, so
// only the first name.
function headline(profile) {
  const name = firstName(profile?.displayName) || profile?.username
  return name ? `Welcome back, ${name}` : 'Find the small stuff'
}

// The line under the headline: loading, an error, or what's shown.
// "12 small things happening around Fenway and downtown this week."
// "3 results for “jazz” this weekend."
function countText(search, filters) {
  if (search.isPending) return 'Loading events…'
  if (search.isError) return 'Events didn’t load.'

  const { events, capped } = search.data
  const count = capped ? `${SEARCH_LIMIT}+` : events.length
  const one = events.length === 1
  const when = whenText(filters)
  const words = filters.q.trim()

  if (words) {
    return `${count} ${one ? 'result' : 'results'} for “${words}” ${when}.`
  }
  return `${count} small ${one ? 'thing' : 'things'} happening around Fenway and downtown ${when}.`
}

function timetableStatus(search) {
  if (search.isPending) return 'loading'
  if (search.isError) return 'error'
  return 'ready'
}

export default function Home() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const search = useEventSearch(filters)
  // Logged out, `profile` is null, so there are no niches and it doesn't run.
  const forYou = useForYou(profile)
  // The event whose pin was clicked on the map.
  const [selectedId, setSelectedId] = useState(null)

  // Picking from a menu adds a step the Back button can undo; typing in
  // the search box replaces the current step instead of adding one per
  // pause.
  function changeFilters(changes, { replace = false } = {}) {
    setParams(writeFilters({ ...filters, ...changes }), { replace })
  }

  const events = search.data?.events ?? []
  const now = new Date()
  const next = nextEvent(events, now)
  const filtered = hasFilters(filters)
  // The same filters on the full map.
  const query = writeFilters(filters).toString()
  const exploreLink = query ? `/explore?${query}` : '/explore'
  // Only on a plain Home page, so it doesn't compete with search results.
  const picks =
    !filtered && forYou.data
      ? pickForYou(forYou.data.events, profile?.homeStop, now)
      : []

  return (
    <main className="mx-auto max-w-content px-4 pb-20 md:px-10">
      <section className="grid gap-6 py-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-12 md:py-12">
        <h1 className="text-display font-extrabold text-balance">
          {headline(profile)}
        </h1>
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

      <ForYou picks={picks} homeStop={profile?.homeStop} />

      <div className="grid gap-12 border-t-[6px] border-ink pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* Dimmed while new results load over the old ones. */}
        <div
          className={search.isPlaceholderData ? 'opacity-60' : ''}
          aria-busy={search.isFetching}
        >
          <Timetable
            events={events}
            status={timetableStatus(search)}
            filtered={filtered}
            onClear={() => changeFilters(DEFAULT_FILTERS)}
          />
          {search.data?.capped && (
            <p className="mt-6 font-bold">
              Showing the first {SEARCH_LIMIT}. Narrow the filters to see the
              rest.
            </p>
          )}
        </div>
        <aside className="max-w-120">
          <LazyEventMap
            compact
            events={events}
            selectedId={selectedId}
            onSelect={setSelectedId}
            walkArea={walkArea(filters)}
            className="aspect-4/3"
          />
          <Link
            to={exploreLink}
            className="mt-3 inline-block font-bold underline"
          >
            Open the full map
          </Link>
          <TonightPanel event={next} now={now} />
        </aside>
      </div>
    </main>
  )
}
