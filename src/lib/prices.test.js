import { describe, expect, it } from 'vitest'
import { priceText } from './prices'

describe('priceText', () => {
  it('says Free for free events', () => {
    expect(priceText({ min: 0, max: 0 }, true)).toBe('Free')
  })

  it('shows one price or a range', () => {
    expect(priceText({ min: 8, max: 8 }, false)).toBe('$8')
    expect(priceText({ min: 15, max: 25 }, false)).toBe('$15–$25')
    expect(priceText({ min: 0, max: 20 }, false)).toBe('$0–$20')
  })

  it('shows cents only when there are some', () => {
    expect(priceText({ min: 7.5, max: 7.5 }, false)).toBe('$7.50')
  })

  it('says so when the price is unknown', () => {
    expect(priceText(null, null)).toBe('Price not listed')
  })
})
