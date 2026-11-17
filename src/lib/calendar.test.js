import { describe, expect, it } from 'vitest'
import { fileName, googleCalendarUrl, icsFile } from './calendar'

const event = {
  id: 7,
  title: 'Knit and sip',
  description: 'Bring yarn, needles, etc.',
  venue: 'Longwood Ave cafe',
  address: null,
  start: new Date('2026-11-18T19:00:00-05:00'),
  end: new Date('2026-11-18T21:00:00-05:00'),
  change: null,
}

const PAGE = 'http://localhost:5173/events/7'
const MADE = new Date('2026-11-14T12:00:00Z')

function lines(file) {
  return file.split('\r\n')
}

describe('icsFile', () => {
  it('has the event times in UTC', () => {
    const file = lines(icsFile(event, PAGE, MADE))
    expect(file).toContain('DTSTART:20261119T000000Z')
    expect(file).toContain('DTEND:20261119T020000Z')
    expect(file).toContain('DTSTAMP:20261114T120000Z')
    expect(file).toContain('UID:event-7@espial')
  })

  it('uses the new time after a delay, keeping the length', () => {
    const delayed = {
      ...event,
      change: {
        type: 'delayed',
        newStart: new Date('2026-11-19T19:00:00-05:00'),
      },
    }
    const file = lines(icsFile(delayed, PAGE, MADE))
    expect(file).toContain('DTSTART:20261120T000000Z')
    expect(file).toContain('DTEND:20261120T020000Z')
  })

  it('assumes two hours when the end is unknown', () => {
    const file = lines(icsFile({ ...event, end: null }, PAGE, MADE))
    expect(file).toContain('DTEND:20261119T020000Z')
  })

  it('escapes commas and keeps lines to 75 characters', () => {
    const file = icsFile(event, PAGE, MADE)
    expect(file).toContain('Bring yarn\\, needles\\, etc.')
    for (const line of lines(file)) {
      expect(line.length).toBeLessThanOrEqual(75)
    }
  })

  it('uses Windows-style line endings, as calendar files must', () => {
    const file = icsFile(event, PAGE, MADE)
    expect(file.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(file.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})

describe('googleCalendarUrl', () => {
  it('fills in the title, times and place', () => {
    const url = new URL(googleCalendarUrl(event, PAGE))
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Knit and sip')
    expect(url.searchParams.get('dates')).toBe(
      '20261119T000000Z/20261119T020000Z',
    )
    expect(url.searchParams.get('location')).toBe(
      'Longwood Ave cafe, Boston, MA',
    )
    expect(url.searchParams.get('details')).toContain(PAGE)
  })
})

describe('fileName', () => {
  it('makes a tidy file name from the title', () => {
    expect(fileName('Knit and sip!')).toBe('knit-and-sip.ics')
    expect(fileName('Midnight movie: cult classics')).toBe(
      'midnight-movie-cult-classics.ics',
    )
    expect(fileName('!!!')).toBe('event.ics')
  })
})
