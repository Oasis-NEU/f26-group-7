// DRAFT FOR PLANNING: the tests for friends.draft.js. Once that file moves
// to src/lib/friends.js, this one becomes src/lib/friends.test.js. Until
// then, its name keeps it out of npm run test (and npm run check).

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acceptFriendRequest,
  groupFriendships,
  relationshipWith,
  sendFriendRequest,
  suggestionReason,
  toFriendship,
  toSuggestion,
} from './friends'

// The same fake Supabase as myEvents.test.js: it writes requests down
// instead of sending them, and `answers` holds what they get back.
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
      then: (resolve) =>
        resolve(fake.answers.shift() ?? { data: null, error: null }),
    }
    return query
  }
  return { supabase: { from } }
})

beforeEach(() => {
  fake.requests.length = 0
  fake.answers.length = 0
})

// A my_friendships row: Sam sent you a request.
function row(overrides) {
  return {
    id: 1,
    status: 'pending',
    direction: 'received',
    created_at: '2026-11-20T15:00:00Z',
    accepted_at: null,
    person_id: 'sam-id',
    username: 'sam',
    display_name: 'Sam Rivera',
    avatar_url: null,
    school: 'Boston University',
    ...overrides,
  }
}

describe('toFriendship', () => {
  it('puts the other person in `person`', () => {
    expect(toFriendship(row())).toMatchObject({
      id: 1,
      status: 'pending',
      direction: 'received',
      createdAt: new Date('2026-11-20T15:00:00Z'),
      acceptedAt: null,
      person: { id: 'sam-id', username: 'sam', displayName: 'Sam Rivera' },
    })
  })
})

describe('groupFriendships', () => {
  it('splits friends, requests to answer and requests you sent', () => {
    const friend = toFriendship(row({ id: 1, status: 'accepted' }))
    const received = toFriendship(row({ id: 2 }))
    const sent = toFriendship(row({ id: 3, direction: 'sent' }))

    expect(groupFriendships([friend, received, sent])).toEqual({
      friends: [friend],
      received: [received],
      sent: [sent],
    })
  })
})

describe('relationshipWith', () => {
  const mine = [
    toFriendship(row({ id: 1, status: 'accepted', person_id: 'friend' })),
    toFriendship(row({ id: 2, direction: 'sent', person_id: 'asked' })),
    toFriendship(row({ id: 3, direction: 'received', person_id: 'asker' })),
  ]

  it.each([
    ['me', 'self'],
    ['friend', 'friends'],
    ['asked', 'sent'],
    ['asker', 'received'],
    ['stranger', 'none'],
  ])('%s is %s', (personId, expected) => {
    expect(relationshipWith(personId, 'me', mine).relationship).toBe(expected)
  })

  it('returns the row, for accepting or removing it', () => {
    expect(relationshipWith('asker', 'me', mine).friendship.id).toBe(3)
  })
})

describe('suggestionReason', () => {
  const nobody = toSuggestion({ id: 'x', school: 'Northeastern' })

  it('gives the strongest reason first', () => {
    expect(
      suggestionReason({ ...nobody, mutualFriends: 3, sharedEvents: 2 }),
    ).toBe('3 mutual friends')
    expect(
      suggestionReason({ ...nobody, sharedEvents: 1, sameSchool: true }),
    ).toBe('1 event in common')
    expect(suggestionReason({ ...nobody, sameSchool: true })).toBe(
      'Also at Northeastern',
    )
    expect(
      suggestionReason({
        ...nobody,
        sharedNiches: ['Records', 'Film', 'Books', 'Games'],
      }),
    ).toBe('Also into Records, Film and Books')
  })

  it('has nothing to say without a reason', () => {
    expect(suggestionReason(nobody)).toBeNull()
  })
})

describe('sendFriendRequest', () => {
  it('only sends who the request is for', async () => {
    await sendFriendRequest('sam-id')
    expect(fake.requests[0]).toEqual({
      table: 'friendships',
      steps: [['insert', { addressee_id: 'sam-id' }]],
    })
  })

  it('explains a request that already exists', async () => {
    fake.answers.push({ data: null, error: { code: '23505' } })
    await expect(sendFriendRequest('sam-id')).rejects.toThrow(
      /already sent a friend request/,
    )
  })
})

describe('acceptFriendRequest', () => {
  it('says so when there was nothing to accept', async () => {
    fake.answers.push({ data: [], error: null })
    await expect(acceptFriendRequest(7)).rejects.toThrow(/isn’t there/)
  })
})
