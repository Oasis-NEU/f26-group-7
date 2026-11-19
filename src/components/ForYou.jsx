import { Link } from 'react-router'
import { timeRange } from '../lib/dates'
import { actualEnd, actualStart } from '../lib/schedule'
import AlertChip from './AlertChip'
import LineBadge from './LineBadge'

// "For you" on Home: a row of events in your niches. `picks` comes from
// pickForYou(): [{ event, walkMinutes }]. Nothing shows without picks.
export default function ForYou({ picks, homeStop }) {
  if (picks.length === 0) return null

  return (
    <section aria-labelledby="for-you" className="pb-10">
      <h2 id="for-you" className="text-title font-bold">
        For you
      </h2>
      <p className="mt-1 text-[15px]">
        {homeStop
          ? `In your niches, closest to ${homeStop} first.`
          : 'In your niches, soonest first.'}
      </p>

      <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {picks.map(({ event, walkMinutes }) => (
          <li
            key={event.id}
            className="grid content-start justify-items-start gap-1 border-t-2 border-ink pt-3"
          >
            <p className="text-sm font-bold">{event.niche}</p>
            <Link
              to={`/events/${event.id}`}
              className="text-lg leading-snug font-bold hover:underline"
            >
              {event.title}
            </Link>
            <p className="text-[15px]">
              {timeRange(actualStart(event), actualEnd(event))}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-[15px]">
              <LineBadge line={event.line} />
              {event.stop}
            </p>
            {walkMinutes !== null && (
              <p className="text-[15px]">
                {walkMinutes}-min walk from {homeStop}
              </p>
            )}
            {event.change && <AlertChip change={event.change} />}
          </li>
        ))}
      </ul>
    </section>
  )
}
