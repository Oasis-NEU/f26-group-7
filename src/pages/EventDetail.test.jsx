import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchEvent } from '../lib/events'
import EventDetail from './EventDetail'

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../lib/events', () => ({
  fetchEvent: vi.fn(),
  watchEvents: () => () => {},
}))

// Two days from now, 7 to 9 PM, so it's never over during the test.
function later(hour) {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(hour, 0, 0, 0)
  return date
}

const event = {
  id: 7,
  title: 'Knit and sip',
  niche: 'Makers',
  description: 'Bring a project or learn a basic stitch.',
  imageUrl: null,
  venue: 'Longwood Ave cafe',
  address: null,
  stop: 'Longwood',
  line: 'GL D',
  walkMinutes: 3,
  going: 10,
  start: later(19),
  end: later(21),
  change: null,
  price: { min: 12, max: 12 },
  isFree: false,
  adultsOnly: false,
  source: 'seed',
  sourceUrl: null,
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/events/7']}>
        <Routes>
          <Route path="events/:id" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EventDetail', () => {
  it('shows the event and how to get there', async () => {
    fetchEvent.mockResolvedValue(event)
    renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Knit and sip' }),
    ).toBeVisible()
    expect(fetchEvent).toHaveBeenCalledWith('7')
    expect(screen.getByText('$12')).toBeVisible()
    expect(screen.getByText('10 going')).toBeVisible()
    expect(screen.getByText(/Bring a project/)).toBeVisible()
    expect(
      screen.getByRole('link', { name: /Directions in Google Maps/ }),
    ).toHaveAttribute('href', expect.stringContaining('google.com/maps'))
    expect(
      screen.getByRole('link', { name: 'Add to Google Calendar' }),
    ).toBeVisible()
  })

  it('links to the original listing when there is one', async () => {
    fetchEvent.mockResolvedValue({
      ...event,
      source: 'ticketmaster',
      sourceUrl: 'https://www.ticketmaster.com/event/1',
    })
    renderPage()

    expect(
      await screen.findByRole('link', { name: /View on Ticketmaster/ }),
    ).toHaveAttribute('href', 'https://www.ticketmaster.com/event/1')
  })

  it('hides directions and calendar buttons for cancelled events', async () => {
    fetchEvent.mockResolvedValue({ ...event, change: { type: 'cancelled' } })
    renderPage()

    expect(await screen.findByText('Cancelled')).toBeVisible()
    expect(screen.queryByRole('link', { name: /Directions/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Calendar/ })).toBeNull()
  })

  it('says so when there is no such event', async () => {
    fetchEvent.mockResolvedValue(null)
    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'This event isn’t on the schedule',
      }),
    ).toBeVisible()
  })
})
