import { describe, expect, it } from 'vitest'
import { formatTime, groupByDay, isSameDay, timeRange } from './dates'

describe('timeRange', () => {
  it('says AM or PM once when both times share it', () => {
    expect(
      timeRange(
        new Date('2026-11-14T17:00:00'),
        new Date('2026-11-14T19:00:00'),
      ),
    ).toBe('Sat, Nov 14, 5–7 PM')
  })

  it('says both when they differ', () => {
    expect(
      timeRange(
        new Date('2026-11-14T11:00:00'),
        new Date('2026-11-14T13:30:00'),
      ),
    ).toBe('Sat, Nov 14, 11 AM–1:30 PM')
  })

  it('handles events that run past midnight', () => {
    expect(
      timeRange(
        new Date('2026-11-14T23:00:00'),
        new Date('2026-11-15T01:00:00'),
      ),
    ).toBe('Sat, Nov 14, 11 PM–1 AM')
  })

  it('shows just the start when the end is unknown', () => {
    expect(timeRange(new Date('2026-11-14T19:00:00'), null)).toBe(
      'Sat, Nov 14, 7 PM',
    )
  })
})

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
