// DRAFT FOR PLANNING: the tests for follows.draft.js. Once that file moves
// to src/lib/follows.js, this one becomes src/lib/follows.test.js. Until
// then, its name keeps it out of npm run test (and npm run check).

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acceptFollower,
  follow,
  followButtonText,
  groupFollows,
  past,
  relationshipWith,
  removeFollower,
  suggestionReason,
  toFollow,
  toSuggestion,
  unfollow,
} from './follows'

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
      single: step('single'),
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

// A my_follows row: Sam has asked to follow you.
function row(overrides) {
  return {
    direction: 'follower',
    status: 'pending',
    created_at: '2026-11-20T15:00:00Z',
    accepted_at: null,
    person_id: 'sam-id',
    username: 'sam',
    display_name: 'Sam Rivera',
    avatar_url: null,
    school: 'Boston University',
    privacy: 'public',
    ...overrides,
  }
}

describe('toFollow', () => {
  it('puts the other person in `person`', () => {
    expect(toFollow(row())).toMatchObject({
      direction: 'follower',
      status: 'pending',
      createdAt: new Date('2026-11-20T15:00:00Z'),
      acceptedAt: null,
      person: { id: 'sam-id', username: 'sam', privacy: 'public' },
    })
  })
})

describe('groupFollows', () => {
  it('splits following, followers and requests both ways', () => {
    const following = toFollow(
      row({ direction: 'following', status: 'accepted' }),
    )
    const follower = toFollow(row({ status: 'accepted' }))
    const request = toFollow(row())
    const requested = toFollow(row({ direction: 'following' }))

    expect(groupFollows([following, follower, request, requested])).toEqual({
      following: [following],
      followers: [follower],
      requests: [request],
      requested: [requested],
    })
  })
})

describe('relationshipWith', () => {
  const mine = [
    toFollow(
      row({ direction: 'following', status: 'accepted', person_id: 'mutual' }),
    ),
    toFollow(
      row({ direction: 'follower', status: 'accepted', person_id: 'mutual' }),
    ),
    toFollow(row({ direction: 'following', person_id: 'asked' })),
    toFollow(row({ person_id: 'asker' })),
    toFollow(row({ status: 'accepted', person_id: 'fan' })),
  ]
  const nothing = { self: false, followsYou: false, theyAsked: false }

  it.each([
    [
      'me',
      { self: true, youFollow: 'none', followsYou: false, theyAsked: false },
    ],
    ['mutual', { ...nothing, youFollow: 'following', followsYou: true }],
    ['asked', { ...nothing, youFollow: 'requested' }],
    ['asker', { ...nothing, youFollow: 'none', theyAsked: true }],
    ['fan', { ...nothing, youFollow: 'none', followsYou: true }],
    ['stranger', { ...nothing, youFollow: 'none' }],
  ])('%s', (personId, expected) => {
    expect(relationshipWith(personId, 'me', mine)).toEqual(expected)
  })
})

describe('followButtonText', () => {
  it('asks private accounts and follows public ones', () => {
    expect(followButtonText({ privacy: 'public' }, 'none')).toBe('Follow')
    expect(followButtonText({ privacy: 'private' }, 'none')).toBe(
      'Request to follow',
    )
    expect(followButtonText({ privacy: 'private' }, 'requested')).toBe(
      'Requested',
    )
    expect(followButtonText({ privacy: 'public' }, 'following')).toBe(
      'Following',
    )
  })
})

describe('suggestionReason', () => {
  const nobody = toSuggestion({ id: 'x', school: 'Northeastern' })

  it('gives the strongest reason first', () => {
    expect(
      suggestionReason({ ...nobody, followsYou: true, followedBy: 2 }),
    ).toBe('Follows you')
    expect(suggestionReason({ ...nobody, followedBy: 2 })).toBe(
      'Followed by 2 people you follow',
    )
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

describe('past', () => {
  const now = new Date('2026-11-27T20:00:00Z')
  const event = (id, start, change = null) => ({
    id,
    start: new Date(start),
    end: null,
    change,
  })

  it('keeps finished events, most recent first, without cancelled ones', () => {
    const events = [
      event(1, '2026-11-20T18:00:00Z'),
      event(2, '2026-11-25T18:00:00Z'),
      event(3, '2026-11-28T18:00:00Z'), // still to come
      event(4, '2026-11-26T18:00:00Z', { type: 'cancelled' }),
    ]
    expect(past(events, now).map((item) => item.id)).toEqual([2, 1])
  })
})

describe('follow', () => {
  it('only sends who to follow, and says when it started', async () => {
    fake.answers.push({ data: { status: 'accepted' }, error: null })
    expect(await follow('sam-id')).toBe('following')
    expect(fake.requests[0]).toEqual({
      table: 'follows',
      steps: [
        ['insert', { followee_id: 'sam-id' }],
        ['select', 'status'],
        ['single'],
      ],
    })
  })

  it('says "requested" for a private account', async () => {
    fake.answers.push({ data: { status: 'pending' }, error: null })
    expect(await follow('sam-id')).toBe('requested')
  })

  it('does nothing when you already follow them', async () => {
    fake.answers.push({ data: null, error: { code: '23505' } })
    expect(await follow('sam-id')).toBeNull()
  })
})

describe('acceptFollower', () => {
  it('accepts their request to follow you', async () => {
    fake.answers.push({ data: [{ status: 'accepted' }], error: null })
    await acceptFollower('me', 'sam-id')
    expect(fake.requests[0].steps).toEqual([
      ['update', { status: 'accepted' }],
      ['eq', 'follower_id', 'sam-id'],
      ['eq', 'followee_id', 'me'],
      ['select', 'status'],
    ])
  })

  it('says so when there was nothing to accept', async () => {
    fake.answers.push({ data: [], error: null })
    await expect(acceptFollower('me', 'sam-id')).rejects.toThrow(/isn’t there/)
  })
})

describe('unfollow and removeFollower', () => {
  it('delete the row from either side', async () => {
    await unfollow('me', 'sam-id')
    await removeFollower('me', 'sam-id')
    expect(fake.requests.map((request) => request.steps)).toEqual([
      [
        ['delete'],
        ['eq', 'follower_id', 'me'],
        ['eq', 'followee_id', 'sam-id'],
      ],
      [
        ['delete'],
        ['eq', 'follower_id', 'sam-id'],
        ['eq', 'followee_id', 'me'],
      ],
    ])
  })
})
