import { describe, expect, it } from 'vitest'
import {
  bioProblem,
  cleanUsername,
  displayNameProblem,
  emailProblem,
  passwordProblem,
  usernameProblem,
} from './validate'

describe('usernames', () => {
  it('cleans up spaces and capitals', () => {
    expect(cleanUsername('  Jordan_Lee ')).toBe('jordan_lee')
  })

  it('accepts 3 to 20 lowercase letters, numbers and _', () => {
    expect(usernameProblem('jo_lee2')).toBeNull()
    expect(usernameProblem('abc')).toBeNull()
    expect(usernameProblem('a'.repeat(20))).toBeNull()
  })

  it('explains what is wrong', () => {
    expect(usernameProblem('jo')).toMatch(/at least 3/)
    expect(usernameProblem('a'.repeat(21))).toMatch(/at most 20/)
    expect(usernameProblem('jo lee')).toMatch(/only use/)
    expect(usernameProblem('Jordan')).toMatch(/only use/)
  })
})

describe('other fields', () => {
  it('checks emails loosely', () => {
    expect(emailProblem('jordan@northeastern.edu')).toBeNull()
    expect(emailProblem('jordan')).not.toBeNull()
    expect(emailProblem('jordan@school')).not.toBeNull()
  })

  it('needs passwords of at least 8 characters', () => {
    expect(passwordProblem('12345678')).toBeNull()
    expect(passwordProblem('1234567')).toMatch(/at least 8/)
  })

  it('needs a name of at most 50 characters', () => {
    expect(displayNameProblem('Jordan')).toBeNull()
    expect(displayNameProblem('   ')).not.toBeNull()
    expect(displayNameProblem('a'.repeat(51))).toMatch(/at most 50/)
  })

  it('keeps bios to 300 characters', () => {
    expect(bioProblem('a'.repeat(300))).toBeNull()
    expect(bioProblem('a'.repeat(301))).not.toBeNull()
  })
})
