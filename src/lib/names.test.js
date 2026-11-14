import { describe, expect, it } from 'vitest'
import { firstName, initials } from './names'

describe('firstName', () => {
  it('uses the first word', () => {
    expect(firstName('Jordan Lee')).toBe('Jordan')
    expect(firstName('  Sam ')).toBe('Sam')
  })

  it('is empty when there is no name', () => {
    expect(firstName('')).toBe('')
    expect(firstName(null)).toBe('')
    expect(firstName()).toBe('')
  })
})

describe('initials', () => {
  it('uses the first letter of up to two words', () => {
    expect(initials('Jordan Lee')).toBe('JL')
    expect(initials('jordan  van der lee')).toBe('JV')
    expect(initials('Sam')).toBe('S')
  })

  it('is empty when there is no name', () => {
    expect(initials('')).toBe('')
    expect(initials()).toBe('')
  })
})
