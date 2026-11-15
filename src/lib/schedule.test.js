import { describe, expect, it } from 'vitest'
import {
  actualEnd,
  actualStart,
  actualVenue,
  isHappening,
  isOver,
  nextEvent,
} from './schedule'

const at = (time) => new Date(`2026-11-14T${time}:00`)

// A plain event from 5 to 7 PM, with any fields overridden.
function event(fields = {}) {
  return {
    id: 1,
    venue: 'Old hall',
    start: at('17:00'),
    end: at('19:00'),
    change: null,
    ...fields,
  }
}

describe('actual times and places', () => {
  it('uses the planned time and place when nothing changed', () => {
    expect(actualStart(event())).toEqual(at('17:00'))
    expect(actualEnd(event())).toEqual(at('19:00'))
    expect(actualVenue(event())).toBe('Old hall')
  })

  it('moves the start and the end when an event is delayed', () => {
    const delayed = event({
      change: { type: 'delayed', newStart: at('18:00') },
    })
    expect(actualStart(delayed)).toEqual(at('18:00'))
    expect(actualEnd(delayed)).toEqual(at('20:00'))
  })

  it('uses the new venue after a venue change', () => {
    const moved = event({
      change: { type: 'detour', newStart: null, newVenue: 'New hall' },
    })
    expect(actualVenue(moved)).toBe('New hall')
    expect(actualStart(moved)).toEqual(at('17:00'))
  })

  it('has no end when the end time is unknown', () => {
    expect(actualEnd(event({ end: null }))).toBeNull()
  })
})

describe('isHappening', () => {
  it('is true between the start and the end', () => {
    expect(isHappening(event(), at('18:00'))).toBe(true)
    expect(isHappening(event(), at('16:59'))).toBe(false)
    expect(isHappening(event(), at('19:00'))).toBe(false)
  })

  it('is false without an end time', () => {
    expect(isHappening(event({ end: null }), at('18:00'))).toBe(false)
  })
})

describe('isOver', () => {
  it('is true once the end has passed', () => {
    expect(isOver(event(), at('18:59'))).toBe(false)
    expect(isOver(event(), at('19:00'))).toBe(true)
  })

  it('assumes two hours without an end time', () => {
    expect(isOver(event({ end: null }), at('18:30'))).toBe(false)
    expect(isOver(event({ end: null }), at('19:00'))).toBe(true)
  })
})

describe('nextEvent', () => {
  it('skips events that are over', () => {
    const over = event({ id: 1, start: at('12:00'), end: at('13:00') })
    const later = event({ id: 2, start: at('20:00'), end: at('22:00') })
    expect(nextEvent([over, later], at('15:00')).id).toBe(2)
  })

  it('keeps an event that is still happening', () => {
    const now = event({ id: 1 })
    const later = event({ id: 2, start: at('20:00'), end: at('22:00') })
    expect(nextEvent([now, later], at('18:00')).id).toBe(1)
  })

  it('treats an event with no end time as over once it starts', () => {
    const started = event({ id: 1, end: null })
    const later = event({ id: 2, start: at('20:00'), end: null })
    expect(nextEvent([started, later], at('17:30')).id).toBe(2)
  })

  it('skips cancelled events', () => {
    const cancelled = event({ id: 1, change: { type: 'cancelled' } })
    const later = event({ id: 2, start: at('20:00'), end: at('22:00') })
    expect(nextEvent([cancelled, later], at('16:00')).id).toBe(2)
  })

  it('orders by the actual time after a change', () => {
    // Planned first, but delayed past the other one.
    const delayed = event({
      id: 1,
      change: { type: 'delayed', newStart: at('21:00') },
    })
    const other = event({ id: 2, start: at('19:30'), end: at('20:30') })
    expect(nextEvent([delayed, other], at('16:00')).id).toBe(2)
  })

  it('is null when nothing is left', () => {
    expect(nextEvent([event()], at('23:00'))).toBeNull()
    expect(nextEvent([], at('12:00'))).toBeNull()
  })
})
