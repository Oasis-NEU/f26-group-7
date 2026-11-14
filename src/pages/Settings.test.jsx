import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateMyProfile, uploadAvatar, isUsernameTaken } from '../lib/profiles'
import { AuthContext } from '../lib/useAuth'
import Settings from './Settings'

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../lib/auth', () => ({ logOut: vi.fn() }))

// Fake the profile functions that talk to Supabase; keep the real photo
// check.
vi.mock('../lib/profiles', async (importOriginal) => ({
  ...(await importOriginal()),
  isUsernameTaken: vi.fn(),
  updateMyProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
}))

const auth = {
  loading: false,
  user: { id: 'user-1', email: 'jordan@example.com' },
  profile: {
    id: 'user-1',
    username: 'jordan',
    displayName: 'Jordan Lee',
    avatarUrl: null,
    bio: null,
    school: 'Northeastern',
    favoriteNiches: ['Records'],
    homeStop: 'Symphony',
    privacy: 'friends',
    onboardedAt: new Date(),
  },
  refreshProfile: vi.fn(),
}

function renderSettings() {
  render(
    <AuthContext.Provider value={auth}>
      <Settings />
    </AuthContext.Provider>,
  )
}

function type(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

beforeEach(() => {
  vi.clearAllMocks()
  isUsernameTaken.mockResolvedValue(false)
  updateMyProfile.mockResolvedValue()
})

describe('Settings', () => {
  it('starts with your current profile', () => {
    renderSettings()
    expect(screen.getByLabelText('Your name')).toHaveValue('Jordan Lee')
    expect(screen.getByLabelText('Username')).toHaveValue('jordan')
    expect(screen.getByLabelText('School')).toHaveValue('Northeastern')
    expect(screen.getByText('jordan@example.com')).toBeVisible()
  })

  it('saves your changes', async () => {
    renderSettings()
    type('Bio', '  Record nerd. ')
    type('Your home T stop', 'Chinatown')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved.')).toBeVisible()
    expect(updateMyProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        bio: 'Record nerd.',
        homeStop: 'Chinatown',
        homeNeighborhood: 'Chinatown',
      }),
    )
    expect(auth.refreshProfile).toHaveBeenCalled()
  })

  it('explains a bad username without saving', () => {
    renderSettings()
    type('Username', 'j')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(screen.getByText(/at least 3 characters/)).toBeVisible()
    expect(updateMyProfile).not.toHaveBeenCalled()
  })

  it('says when a new username is taken', async () => {
    isUsernameTaken.mockResolvedValue(true)
    renderSettings()
    type('Username', 'sam')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('That username is taken.')).toBeVisible()
    expect(updateMyProfile).not.toHaveBeenCalled()
  })

  it('refuses photos over 2 MB before uploading', () => {
    renderSettings()
    const photo = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(photo, 'size', { value: 3 * 1024 * 1024 })
    fireEvent.change(screen.getByLabelText('Upload a photo'), {
      target: { files: [photo] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(/2 MB/)
    expect(uploadAvatar).not.toHaveBeenCalled()
  })
})
