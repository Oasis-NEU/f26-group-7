import { describe, expect, it } from 'vitest'
import { changeMessage } from './status'

describe('event change messages', () => {
  it('formats cancellations without replacement data', () => {
    expect(changeMessage({ type: 'cancelled' })).toBe('Cancelled')
  })

  it('formats venue changes with the replacement venue', () => {
    expect(
      changeMessage({ type: 'detour', newVenue: 'The Sinclair' }),
    ).toBe('Venue change: now at The Sinclair')
  })
})
