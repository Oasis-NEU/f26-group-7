import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { searchEvents } from './lib/events'
import { fetchMyUpcoming } from './lib/myEvents'
import { AuthContext } from './lib/useAuth'

// Fake Supabase and events, so tests never use the network. There are
// no events, so every event page is "not on the schedule".
vi.mock('./lib/supabase', () => ({ supabase: {} }))
vi.mock('./lib/events', () => ({
  SEARCH_LIMIT: 200,
  searchEvents: vi.fn(() => Promise.resolve({ events: [], capped: false })),
  fetchEvent: () => Promise.resolve(null),
  watchEvents: () => () => {},
}))
// The test browser can't draw maps (no WebGL), so a stand-in that says
// how many events it was given.
vi.mock('./components/EventMap', () => ({
  default: ({ events }) => (
    <div role="region" aria-label="Map of events">
      {events.length} pins
    </div>
  ),
}))
vi.mock('./lib/myEvents', () => ({
  fetchMyUpcoming: vi.fn(() =>
    Promise.resolve({ going: [], interested: [], saved: [] }),
  ),
}))

const LOGGED_OUT = { loading: false, user: null, profile: null }

const profile = {
  id: 'user-1',
  username: 'jordan',
  displayName: 'Jordan Lee',
  avatarUrl: null,
  bio: null,
  school: 'Northeastern',
  favoriteNiches: ['Records'],
  homeStop: 'Symphony',
  privacy: 'friends',
  role: 'user',
  onboardedAt: new Date('2026-11-14T12:00:00'),
}

const LOGGED_IN = {
  loading: false,
  user: { id: 'user-1' },
  profile,
  refreshProfile: async () => {},
}

const NOT_ONBOARDED = {
  ...LOGGED_IN,
  profile: { ...profile, username: null, onboardedAt: null },
}

// Render the whole app as if the browser were at `path`, as someone in
// the given login state.
function visit(path, auth = LOGGED_OUT) {
  // A fresh cache for each test, so one test's data can't leak into another.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function pageTitle() {
  return screen.getByRole('heading', { level: 1 }).textContent
}

