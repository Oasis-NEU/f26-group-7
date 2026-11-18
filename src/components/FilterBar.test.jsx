import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FILTERS } from '../lib/filters'
import FilterBar, { TYPING_PAUSE_MS } from './FilterBar'

function renderBar(changes = {}, homeStop = 'Symphony') {
  const onChange = vi.fn()
  render(
    <FilterBar
      filters={{ ...DEFAULT_FILTERS, ...changes }}
      onChange={onChange}
      homeStop={homeStop}
    />,
  )
  return onChange
}

function choose(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

afterEach(() => {
  vi.useRealTimers()
})

describe('FilterBar', () => {
  it('searches once typing pauses, not on every key', () => {
    vi.useFakeTimers()
    const onChange = renderBar()

    choose('Search', 'ja')
    choose('Search', 'jazz')
    expect(onChange).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(TYPING_PAUSE_MS))
    expect(onChange).toHaveBeenCalledTimes(1)
    // Typing replaces the current Back-button step instead of adding one.
    expect(onChange).toHaveBeenCalledWith({ q: 'jazz' }, { replace: true })
  })

  it('changes the date range and price', () => {
    const onChange = renderBar()
    choose('When', 'weekend')
    expect(onChange).toHaveBeenLastCalledWith({ when: 'weekend' })
    choose('Price', 'free')
    expect(onChange).toHaveBeenLastCalledWith({ price: 'free' })
  })

  it('starts a distance from your home stop', () => {
    const onChange = renderBar()
    choose('Distance', '10')
    expect(onChange).toHaveBeenCalledWith({ walk: '10', near: 'Symphony' })
  })

  it('starts from Park Street when there is no home stop', () => {
    const onChange = renderBar({}, null)
    choose('Distance', '5')
    expect(onChange).toHaveBeenCalledWith({ walk: '5', near: 'Park Street' })
  })

  it('shows the stop and date boxes only when they apply', () => {
    renderBar()
    expect(screen.queryByLabelText('From the stop')).toBeNull()
    expect(screen.queryByLabelText('From')).toBeNull()
  })

  it('shows them once a walk or picked dates are chosen', () => {
    renderBar({ walk: '10', near: 'Kenmore', when: 'dates' })
    expect(screen.getByLabelText('From the stop')).toHaveValue('Kenmore')
    expect(screen.getByLabelText('From')).toBeVisible()
    expect(screen.getByLabelText('To')).toBeVisible()
  })

  it('offers Clear filters only when something is set', () => {
    renderBar()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  it('clears every filter', () => {
    const onChange = renderBar({ price: 'free', niches: ['Film'] })
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onChange).toHaveBeenCalledWith(DEFAULT_FILTERS)
  })
})
