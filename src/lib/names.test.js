import { describe, expect, it } from 'vitest'
import { initials } from './names'

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
