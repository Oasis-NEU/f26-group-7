import { destination } from './directions'
import { actualEnd, actualStart } from './schedule'

// Adding events to a calendar, using the actual time and place after any
// changed plans.

const TWO_HOURS = 2 * 60 * 60 * 1000

// Without an end time, assume two hours.
function endOf(event) {
  return actualEnd(event) ?? new Date(actualStart(event).getTime() + TWO_HOURS)
}

// 2026-11-14T22:00:00.000Z -> 20261114T220000Z, the format calendars use.
function utcStamp(date) {
  return date
    .toISOString()
    .replace(/\.\d{3}/, '')
    .replace(/[-:]/g, '')
}

function details(event, pageUrl) {
  return [event.description, pageUrl].filter(Boolean).join('\n\n')
}

// Calendar files mark the end of a value with , ; or a new line, so those
// characters inside the text need a \ in front.
function escapeText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

// Calendar files keep lines to 75 characters; longer ones continue on
// the next line, which starts with a space.
function fold(line) {
  const parts = []
  let rest = line
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75))
    rest = ` ${rest.slice(75)}`
  }
  parts.push(rest)
  return parts.join('\r\n')
}

// An .ics file, which Apple Calendar, Outlook and most other calendar apps
// open. `now` is when the file was made.
export function icsFile(event, pageUrl, now = new Date()) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Espial//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:event-${event.id}@espial`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(actualStart(event))}`,
    `DTEND:${utcStamp(endOf(event))}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(destination(event))}`,
    `DESCRIPTION:${escapeText(details(event, pageUrl))}`,
    `URL:${pageUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(fold).join('\r\n')}\r\n`
}

// A link that opens Google Calendar with the event filled in.
export function googleCalendarUrl(event, pageUrl) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${utcStamp(actualStart(event))}/${utcStamp(endOf(event))}`,
    details: details(event, pageUrl),
    location: destination(event),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

// "Knit and sip!" -> "knit-and-sip"
export function fileName(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'event'}.ics`
}

// Makes the browser download the .ics file.
export function downloadIcs(event, pageUrl) {
  const file = new Blob([icsFile(event, pageUrl)], {
    type: 'text/calendar;charset=utf-8',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = fileName(event.title)
  link.click()
  // Give the download a moment to start before freeing the file.
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
