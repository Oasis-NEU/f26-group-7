import { describe, expect, it } from 'vitest'
import { destination, directionsUrl } from './directions'

const event = {
  venue: 'Old hall',
  address: '1 Old St, Boston, MA',
  change: null,
}

describe('directions', () => {
  it('goes to the exact address when there is one', () => {
    expect(destination(event)).toBe('1 Old St, Boston, MA')
  })

  it('goes to the venue when there is no address', () => {
    expect(destination({ ...event, address: null })).toBe(
      'Old hall, Boston, MA',
    )
  })

  it('goes to the new venue after a venue change', () => {
    const moved = {
      ...event,
      change: { type: 'detour', newVenue: 'New hall' },
    }
    expect(destination(moved)).toBe('New hall, Boston, MA')
  })

  it('asks Google Maps for transit directions', () => {
    const url = new URL(directionsUrl(event))
    expect(url.host).toBe('www.google.com')
    expect(url.searchParams.get('travelmode')).toBe('transit')
    expect(url.searchParams.get('destination')).toBe('1 Old St, Boston, MA')
  })
})
