import { dayLabel, formatTime } from '../lib/dates'
import { ArrowUpRightIcon } from './Icons'
import LineBadge from './LineBadge'

// The next event, with how to get there.
export default function TonightPanel({ event }) {
  if (!event) return null

  const day = dayLabel(event.start)
  const when = day === 'Today' && event.start.getHours() >= 17 ? 'Tonight' : day
  const directions = `https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=${encodeURIComponent(
    `${event.venue}, Boston, MA`,
  )}`

  return (
    <section className="mt-4 border-t-2 border-ink pt-4">
      <p className="text-sm font-bold">
        {when}, {formatTime(event.start)}
      </p>
      <h2 className="mt-1 text-title font-bold">{event.title}</h2>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px]">
        <LineBadge line={event.line} />
        {event.stop}, {event.walkMinutes} minute walk
      </p>
      <a
        href={directions}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 bg-ink px-4 py-3 text-[15px] font-bold text-on-ink"
      >
        Directions in Google Maps
        <ArrowUpRightIcon className="size-4" />
      </a>
    </section>
  )
}
