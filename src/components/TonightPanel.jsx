import { Link } from 'react-router'
import { dayLabel, formatTime } from '../lib/dates'
import { directionsUrl } from '../lib/directions'
import { actualEnd, actualStart, isHappening } from '../lib/schedule'
import { ArrowUpRightIcon } from './Icons'
import LineBadge from './LineBadge'
import { ButtonLink } from './ui/Button'

// "Happening now, until 9 PM", "Tonight, 8 PM", "Tomorrow, 1 PM"...
function whenText(event, now) {
  if (isHappening(event, now)) {
    return `Happening now, until ${formatTime(actualEnd(event))}`
  }
  const start = actualStart(event)
  const day = dayLabel(start)
  const label = day === 'Today' && start.getHours() >= 17 ? 'Tonight' : day
  return `${label}, ${formatTime(start)}`
}

// The next event, with how to get there. Times and places include any
// changed plans, so directions go to the new venue after a venue change.
export default function TonightPanel({ event, now = new Date() }) {
  if (!event) return null

  return (
    <section className="mt-4 border-t-2 border-ink pt-4">
      <p className="text-sm font-bold">{whenText(event, now)}</p>
      <h2 className="mt-1 text-title font-bold">
        <Link to={`/events/${event.id}`} className="hover:underline">
          {event.title}
        </Link>
      </h2>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-[15px]">
        <LineBadge line={event.line} />
        {event.stop}, {event.walkMinutes} minute walk
      </p>
      <ButtonLink href={directionsUrl(event)} className="mt-4">
        Directions in Google Maps
        <ArrowUpRightIcon className="size-4" />
      </ButtonLink>
    </section>
  )
}
