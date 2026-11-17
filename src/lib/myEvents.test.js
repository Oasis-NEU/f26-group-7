import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setMyRsvp, setSaved, upcoming } from './myEvents'

// A fake Supabase that writes down every request instead of sending it.
// `answers` holds what the next requests get back, in order.
const fake = vi.hoisted(() => ({ requests: [], answers: [] }))

vi.mock('./supabase', () => {
  function from(table) {
    const request = { table, steps: [] }
    fake.requests.push(request)
    const step =
      (name) =>
      (...args) => {
        request.steps.push([name, ...args])
        return query
      }
    const query = {
      insert: step('insert'),
      update: step('update'),
      delete: step('delete'),
      select: step('select'),
      eq: step('eq'),
      maybeSingle: step('maybeSingle'),
      then: (resolve) =>
        resolve(fake.answers.shift() ?? { data: null, error: null }),
    }
    return query
  }
  return { supabase: { from } }
})

// The first step of each request: 'insert', 'update' or 'delete'.
function actions() {
  return fake.requests.map((request) => request.steps[0])
}

beforeEach(() => {
  fake.requests.length = 0
  fake.answers.length = 0
})

describe('setMyRsvp', () => {
  it('adds a new RSVP', async () => {
    await setMyRsvp('user-1', 7, 'going', null)
    expect(actions()).toEqual([
      ['insert', { user_id: 'user-1', event_id: 7, status: 'going' }],
    ])
  })

  it('changes the status of an existing RSVP', async () => {
    await setMyRsvp('user-1', 7, 'interested', 'going')
    expect(actions()).toEqual([['update', { status: 'interested' }]])
    expect(fake.requests[0].steps).toContainEqual(['eq', 'event_id', 7])
  })

  it('removes the RSVP when the status is null', async () => {
    await setMyRsvp('user-1', 7, null, 'going')
    expect(actions()).toEqual([['delete']])
  })

  it('changes it instead when the RSVP already exists', async () => {
    fake.answers.push({ error: { code: '23505' } })
    await setMyRsvp('user-1', 7, 'going', null)
    expect(actions().map(([name]) => name)).toEqual(['insert', 'update'])
  })

  it('passes other errors on', async () => {
    fake.answers.push({ error: { code: '42501', message: 'not allowed' } })
    await expect(setMyRsvp('user-1', 7, 'going', null)).rejects.toMatchObject({
      code: '42501',
    })
  })
})

describe('setSaved', () => {
  it('saves and unsaves', async () => {
    await setSaved('user-1', 7, true)
    await setSaved('user-1', 7, false)
    expect(actions()).toEqual([
      ['insert', { user_id: 'user-1', event_id: 7 }],
      ['delete'],
    ])
  })

  it('treats "already saved" as fine', async () => {
    fake.answers.push({ error: { code: '23505' } })
    await expect(setSaved('user-1', 7, true)).resolves.toBeUndefined()
  })
})

describe('upcoming', () => {
  const now = new Date('2026-11-14T15:00:00')
  const event = (id, start, end) => ({
    id,
    start: new Date(`2026-11-14T${start}:00`),
    end: new Date(`2026-11-14T${end}:00`),
    change: null,
  })

  it('leaves out finished and missing events, soonest first', () => {
    const list = upcoming(
      [
        event(1, '20:00', '22:00'),
        event(2, '10:00', '12:00'), // over
        null, // no longer published
        event(3, '16:00', '18:00'),
      ],
      now,
    )
    expect(list.map((e) => e.id)).toEqual([3, 1])
  })
})
