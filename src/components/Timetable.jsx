import { dayLabel, groupByDay, isSameDay, shortDate } from '../lib/dates'
import EventRow from './EventRow'

// Gray bars in the shape of the timetable, shown while events load.
function Placeholders() {
  return (
    <ul aria-label="Loading events">
      {[1, 2, 3].map((n) => (
        <li
          key={n}
          className="grid gap-2 border-t border-rule-light py-5 pl-10 first:border-t-0"
        >
          <span className="h-6 w-2/3 bg-rule-light" />
          <span className="h-4 w-1/3 bg-rule-light" />
        </li>
      ))}
    </ul>
  )
}

// The week as a timetable. The Day column is drawn as a subway line:
// a thick bar with a station dot for each day.
export default function Timetable({ events, status, niche }) {
  if (status === 'loading') return <Placeholders />

  if (status === 'error') {
    return (
      <p className="py-4 text-lg">
        Something went wrong loading events. Try refreshing the page.
      </p>
    )
  }

  if (events.length === 0) {
    return (
      <p className="py-4 text-lg">
        {niche === 'All'
          ? 'No events this week yet. They show up here as soon as the engine finds them.'
          : 'Nothing in this niche this week. Try All.'}
      </p>
    )
  }

  const days = groupByDay(events)

  return (
    <div>
      <div className="hidden pb-3 pl-10 text-sm font-bold md:grid md:grid-cols-[9.5rem_1fr]">
        <span>Day</span>
        <div className="grid grid-cols-[5.5rem_1fr_11rem] gap-4">
          <span>Time</span>
          <span>Event</span>
          <span>Nearest T</span>
        </div>
      </div>

      <ol>
        {days.map((day) => {
          const isToday = isSameDay(day.date, new Date())
          return (
            <li
              key={day.date.toDateString()}
              className="relative border-t-2 border-ink pl-10 md:grid md:grid-cols-[9.5rem_1fr]"
            >
              {/* The subway line and this day's station. The dot is the
                  one round shape on the page, on purpose. */}
              <span
                className="absolute top-0 bottom-0 left-[9px] w-1.5 bg-ink"
                aria-hidden="true"
              />
              <span
                className={`absolute top-4 left-0 size-6 rounded-full border-[5px] border-ink ${
                  isToday ? 'bg-ink' : 'bg-paper'
                }`}
                aria-hidden="true"
              />

              <div className="pt-4 md:pb-4">
                <h3 className="text-title font-extrabold">
                  {dayLabel(day.date)}
                </h3>
                <p className="text-[15px]">{shortDate(day.date)}</p>
              </div>

              <ul>
                {day.events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
