import { useState } from 'react'
import Avatar from '../components/ui/Avatar'
import { Button, ButtonLink } from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import FormError from '../components/ui/FormError'
import { logOut } from '../lib/auth'
import { useAuth } from '../lib/useAuth'

// Your own profile. Other people's profiles (/u/:username) come with
// friends.
export default function Profile() {
  const { profile } = useAuth()
  const [error, setError] = useState(null)

  async function handleLogOut() {
    try {
      // Once you're logged out, this page sends you to Log in by itself.
      await logOut()
    } catch (problem) {
      setError(problem.message)
    }
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-content px-4 py-12 md:px-10">
        <p className="text-lg">Your profile didn’t load. Try refreshing.</p>
      </main>
    )
  }

  const name = profile.displayName || profile.username

  return (
    <main className="mx-auto max-w-content px-4 py-12 md:px-10">
      <div className="flex flex-wrap items-end gap-6">
        <Avatar name={name} src={profile.avatarUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="text-display font-extrabold text-balance">{name}</h1>
          <p className="mt-2 text-lg">
            @{profile.username}
            {profile.school && `, ${profile.school}`}
          </p>
        </div>
      </div>

      {profile.bio && <p className="mt-6 max-w-2xl text-lg">{profile.bio}</p>}

      {profile.favoriteNiches.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Favorite niches">
          {profile.favoriteNiches.map((niche) => (
            <li
              key={niche}
              className="border-2 border-ink px-2.5 py-1 text-sm font-bold"
            >
              {niche}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/settings">Edit profile</ButtonLink>
        <Button variant="outline" onClick={handleLogOut}>
          Log out
        </Button>
      </div>
      <div className="mt-4 max-w-md">
        <FormError>{error}</FormError>
      </div>

      <section className="mt-12 border-t-2 border-ink pt-6">
        <h2 className="mb-5 text-title font-extrabold">Your upcoming events</h2>
        <EmptyState
          title="Nothing yet"
          message="Events you RSVP to will show up here."
        >
          <ButtonLink to="/">Find events</ButtonLink>
        </EmptyState>
      </section>
    </main>
  )
}
