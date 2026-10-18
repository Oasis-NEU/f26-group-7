import { describe, expect, it } from 'vitest'
import { formatTime, groupByDay, isSameDay } from './dates'

describe('date helpers', () => {
  it('groups adjacent events on the same day', () => {
    const first = new Date('2026-10-18T18:00:00')
    const second = new Date('2026-10-18T20:00:00')
    const nextDay = new Date('2026-10-19T18:00:00')

    expect(
      groupByDay([
        { id: 1, start: first },
        { id: 2, start: second },
        { id: 3, start: nextDay },
      ]),
    ).toEqual([
      {
        date: first,
        events: [
          { id: 1, start: first },
          { id: 2, start: second },
        ],
      },
      { date: nextDay, events: [{ id: 3, start: nextDay }] },
    ])
  })

  it('compares calendar days and formats whole-hour times', () => {
    expect(
      isSameDay(
        new Date('2026-10-18T08:00:00'),
        new Date('2026-10-18T23:00:00'),
      ),
    ).toBe(true)
    expect(formatTime(new Date('2026-10-18T20:00:00'))).toBe('8 PM')
  })
})
