import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FILTERS } from './filters'
import {
  SEARCH_LIMIT,
  fetchEvent,
  searchEvents,
  toEvent,
  watchEvents,
} from './events'

// A fake Supabase client: remembers the realtime callback (and what it
// was watching) so tests can pretend rows changed, and what a search
// asked for. No network.
const fake = vi.hoisted(() => ({
  onRowChange: null,
  removed: false,
  channelName: null,
  filter: null,
  queried: false,
  rpc: null, // { name, args, range }
  rows: [],
}))

vi.mock('./supabase', () => {
  const channel = {
    on(_type, filter, callback) {
      fake.filter = filter
      fake.onRowChange = callback
      return channel
    },
    subscribe() {
      return channel
    },
  }
  return {
    supabase: {
      from: () => {
        fake.queried = true
        throw new Error('tests should not query')
      },
      rpc: (name, args) => {
        fake.rpc = { name, args }
        const call = {
          select: () => call,
          range: (from, to) => {
            fake.rpc.range = [from, to]
            return call
          },
          then: (resolve) => resolve({ data: fake.rows, error: null }),
        }
        return call
      },
      channel: (name) => {
        fake.channelName = name
        return channel
      },
      removeChannel: () => {
        fake.removed = true
      },
    },
  }
})

const row = {
  id: 7,
  title: 'Knit and sip',
  niche: 'Makers',
  description: 'Bring a project.',
  image_url: null,
  neighborhood: 'Fenway',
  venue: 'Longwood Ave cafe',
  address: null,
  lat: 42.34,
  lng: -71.11,
  stop: 'Longwood',
  line: 'GL D',
  walk_minutes: 3,
  going: 10,
  start_at: '2026-11-18T19:00:00-05:00',
  ends_at: '2026-11-18T21:00:00-05:00',
  change_type: 'delayed',
  change_new_start: '2026-11-19T19:00:00-05:00',
  change_new_venue: null,
  price_min: 12,
  price_max: 12,
  is_free: false,
  adults_only: false,
  source: 'seed',
  source_url: null,
}

describe('toEvent', () => {
  it('turns a database row into the shape pages use', () => {
    const event = toEvent(row)
    expect(event).toMatchObject({
      id: 7,
      walkMinutes: 3,
      location: { lat: 42.34, lng: -71.11 },
      price: { min: 12, max: 12 },
      isFree: false,
      change: { type: 'delayed', newVenue: null },
    })
    expect(event.start).toEqual(new Date('2026-11-18T19:00:00-05:00'))
    expect(event.end).toEqual(new Date('2026-11-18T21:00:00-05:00'))
    expect(event.change.newStart).toEqual(new Date('2026-11-19T19:00:00-05:00'))
  })

  it('leaves unknown details empty', () => {
    const event = toEvent({
      ...row,
      lat: null,
      ends_at: null,
      change_type: null,
      price_min: null,
      price_max: null,
      is_free: null,
    })
    expect(event.location).toBeNull()
    expect(event.end).toBeNull()
    expect(event.change).toBeNull()
    expect(event.price).toBeNull()
    expect(event.isFree).toBeNull()
  })

  it('reads prices that arrive as text', () => {
    const event = toEvent({ ...row, price_min: '0.00', price_max: '20.00' })
    expect(event.price).toEqual({ min: 0, max: 20 })
  })
})

describe('searchEvents', () => {
  it('asks the database search for the filters', async () => {
    fake.rows = [row]
    const result = await searchEvents({ ...DEFAULT_FILTERS, q: 'knit' })

    expect(fake.rpc.name).toBe('search_events')
    expect(fake.rpc.args).toMatchObject({ q: 'knit', free_only: false })
    expect(result.events.map((event) => event.title)).toEqual(['Knit and sip'])
    expect(result.capped).toBe(false)
  })

  it('notices when there are more events than it shows', async () => {
    fake.rows = Array.from({ length: SEARCH_LIMIT + 1 }, (_, i) => ({
      ...row,
      id: i,
    }))
    const result = await searchEvents(DEFAULT_FILTERS)

    // One extra is asked for, to tell whether there were more.
    expect(fake.rpc.range).toEqual([0, SEARCH_LIMIT])
    expect(result.events).toHaveLength(SEARCH_LIMIT)
    expect(result.capped).toBe(true)
  })
})

describe('fetchEvent', () => {
  it('finds nothing for ids that are not numbers, without asking', async () => {
    expect(await fetchEvent('abc')).toBeNull()
    expect(fake.queried).toBe(false)
  })
})

describe('watchEvents', () => {
  it('can watch just one event', () => {
    const stop = watchEvents(() => {}, { id: 12 })
    expect(fake.channelName).toBe('event-12')
    expect(fake.filter).toMatchObject({ table: 'events', filter: 'id=eq.12' })
    stop()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reloads once after a burst of changes goes quiet', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    watchEvents(onChange, { waitMs: 2000 })

    // Five rows change in quick succession, like an engine run.
    for (let i = 0; i < 5; i++) {
      fake.onRowChange()
      vi.advanceTimersByTime(500)
    }
    expect(onChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(2000)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('stops listening and cancels a pending reload', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const stop = watchEvents(onChange, { waitMs: 2000 })

    fake.onRowChange()
    stop()
    vi.advanceTimersByTime(5000)

    expect(onChange).not.toHaveBeenCalled()
    expect(fake.removed).toBe(true)
  })
})
