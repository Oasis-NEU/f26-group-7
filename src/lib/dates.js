// Small helpers for showing dates and times the way Espial writes them.

// A date `days` from today at a set time, on this computer's clock.
// daysFromNow(0, 0) is midnight at the start of today.
export function daysFromNow(days, hour, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date
}

export function isSameDay(a, b) {
  return a.toDateString() === b.toDateString()
}

// "Today", "Tomorrow", or the weekday: "Friday"
export function dayLabel(date) {
  const today = new Date()
  const tomorrow = daysFromNow(1, 0)
  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, tomorrow)) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

// "Oct 7"
export function shortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// "Sat, Oct 10"
export function longDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// "8 PM" or "7:30 PM"
export function formatTime(date) {
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return time.replace(':00', '')
}

// "Sat, Nov 14, 5–7 PM", "Sat, Nov 14, 11 PM–1 AM", or just
// "Sat, Nov 14, 7 PM" when the end isn't known.
export function timeRange(start, end) {
  const day = longDate(start)
  const from = formatTime(start)
  if (!end) return `${day}, ${from}`

  const to = formatTime(end)
  // Say PM once when both times share it: "5–7 PM", not "5 PM–7 PM".
  const samePeriod = from.slice(-2) === to.slice(-2) && isSameDay(start, end)
  return `${day}, ${samePeriod ? from.slice(0, -3) : from}–${to}`
}

// Turns a list of events into one group per day:
// [{ date, events: [...] }, ...]
export function groupByDay(events) {
  const groups = []
  for (const event of events) {
    const last = groups[groups.length - 1]
    if (last && isSameDay(last.date, event.start)) {
      last.events.push(event)
    } else {
      groups.push({ date: event.start, events: [event] })
    }
  }
  return groups
}
