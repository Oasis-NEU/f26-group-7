import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import NarrowPage from '../components/NarrowPage'
import NichePicker from '../components/NichePicker'
import { Button } from '../components/ui/Button'
import FormError from '../components/ui/FormError'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import { isUsernameTaken, updateMyProfile } from '../lib/profiles'
import { SCHOOL_OPTIONS } from '../lib/schools'
import { STOP_OPTIONS, findStop } from '../lib/stops'
import { useAuth } from '../lib/useAuth'
import {
  cleanUsername,
  displayNameProblem,
  usernameProblem,
} from '../lib/validate'

const STEPS = ['Your name', 'What you like', 'Where you start']

// Three squares, filled in as you go, like stations along a line.
function Progress({ step }) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-sm font-bold">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>
      <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
        {STEPS.map((name, index) => (
          <span
            key={name}
            className={`h-2 ${index <= step ? 'bg-ink' : 'bg-rule-light'}`}
          />
        ))}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [niches, setNiches] = useState(profile?.favoriteNiches ?? [])
  const [homeStop, setHomeStop] = useState(profile?.homeStop ?? '')
  const [school, setSchool] = useState(profile?.school ?? '')
  const [problems, setProblems] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Already set up: nothing to do here.
  if (profile?.onboardedAt) return <Navigate to="/" replace />

  async function finishNameStep() {
    const name = cleanUsername(username)
    setUsername(name)
    const found = {
      displayName: displayNameProblem(displayName),
      username: usernameProblem(name),
    }
    if (!found.username && (await isUsernameTaken(name, user.id))) {
      found.username = 'That username is taken.'
    }
    setProblems(found)
    if (!found.displayName && !found.username) setStep(1)
  }

  function finishNicheStep() {
    if (niches.length === 0) {
      setProblems({ niches: 'Pick at least one. You can change these later.' })
      return
    }
    setProblems({})
    setStep(2)
  }

  async function finish() {
    setBusy(true)
    setFormError(null)
    try {
      await updateMyProfile(user.id, {
        displayName: displayName.trim(),
        username,
        favoriteNiches: niches,
        homeStop,
        homeNeighborhood: findStop(homeStop)?.area ?? null,
        school,
        onboardedAt: new Date().toISOString(),
      })
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (error) {
      // Someone may have taken the username in the meantime.
      if (/username/i.test(error.message)) {
        setProblems({ username: error.message })
        setStep(0)
      } else {
        setFormError('Your profile didn’t save. Try again.')
      }
      setBusy(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError(null)
    try {
      if (step === 0) await finishNameStep()
      else if (step === 1) finishNicheStep()
      else await finish()
    } catch (error) {
      console.error(error)
      setFormError('Something went wrong. Try again.')
    }
  }

  return (
    <NarrowPage title="Welcome aboard">
      <Progress step={step} />

      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <FormError>{formError}</FormError>

        {step === 0 && (
          <>
            <TextField
              label="Your name"
              hint="What people see on your profile."
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              error={problems.displayName}
            />
            <TextField
              label="Username"
              hint="3 to 20 lowercase letters, numbers or _. Friends find you by this."
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              error={problems.username}
            />
          </>
        )}

        {step === 1 && (
          <NichePicker
            label="What are you into? Pick as many as you like."
            selected={niches}
            onChange={setNiches}
            error={problems.niches}
          />
        )}

        {step === 2 && (
          <>
            <Select
              label="Your home T stop"
              hint="Where you usually start from. Only you can see this."
              options={STOP_OPTIONS}
              value={homeStop}
              onChange={(event) => setHomeStop(event.target.value)}
            />
            <Select
              label="School"
              options={SCHOOL_OPTIONS}
              value={school}
              onChange={(event) => setSchool(event.target.value)}
            />
          </>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setProblems({})
                setStep(step - 1)
              }}
            >
              Back
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {step < 2 ? 'Next' : busy ? 'Saving…' : 'Finish'}
          </Button>
        </div>
      </form>
    </NarrowPage>
  )
}
