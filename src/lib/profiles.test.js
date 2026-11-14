import { describe, expect, it, vi } from 'vitest'
import { photoProblem, toProfile, toProfileRow } from './profiles'

vi.mock('./supabase', () => ({ supabase: {} }))

describe('toProfile', () => {
  it('turns a database row into the shape pages use', () => {
    const profile = toProfile({
      id: 'user-1',
      username: 'jordan',
      display_name: 'Jordan Lee',
      avatar_url: null,
      bio: null,
      school: 'Northeastern',
      favorite_niches: ['Records', 'Film'],
      home_stop: 'Symphony',
      home_neighborhood: 'Fenway',
      privacy: 'friends',
      role: 'user',
      onboarded_at: '2026-11-14T17:00:00Z',
    })
    expect(profile).toMatchObject({
      displayName: 'Jordan Lee',
      favoriteNiches: ['Records', 'Film'],
      homeStop: 'Symphony',
      onboardedAt: new Date('2026-11-14T17:00:00Z'),
    })
  })

  it('handles public rows without private fields', () => {
    const profile = toProfile({ id: 'user-2', username: 'sam' })
    expect(profile.favoriteNiches).toEqual([])
    expect(profile.onboardedAt).toBeNull()
  })
})

describe('toProfileRow', () => {
  it('uses database names and saves empty text as nothing', () => {
    expect(
      toProfileRow({ displayName: 'Jo', bio: '', favoriteNiches: ['Film'] }),
    ).toEqual({ display_name: 'Jo', bio: null, favorite_niches: ['Film'] })
  })

  it('refuses fields people can not change', () => {
    expect(() => toProfileRow({ role: 'admin' })).toThrow(/can't change/)
  })
})

describe('photoProblem', () => {
  it('accepts images up to 2 MB', () => {
    expect(photoProblem({ type: 'image/png', size: 2 * 1024 * 1024 })).toBe(
      null,
    )
  })

  it('refuses other files and big photos', () => {
    expect(photoProblem({ type: 'application/pdf', size: 10 })).toMatch(
      /JPG, PNG/,
    )
    expect(photoProblem({ type: 'image/jpeg', size: 3 * 1024 * 1024 })).toMatch(
      /2 MB/,
    )
  })
})
