import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { searchEvents } from '../lib/events'
import Explore from './Explore'

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../lib/events', () => ({
  SEARCH_LIMIT: 200,
  searchEvents: vi.fn(),
  watchEvents: () => () => {},
}))

// The test browser can't draw maps, so a stand-in: a button for each pin
// (pressing it is like clicking the pin), and what the map was told.
vi.mock('../components/EventMap', () => ({
  default: ({ events, selectedId, hoveredId, onSelect, walkArea }) => (
    <div role="region" aria-label="Map of events">
      {events
        .filter((event) => event.location)
        .map((event) => (
          <button key={event.id} onClick={() => onSelect(event.id)}>
            Pin: {event.title}
          </button>
        ))}
      <p>Selected pin: {selectedId ?? 'none'}</p>
      <p>Highlighted pin: {hoveredId ?? 'none'}</p>
      <p>Walk circle: {walkArea ? walkArea.stop.name : 'none'}</p>
    </div>
  ),
}))

// Two days from now, so the events are never over during the test.
function later(hour) {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(hour, 0, 0, 0)
  return date
}

function event(id, title, extra = {}) {
  return {
    id,
    title,
    niche: 'Records',
    stop: 'Symphony',
    line: 'GL E',
    walkMinutes: 3,
    start: later(18),
    end: later(20),
    change: null,
    location: { lat: 42.3427, lng: -71.0851 },
    ...extra,
  }
}

const EVENTS = [
  event(1, 'Vinyl listening hour'),
  event(2, 'Record swap at a noodle bar'),
  event(3, 'Greenway walking tour', { location: null }),
]

function visit(path = '/explore') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Explore />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const row = (title) => screen.getByText(title).closest('li')
const map = () => screen.getByRole('region', { name: 'Map of events' })

beforeEach(() => {
  vi.clearAllMocks()
  searchEvents.mockResolvedValue({ events: EVENTS, capped: false })
})

describe('Explore', () => {
  it('searches with the filters in the address', async () => {
    visit('/explore?q=vinyl&when=weekend')
    expect(
      await screen.findByText(/3 results for “vinyl” this weekend\./),
    ).toBeVisible()
    expect(searchEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'vinyl', when: 'weekend' }),
    )
  })

  it('pins the events that have a spot, and lists all of them', async () => {
    visit()
    expect(
      await screen.findByText(
        '3 events this week. 1 without an exact spot is only in the list.',
      ),
    ).toBeVisible()
    expect(await within(map()).findAllByRole('button')).toHaveLength(2)
    expect(
      within(row('Greenway walking tour')).getByText('Not on the map'),
    ).toBeVisible()
  })

  it('marks the pin when "Show on map" is pressed', async () => {
    visit()
    await screen.findByText('Pin: Record swap at a noodle bar')
    fireEvent.click(
      within(row('Record swap at a noodle bar')).getByRole('button', {
        name: 'Show on map',
      }),
    )
    expect(screen.getByText('Selected pin: 2')).toBeVisible()
    expect(row('Record swap at a noodle bar')).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('marks the row when its pin is clicked', async () => {
    visit()
    fireEvent.click(await screen.findByText('Pin: Vinyl listening hour'))
    expect(row('Vinyl listening hour')).toHaveAttribute('aria-current', 'true')
    expect(row('Record swap at a noodle bar')).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('highlights the pin of the row under the mouse', async () => {
    visit()
    await screen.findByText('Pin: Vinyl listening hour')
    fireEvent.mouseEnter(row('Vinyl listening hour'))
    expect(screen.getByText('Highlighted pin: 1')).toBeVisible()
    fireEvent.mouseLeave(row('Vinyl listening hour'))
    expect(screen.getByText('Highlighted pin: none')).toBeVisible()
  })

  it('draws the walk circle around the chosen stop', async () => {
    visit('/explore?walk=10&near=Kenmore')
    expect(await screen.findByText('Walk circle: Kenmore')).toBeVisible()
  })

  it('offers to clear filters when nothing matches', async () => {
    searchEvents.mockResolvedValue({ events: [], capped: false })
    visit('/explore?price=free')
    expect(
      await screen.findByText('Nothing matches these filters'),
    ).toBeVisible()
  })

  it('says so when events fail to load', async () => {
    searchEvents.mockRejectedValue(new Error('offline'))
    visit()
    expect(
      await screen.findByText(/Something went wrong loading events/),
    ).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Events didn’t load.')
  })
})
