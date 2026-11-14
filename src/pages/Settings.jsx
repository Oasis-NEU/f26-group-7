import { useState } from 'react'
import NarrowPage from '../components/NarrowPage'
import NichePicker from '../components/NichePicker'
import Avatar from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import FormError from '../components/ui/FormError'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import { logOut } from '../lib/auth'
import {
  isUsernameTaken,
  photoProblem,
  removeAvatar,
  updateMyProfile,
  uploadAvatar,
} from '../lib/profiles'
import { SCHOOL_OPTIONS } from '../lib/schools'
import { STOP_OPTIONS, findStop } from '../lib/stops'
import { useAuth } from '../lib/useAuth'
import {
  bioProblem,
  cleanUsername,
  displayNameProblem,
  usernameProblem,
} from '../lib/validate'

const PRIVACY_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends only' },
  { value: 'only_me', label: 'Only me' },
]

function Section({ title, children }) {
  return (
    <section className="grid gap-5 border-t-2 border-ink pt-6 pb-10">
      <h2 className="text-title font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

// The photo saves as soon as you pick one; everything else saves with
// the Save button.
function PhotoSection({ user, profile, refreshProfile }) {
  const [problem, setProblem] = useState(null)
  const [busy, setBusy] = useState(false)
  const name = profile.displayName || profile.username

  async function handlePick(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // so picking the same file again still works
    if (!file) return

    const found = photoProblem(file)
    setProblem(found)
    if (found) return

    setBusy(true)
    try {
      const avatarUrl = await uploadAvatar(user.id, file)
      await updateMyProfile(user.id, { avatarUrl })
      await refreshProfile()
    } catch (error) {
      console.error(error)
      setProblem('The photo didn’t upload. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    setProblem(null)
    try {
      await removeAvatar(user.id)
      await updateMyProfile(user.id, { avatarUrl: null })
      await refreshProfile()
    } catch (error) {
      console.error(error)
      setProblem('The photo didn’t come off. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Photo">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={name} src={profile.avatarUrl} size="lg" />
        <div className="flex flex-wrap gap-3">
          {/* A real file input, hidden but still reachable by keyboard,
              inside a label that looks like a button. */}
          <label className="inline-flex cursor-pointer items-center border-2 border-ink bg-ink px-4 py-3 text-[15px] font-bold text-on-ink focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-alert">
            {busy ? 'Working…' : 'Upload a photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={handlePick}
              disabled={busy}
            />
          </label>
          {profile.avatarUrl && (
            <Button variant="outline" onClick={handleRemove} disabled={busy}>
              Remove photo
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted">JPG, PNG, WebP or GIF, up to 2 MB.</p>
      <FormError>{problem}</FormError>
    </Section>
  )
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [school, setSchool] = useState(profile?.school ?? '')
  const [niches, setNiches] = useState(profile?.favoriteNiches ?? [])
  const [homeStop, setHomeStop] = useState(profile?.homeStop ?? '')
  const [privacy, setPrivacy] = useState(profile?.privacy ?? 'friends')

  const [problems, setProblems] = useState({})
  const [formError, setFormError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!profile) {
    return (
      <NarrowPage title="Settings">
        <p className="text-lg">Your profile didn’t load. Try refreshing.</p>
      </NarrowPage>
    )
  }

  // Any edit hides the old "Saved." message.
  function edit(setter) {
    return (value) => {
      setter(value)
      setSaved(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError(null)
    setSaved(false)

    const name = cleanUsername(username)
    setUsername(name)
    const found = {
      displayName: displayNameProblem(displayName),
      username: usernameProblem(name),
      bio: bioProblem(bio),
      niches: niches.length ? null : 'Pick at least one.',
    }
    setProblems(found)
    if (Object.values(found).some(Boolean)) return

    setBusy(true)
    try {
      if (name !== profile.username && (await isUsernameTaken(name, user.id))) {
        setProblems({ username: 'That username is taken.' })
        return
      }
      await updateMyProfile(user.id, {
        displayName: displayName.trim(),
        username: name,
        bio: bio.trim(),
        school,
        favoriteNiches: niches,
        homeStop,
        homeNeighborhood: findStop(homeStop)?.area ?? null,
        privacy,
      })
      await refreshProfile()
      setSaved(true)
    } catch (error) {
      if (/username/i.test(error.message)) {
        setProblems({ username: error.message })
      } else {
        console.error(error)
        setFormError('Your changes didn’t save. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleLogOut() {
    try {
      await logOut()
    } catch (error) {
      setFormError(error.message)
    }
  }

  return (
    <NarrowPage title="Settings">
      <PhotoSection
        user={user}
        profile={profile}
        refreshProfile={refreshProfile}
      />

      <form onSubmit={handleSubmit} noValidate>
        <Section title="Profile">
          <TextField
            label="Your name"
            autoComplete="name"
            value={displayName}
            onChange={(event) => edit(setDisplayName)(event.target.value)}
            error={problems.displayName}
          />
          <TextField
            label="Username"
            hint="3 to 20 lowercase letters, numbers or _."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            value={username}
            onChange={(event) => edit(setUsername)(event.target.value)}
            error={problems.username}
          />
          <TextField
            label="Bio"
            multiline
            hint={`${bio.length} of 300 characters.`}
            value={bio}
            onChange={(event) => edit(setBio)(event.target.value)}
            error={problems.bio}
          />
          <Select
            label="School"
            options={SCHOOL_OPTIONS}
            value={school}
            onChange={(event) => edit(setSchool)(event.target.value)}
          />
        </Section>

        <Section title="Preferences">
          <NichePicker
            label="Favorite niches"
            selected={niches}
            onChange={edit(setNiches)}
            error={problems.niches}
          />
          <Select
            label="Your home T stop"
            hint="Only you can see this."
            options={STOP_OPTIONS}
            value={homeStop}
            onChange={(event) => edit(setHomeStop)(event.target.value)}
          />
        </Section>

        <Section title="Privacy">
          <Select
            label="Who can see which events you’re going to"
            hint="This starts to matter once you add friends."
            options={PRIVACY_OPTIONS}
            value={privacy}
            onChange={(event) => edit(setPrivacy)(event.target.value)}
          />
        </Section>

        <div className="grid gap-4">
          <FormError>{formError}</FormError>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </Button>
            <p role="status" className="font-bold">
              {saved ? 'Saved.' : ''}
            </p>
          </div>
        </div>
      </form>

      <Section title="Account">
        <p>
          Logged in as <span className="font-bold">{user.email}</span>
        </p>
        <Button
          variant="outline"
          onClick={handleLogOut}
          className="justify-self-start"
        >
          Log out
        </Button>
      </Section>
    </NarrowPage>
  )
}
