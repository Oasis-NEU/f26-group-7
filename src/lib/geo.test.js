import { describe, expect, it } from 'vitest'
import { distanceMeters } from './geo'
import { findStop } from './stops'

describe('distanceMeters', () => {
  it('is zero from a place to itself', () => {
    const symphony = findStop('Symphony')
    expect(distanceMeters(symphony, symphony)).toBe(0)
  })

  it('measures real distances between T stops', () => {
    // About 210 m along Huntington Ave.
    const meters = distanceMeters(
      findStop('Symphony'),
      findStop('Massachusetts Avenue'),
    )
    expect(meters).toBeGreaterThan(150)
    expect(meters).toBeLessThan(250)

    // Kenmore to South Station is roughly 3.4 km.
    const across = distanceMeters(
      findStop('Kenmore'),
      findStop('South Station'),
    )
    expect(across).toBeGreaterThan(3000)
    expect(across).toBeLessThan(3800)
  })
})
