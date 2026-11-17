import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchIsSaved, fetchMyRsvp, setMyRsvp, setSaved } from '../lib/myEvents'
import { AuthContext } from '../lib/useAuth'
import RsvpButtons from './RsvpButtons'

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../lib/myEvents', () => ({
  fetchMyRsvp: vi.fn(),
  fetchIsSaved: vi.fn(),
  setMyRsvp: vi.fn(),
  setSaved: vi.fn(),
}))

const LOGGED_IN = { loading: false, user: { id: 'user-1' }, profile: {} }

function renderButtons(auth = LOGGED_IN) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <RsvpButtons eventId={7} />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

// Buttons are disabled while your current RSVP loads.
async function button(name) {
  const found = screen.getByRole('button', { name })
  await waitFor(() => expect(found).toBeEnabled())
  return found
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchMyRsvp.mockResolvedValue(null)
  fetchIsSaved.mockResolvedValue(false)
  setMyRsvp.mockResolvedValue()
  setSaved.mockResolvedValue()
})

describe('RsvpButtons', () => {
  it('asks logged-out visitors to log in', () => {
    renderButtons({ loading: false, user: null, profile: null })
    expect(screen.getByRole('link', { name: 'Log in to RSVP' })).toBeVisible()
  })

  it('marks you as going', async () => {
    renderButtons()
    const going = await button('Going')
    expect(going).toHaveAttribute('aria-pressed', 'false')

    fetchMyRsvp.mockResolvedValue('going') // what the reload will find
    fireEvent.click(going)

    // The change shows a moment after the click, before the save finishes.
    await waitFor(() => expect(going).toHaveAttribute('aria-pressed', 'true'))
    expect(setMyRsvp).toHaveBeenCalledWith('user-1', 7, 'going', null)
  })

  it('turns Going off when clicked again', async () => {
    fetchMyRsvp.mockResolvedValue('going')
    renderButtons()
    const going = await button('Going')
    await waitFor(() => expect(going).toHaveAttribute('aria-pressed', 'true'))

    fetchMyRsvp.mockResolvedValue(null)
    fireEvent.click(going)

    await waitFor(() => expect(going).toHaveAttribute('aria-pressed', 'false'))
    expect(setMyRsvp).toHaveBeenCalledWith('user-1', 7, null, 'going')
  })

  it('switches back and explains when the RSVP does not save', async () => {
    setMyRsvp.mockRejectedValue(new Error('offline'))
    renderButtons()
    const interested = await button('Interested')

    fireEvent.click(interested)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your RSVP didn’t save',
    )
    expect(interested).toHaveAttribute('aria-pressed', 'false')
  })

  it('saves the event', async () => {
    renderButtons()
    const save = await button('Save')

    fetchIsSaved.mockResolvedValue(true)
    fireEvent.click(save)

    expect(
      await screen.findByRole('button', { name: 'Saved', pressed: true }),
    ).toBeVisible()
    expect(setSaved).toHaveBeenCalledWith('user-1', 7, true)
  })
})
