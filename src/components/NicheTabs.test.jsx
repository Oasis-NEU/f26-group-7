import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NicheTabs from './NicheTabs'

function renderTabs(selected) {
  const onChange = vi.fn()
  render(<NicheTabs selected={selected} onChange={onChange} />)
  return onChange
}

const tab = (name) => screen.getByRole('button', { name })

describe('NicheTabs', () => {
  it('lights All when nothing is picked', () => {
    renderTabs([])
    expect(tab('All')).toHaveAttribute('aria-pressed', 'true')
    expect(tab('Records')).toHaveAttribute('aria-pressed', 'false')
  })

  it('adds a niche to the ones already picked', () => {
    const onChange = renderTabs(['Records'])
    expect(tab('All')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(tab('Film'))
    expect(onChange).toHaveBeenCalledWith(['Records', 'Film'])
  })

  it('removes a niche when clicked again', () => {
    const onChange = renderTabs(['Records', 'Film'])
    fireEvent.click(tab('Records'))
    expect(onChange).toHaveBeenCalledWith(['Film'])
  })

  it('clears every niche with All', () => {
    const onChange = renderTabs(['Records', 'Film'])
    fireEvent.click(tab('All'))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