describe('pages anyone can see', () => {
  it('shows the home page at /', async () => {
    visit('/')
    expect(pageTitle()).toBe('Find the small stuff')
    expect(await screen.findByText(/No events this week yet/)).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(
      '0 small things happening around Fenway and downtown this week.',
    )
  })

  it('searches with the filters in the address', async () => {
    visit('/?q=vinyl&when=weekend&niche=Records')
    expect(
      await screen.findByText('0 results for “vinyl” this weekend.'),
    ).toBeVisible()
    expect(searchEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: 'vinyl',
        when: 'weekend',
        niches: ['Records'],
      }),
    )
    expect(screen.getByRole('button', { name: 'Records' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows a map on Home that opens Explore with the same filters', async () => {
    visit('/?q=vinyl&when=weekend')
    expect(
      await screen.findByRole('region', { name: 'Map of events' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Open the full map' }),
    ).toHaveAttribute('href', '/explore?q=vinyl&when=weekend')
  })

  it('offers to clear filters when nothing matches', async () => {
    visit('/?price=free')
    expect(
      await screen.findByText('Nothing matches these filters'),
    ).toBeVisible()
    expect(
      screen.getAllByRole('button', { name: 'Clear filters' }).length,
    ).toBeGreaterThan(0)
  })

  it.each([
    ['/explore', 'Explore'],
    ['/welcome', 'Find the small stuff'],
    ['/login', 'Log in'],
    ['/signup', 'Sign up'],
  ])('shows the right page at %s', (path, title) => {
    visit(path)
    expect(pageTitle()).toBe(title)
  })

  it('shows the event page for an event address', async () => {
    visit('/events/12')
    expect(
      await screen.findByRole('heading', {
        name: 'This event isn’t on the schedule',
      }),
    ).toBeVisible()
  })

  it('reads a username out of the address', () => {
    visit('/u/aidan')
    expect(pageTitle()).toBe('@aidan')
  })

  it('shows the not-found page for unknown addresses', () => {
    visit('/no-such-page')
    expect(pageTitle()).toMatch(/isn’t on the line/)
  })
})

describe('pages that need an account', () => {
  it.each([
    '/messages',
    '/friends',
    '/profile',
    '/notifications',
    '/settings',
    '/events/new',
    '/admin',
    '/onboarding',
  ])('sends logged-out visitors from %s to Log in', (path) => {
    visit(path)
    expect(pageTitle()).toBe('Log in')
  })

  it.each([
    ['/messages', 'Messages'],
    ['/messages/5', 'Messages'],
    ['/friends', 'Friends'],
    ['/profile', 'Jordan Lee'],
    ['/notifications', 'Notifications'],
    ['/settings', 'Settings'],
    ['/events/new', 'Post an event'],
    ['/admin', 'Admin'],
  ])('shows %s when logged in', (path, title) => {
    visit(path, LOGGED_IN)
    expect(pageTitle()).toBe(title)
  })

  it('lists your upcoming events on your profile', async () => {
    const start = new Date(Date.now() + 86_400_000)
    fetchMyUpcoming.mockResolvedValueOnce({
      going: [
        {
          id: 7,
          title: 'Knit and sip',
          start,
          end: new Date(start.getTime() + 7_200_000),
          change: null,
          line: 'GL D',
          stop: 'Longwood',
        },
      ],
      interested: [],
      saved: [],
    })
    visit('/profile', LOGGED_IN)

    expect(await screen.findByText('Going (1)')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Knit and sip' })).toHaveAttribute(
      'href',
      '/events/7',
    )
  })

  it('suggests finding events when your profile has none', async () => {
    visit('/profile', LOGGED_IN)
    expect(await screen.findByText('Nothing yet')).toBeVisible()
  })

  it('welcomes you back by first name', () => {
    visit('/', LOGGED_IN)
    expect(pageTitle()).toBe('Welcome back, Jordan')
  })

  describe('For you', () => {
    // Only searches by niche find this Records event near Symphony, so a
    // plain Home search stays empty and the card can only be For you.
    const start = new Date(Date.now() + 86_400_000)
    const nearby = {
      id: 9,
      title: 'Crate digging night',
      niche: 'Records',
      start,
      end: new Date(start.getTime() + 7_200_000),
      change: null,
      location: { lat: 42.341512, lng: -71.083423 },
      line: 'GL E',
      stop: 'Symphony',
    }

    function findByNiche() {
      searchEvents.mockImplementation((filters) =>
        Promise.resolve({
          events: filters.niches.length ? [nearby] : [],
          capped: false,
        }),
      )
    }

    afterEach(() => {
      searchEvents.mockImplementation(() =>
        Promise.resolve({ events: [], capped: false }),
      )
    })

    it('shows events in your niches, with the walk from your stop', async () => {
      findByNiche()
      visit('/', LOGGED_IN)

      expect(
        await screen.findByRole('heading', { name: 'For you' }),
      ).toBeVisible()
      expect(
        screen.getByRole('link', { name: 'Crate digging night' }),
      ).toHaveAttribute('href', '/events/9')
      expect(screen.getByText(/-min walk from Symphony/)).toBeVisible()
      expect(searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ niches: ['Records'], when: 'week' }),
      )
    })

    it('is hidden when logged out', async () => {
      findByNiche()
      visit('/')
      await screen.findByText(/No events this week yet/)
      expect(screen.queryByRole('heading', { name: 'For you' })).toBeNull()
    })

    it('is hidden while filters are on', async () => {
      findByNiche()
      visit('/?when=today', LOGGED_IN)
      await screen.findByText('Nothing matches these filters')
      expect(screen.queryByRole('heading', { name: 'For you' })).toBeNull()
    })
  })

  it('sends logged-in people away from Log in and Sign up', () => {
    visit('/login', LOGGED_IN)
    expect(pageTitle()).toBe('Welcome back, Jordan')
  })
})

describe('onboarding', () => {
  it('comes first for people who have not finished it', () => {
    visit('/', NOT_ONBOARDED)
    expect(pageTitle()).toBe('Welcome aboard')
  })

  it('also comes first on public pages', () => {
    visit('/explore', NOT_ONBOARDED)
    expect(pageTitle()).toBe('Welcome aboard')
  })

  it('is skipped once finished', () => {
    visit('/onboarding', LOGGED_IN)
    expect(pageTitle()).toBe('Welcome back, Jordan')
  })
})

describe('header', () => {
  it('shows Log in and Sign up, not account pages, when logged out', () => {
    visit('/explore')
    expect(screen.getByRole('link', { name: 'Log in' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Messages' })).toBeNull()
  })

  it('shows account pages and your avatar when logged in', () => {
    visit('/explore', LOGGED_IN)
    expect(screen.getByRole('link', { name: 'Messages' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Your profile' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
  })

  it('only marks Feed as current on the home page', () => {
    visit('/explore')
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Feed' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('hides the nav on login and signup screens', () => {
    visit('/login')
    expect(screen.queryByRole('link', { name: 'Explore' })).toBeNull()
  })
})
