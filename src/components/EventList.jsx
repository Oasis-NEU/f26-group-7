import { Link } from 'react-router'
import { timeRange } from '../lib/dates'
import { actualEnd, actualStart } from '../lib/schedule'
import AlertChip from './AlertChip'
import LineBadge from './LineBadge'
import { Button } from './ui/Button'

// A short list of events: title, when, nearest stop, and any changed
// plans. For profiles and other small lists; Home uses the timetable.
//
// Next to a map (Explore), pass:
//   selectedId  the event selected on the map, marked in the list
//   onSelect    adds a "Show on map" button to each row
//   onHover     called with an event id while its row is under the mouse
//               or has keyboard focus, and null when it leaves
export default function EventList({ events, selectedId, onSelect, onHover }) {
  return (
    <ul>
      {events.map((event) => {
        const selected = event.id === selectedId
        return (
          <li
            key={event.id}
            // So a page can find the row, to scroll to it.
            data-event-id={event.id}
            aria-current={selected || undefined}
            onMouseEnter={onHover && (() => onHover(event.id))}
            onMouseLeave={onHover && (() => onHover(null))}
            onFocus={onHover && (() => onHover(event.id))}
            onBlur={onHover && (() => onHover(null))}
            className={`grid justify-items-start gap-1 border-t border-rule-light py-4 first:border-t-0 ${
              selected ? 'border-l-[6px] border-l-alert pl-4' : ''
            }`}
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
            {onSelect &&
              (event.location ? (
                <Button
                  variant="outline"
                  className="mt-2 px-3 py-1.5 text-sm"
                  onClick={() => onSelect(event.id)}
                >
                  Show on map
                </Button>
              ) : (
                <p className="mt-1 text-sm text-muted">Not on the map</p>
              ))}
          </li>
        )
      })}
    </ul>
  )
}
