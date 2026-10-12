import { useEffect, useState } from 'react'
import { fetchWeek } from '../lib/events'

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
  }, [])

  return (
    <main className="mx-auto max-w-content px-4 pb-20 md:px-10">
      <section className="grid gap-8 py-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-12 md:py-12">
        <h1 className="text-display font-extrabold text-balance">
          Welcome back, {userName}
        </h1>
        <div className="min-w-0 md:pt-3">
          <p className="mb-5 text-lg">{countText(status, events.length)}</p>
        </div>
      </section>
    </main>
  )
}