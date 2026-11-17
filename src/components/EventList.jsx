import { Link } from 'react-router'
import { timeRange } from '../lib/dates'
import { actualEnd, actualStart } from '../lib/schedule'
import AlertChip from './AlertChip'
import LineBadge from './LineBadge'

// A short list of events: title, when, nearest stop, and any changed
// plans. For profiles and other small lists; Home uses the timetable.
export default function EventList({ events }) {
  return (
    <ul>
      {events.map((event) => (
        <li
          key={event.id}
          className="grid justify-items-start gap-1 border-t border-rule-light py-4 first:border-t-0"
        >
          <Link
            to={`/events/${event.id}`}
            className="text-title font-bold hover:underline"
          >
            {event.title}
          </Link>
          <p className="text-[15px]">
            {timeRange(actualStart(event), actualEnd(event))}
          </p>
          <p className="flex items-center gap-2 text-[15px]">
            <LineBadge line={event.line} />
            {event.stop}
          </p>
          {event.change && <AlertChip change={event.change} />}
        </li>
      ))}
    </ul>
  )
}
