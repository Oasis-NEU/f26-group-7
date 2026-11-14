import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthContext } from './lib/useAuth'

// Fake Supabase and events, so tests never use the network.
vi.mock('./lib/supabase', () => ({ supabase: {} }))
vi.mock('./lib/events', () => ({
  fetchWeek: () => Promise.resolve([]),
  watchEvents: () => () => {},
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
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>,
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

  it('reads values out of the address', () => {
    visit('/events/12')
    expect(pageTitle()).toBe('Event 12')
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

  it('welcomes you back by first name', () => {
    visit('/', LOGGED_IN)
    expect(pageTitle()).toBe('Welcome back, Jordan')
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
