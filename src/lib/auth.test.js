import { describe, expect, it, vi } from 'vitest'
import { authErrorMessage } from './auth'

vi.mock('./supabase', () => ({ supabase: {} }))

describe('authErrorMessage', () => {
  it('rewrites the errors people actually see', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'That email and password don’t match.',
    )
    expect(authErrorMessage({ message: 'User already registered' })).toMatch(
      /already an account/,
    )
    expect(authErrorMessage({ message: 'Email not confirmed' })).toMatch(
      /confirm your account/,
    )
    expect(authErrorMessage({ status: 429, message: 'whatever' })).toMatch(
      /Too many tries/,
    )
  })

  it('passes password rules through, since they are already readable', () => {
    const message = 'Password should be at least 8 characters.'
    expect(authErrorMessage({ message })).toBe(message)
  })

  it('falls back to a general message', () => {
    expect(authErrorMessage({ message: 'socket hang up' })).toBe(
      'Something went wrong. Try again.',
    )
    expect(authErrorMessage(undefined)).toBe('Something went wrong. Try again.')
  })
})
