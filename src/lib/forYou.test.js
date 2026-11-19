import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS } from './filters'
import { FOR_YOU_COUNT, forYouFilters, pickForYou } from './forYou'
import { findStop } from './stops'

const now = new Date(2026, 10, 18, 12)
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 3600_000)

// An event at a stop's exact spot, or `location` if given.
function event(id, { at = 'Symphony', hours = 2, ...rest } = {}) {
  const stop = findStop(at)
  return {
    id,
    start: hoursFromNow(hours),
    end: hoursFromNow(hours + 2),
    change: null,
    location: { lat: stop.lat, lng: stop.lng },
    ...rest,
  }
}

const ids = (picks) => picks.map((pick) => pick.event.id)

describe('forYouFilters', () => {
  it('searches the next 7 days in your favorite niches', () => {
    expect(forYouFilters({ favoriteNiches: ['Records', 'Film'] })).toEqual({
      ...DEFAULT_FILTERS,
      niches: ['Records', 'Film'],
    })
  })

  it('has nothing to search without favorite niches', () => {
    expect(forYouFilters({ favoriteNiches: [] })).toBeNull()
    expect(forYouFilters({ favoriteNiches: ['All', 'Concerts'] })).toBeNull()
    expect(forYouFilters(null)).toBeNull()
  })
})

describe('pickForYou', () => {
  it('puts the closest to your home stop first', () => {
    const events = [
      event(1, { at: 'Park Street' }),
      event(2, { at: 'Symphony' }),
      event(3, { at: 'Massachusetts Avenue' }),
    ]
    expect(ids(pickForYou(events, 'Symphony', now))).toEqual([2, 3, 1])
  })

  it('gives the walk in minutes, at least 1', () => {
    const [here, near] = pickForYou(
      [event(1, { at: 'Symphony' }), event(2, { at: 'Massachusetts Avenue' })],
      'Symphony',
      now,
    )
    expect(here.walkMinutes).toBe(1)
    // About 200 meters apart: a 2- or 3-minute walk.
    expect(near.walkMinutes).toBeGreaterThanOrEqual(2)
    expect(near.walkMinutes).toBeLessThanOrEqual(3)
  })

  it('breaks ties and unknown places by start time, unknown last', () => {
    const events = [
      event(1, { location: null, hours: 1 }),
      event(2, { hours: 5 }),
      event(3, { hours: 3 }),
    ]
    const picks = pickForYou(events, 'Symphony', now)
    expect(ids(picks)).toEqual([3, 2, 1])
    expect(picks[2].walkMinutes).toBeNull()
  })

  it('goes soonest first without a home stop', () => {
    const events = [event(1, { hours: 5 }), event(2, { hours: 1 })]
    const picks = pickForYou(events, null, now)
    expect(ids(picks)).toEqual([2, 1])
    expect(picks[0].walkMinutes).toBeNull()
  })

  it('skips cancelled and finished events', () => {
    const events = [
      event(1, { change: { type: 'cancelled' } }),
      event(2, { hours: -5 }),
      event(3),
    ]
    expect(ids(pickForYou(events, 'Symphony', now))).toEqual([3])
  })

  it(`shows at most ${FOR_YOU_COUNT}`, () => {
    const events = [1, 2, 3, 4, 5, 6].map((id) => event(id, { hours: id }))
    expect(pickForYou(events, 'Symphony', now)).toHaveLength(FOR_YOU_COUNT)
  })
})
