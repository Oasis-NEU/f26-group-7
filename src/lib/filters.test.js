import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  dateRange,
  hasFilters,
  readFilters,
  toSearchArgs,
  whenText,
  writeFilters,
} from './filters'

const read = (query) => readFilters(new URLSearchParams(query))
const filters = (changes) => ({ ...DEFAULT_FILTERS, ...changes })

// Local dates, so the tests work on any computer's clock.
const day = (year, month, date, hour = 0) =>
  new Date(year, month - 1, date, hour)

describe('readFilters', () => {
  it('starts from the defaults', () => {
    expect(read('')).toEqual(DEFAULT_FILTERS)
  })

  it('reads every filter', () => {
    expect(
      read(
        'q=vinyl&when=weekend&niche=Records,Live%20music&walk=10&near=Symphony&price=free',
      ),
    ).toEqual(
      filters({
        q: 'vinyl',
        when: 'weekend',
        niches: ['Records', 'Live music'],
        walk: '10',
        near: 'Symphony',
        price: 'free',
      }),
    )
  })

  it('falls back to the default for anything invalid', () => {
    expect(
      read(
        'when=someday&niche=Records,Concerts&walk=7&near=Narnia&price=cheap&from=soon',
      ),
    ).toEqual(filters({ niches: ['Records'] }))
  })
})

describe('writeFilters', () => {
  it('leaves defaults out, so a plain Home page is just /', () => {
    expect(writeFilters(DEFAULT_FILTERS).toString()).toBe('')
    expect(hasFilters(DEFAULT_FILTERS)).toBe(false)
  })

  it('round-trips through the address', () => {
    const chosen = filters({
      q: 'jazz',
      when: 'dates',
      from: '2026-11-20',
      to: '2026-11-25',
      niches: ['Live music', 'Film'],
      walk: '15',
      near: 'Kenmore',
      price: '20',
    })
    expect(read(writeFilters(chosen).toString())).toEqual(chosen)
    expect(hasFilters(chosen)).toBe(true)
  })

  it('drops dates unless picking dates, and the stop unless walking', () => {
    const written = writeFilters(
      filters({ from: '2026-11-20', near: 'Kenmore' }),
    ).toString()
    expect(written).toBe('')
  })
})

describe('dateRange', () => {
  const wednesday = day(2026, 11, 18, 15)

  it('covers today', () => {
    expect(dateRange(filters({ when: 'today' }), wednesday)).toEqual({
      from: day(2026, 11, 18),
      to: day(2026, 11, 19),
    })
  })

  it('covers the coming weekend on a weekday', () => {
    expect(dateRange(filters({ when: 'weekend' }), wednesday)).toEqual({
      from: day(2026, 11, 21),
      to: day(2026, 11, 23),
    })
  })

  it('covers the rest of the weekend on a Saturday or Sunday', () => {
    const saturday = day(2026, 11, 21, 12)
    const sunday = day(2026, 11, 22, 12)
    expect(dateRange(filters({ when: 'weekend' }), saturday)).toEqual({
      from: day(2026, 11, 21),
      to: day(2026, 11, 23),
    })
    expect(dateRange(filters({ when: 'weekend' }), sunday)).toEqual({
      from: day(2026, 11, 22),
      to: day(2026, 11, 23),
    })
  })

  it('covers the next 7 or 30 days from the start of today', () => {
    expect(dateRange(DEFAULT_FILTERS, wednesday)).toEqual({
      from: day(2026, 11, 18),
      to: day(2026, 11, 25),
    })
    expect(dateRange(filters({ when: 'month' }), wednesday).to).toEqual(
      day(2026, 12, 18),
    )
  })

  it('includes all of the last picked day, even when picked backwards', () => {
    const picked = filters({
      when: 'dates',
      from: '2026-11-25',
      to: '2026-11-20',
    })
    expect(dateRange(picked, wednesday)).toEqual({
      from: day(2026, 11, 20),
      to: day(2026, 11, 26),
    })
  })
})

describe('whenText', () => {
  const now = day(2026, 11, 18, 15)

  it('names the range for the headline', () => {
    expect(whenText(DEFAULT_FILTERS, now)).toBe('this week')
    expect(whenText(filters({ when: 'today' }), now)).toBe('today')
    expect(whenText(filters({ when: 'weekend' }), now)).toBe('this weekend')
  })

  it('names picked dates', () => {
    const range = (from, to) => filters({ when: 'dates', from, to })
    expect(whenText(range('2026-11-20', '2026-11-25'), now)).toBe('Nov 20–25')
    expect(whenText(range('2026-11-28', '2026-12-02'), now)).toBe(
      'Nov 28–Dec 2',
    )
    expect(whenText(range('2026-11-20', '2026-11-20'), now)).toBe('on Nov 20')
  })
})

describe('toSearchArgs', () => {
  const now = day(2026, 11, 18, 15)

  it('skips every filter by default except the dates', () => {
    expect(toSearchArgs(DEFAULT_FILTERS, now)).toEqual({
      q: null,
      starts_after: day(2026, 11, 18).toISOString(),
      starts_before: day(2026, 11, 25).toISOString(),
      niches: null,
      near_lat: null,
      near_lng: null,
      within_m: null,
      free_only: false,
      max_price: null,
    })
  })

  it('turns a walk into meters from the stop', () => {
    const args = toSearchArgs(filters({ walk: '10', near: 'Symphony' }), now)
    expect(args).toMatchObject({
      near_lat: 42.342687,
      near_lng: -71.085056,
      within_m: 800,
    })
  })

  it('turns the price into free-only or a top price', () => {
    expect(toSearchArgs(filters({ price: 'free' }), now)).toMatchObject({
      free_only: true,
      max_price: null,
    })
    expect(toSearchArgs(filters({ price: '20' }), now)).toMatchObject({
      free_only: false,
      max_price: 20,
    })
  })

  it('passes words and niches along', () => {
    expect(
      toSearchArgs(filters({ q: '  jazz ', niches: ['Live music'] }), now),
    ).toMatchObject({ q: 'jazz', niches: ['Live music'] })
  })
})
