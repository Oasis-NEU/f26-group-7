import { useEffect, useState } from 'react'
import MapPanel from '../components/MapPanel'
import NicheTabs from '../components/NicheTabs'
import Timetable from '../components/TimeTable'
import TonightPanel from '../components/TonightPanel'
import { fetchWeek, watchEvents } from '../lib/events'

// A placeholder name until logins (Hack Session 7).
const userName = 'Jordan'

// The line under the headline: loading, an error, or how many events.
function countText(status, count) {
  if (status === 'loading') return 'Loading this week…'
  if (status === 'error') return 'Events didn’t load.'
  const things = count === 1 ? 'thing' : 'things'
  return `${count} small ${things} happening around Fenway and downtown this week.`
}

export default function Home() {
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('loading')
  const [niche, setNiche] = useState('All')

  useEffect(() => {
    function load() {
      fetchWeek()
        .then((rows) => {
          setEvents(rows)
          setStatus('ready')
        })
        .catch((error) => {
          console.error(error)
          setStatus('error')
        })
    }

    load()
    // Reload whenever the engine adds, changes or removes an event.
    return watchEvents(load)
  }, [])

  const shown =
    niche === 'All' ? events : events.filter((event) => event.niche === niche)
  const next = shown.find((event) => event.change?.type !== 'cancelled')

  return (
    <main className="mx-auto max-w-content px-4 pb-20 md:px-10">
      <section className="grid gap-8 py-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-12 md:py-12">
        <h1 className="text-display font-extrabold text-balance">
          Welcome back, {userName}
        </h1>
        <div className="min-w-0 md:pt-3">
          <p className="mb-5 text-lg">{countText(status, shown.length)}</p>
          <NicheTabs selected={niche} onSelect={setNiche} />
        </div>
      </section>

      <div className="grid gap-12 border-t-[6px] border-ink pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Timetable events={shown} status={status} niche={niche} />
        <aside className="max-w-120">
          <MapPanel />
          <TonightPanel event={next} />
        </aside>
      </div>
    </main>
  )
}