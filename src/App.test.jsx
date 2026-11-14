import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

// Use a fake events module so tests never talk to Supabase.
vi.mock('./lib/events', () => ({
  fetchWeek: () => Promise.resolve([]),
  watchEvents: () => () => {},
}))

// Render the whole app as if the browser were at `path`.
function visit(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

function pageTitle() {
  return screen.getByRole('heading', { level: 1 }).textContent
}

describe('routes', () => {
  it('shows the home page at /', async () => {
    visit('/')
    expect(pageTitle()).toMatch(/Welcome back/)
    expect(await screen.findByText(/No events this week yet/)).toBeVisible()
  })

  it.each([
    ['/explore', 'Explore'],
    ['/events/new', 'Post an event'],
    ['/messages', 'Messages'],
    ['/messages/5', 'Messages'],
    ['/friends', 'Friends'],
    ['/profile', 'Profile'],
    ['/notifications', 'Notifications'],
    ['/settings', 'Settings'],
    ['/admin', 'Admin'],
    ['/welcome', 'Find the small stuff'],
    ['/login', 'Log in'],
    ['/signup', 'Sign up'],
    ['/onboarding', 'Welcome aboard'],
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

describe('header', () => {
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
