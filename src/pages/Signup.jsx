import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import NarrowPage from '../components/NarrowPage'
import { Button } from '../components/ui/Button'
import FormError from '../components/ui/FormError'
import TextField from '../components/ui/TextField'
import { signUp } from '../lib/auth'
import {
  MIN_PASSWORD_LENGTH,
  displayNameProblem,
  emailProblem,
  passwordProblem,
} from '../lib/validate'

export default function Signup() {
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problems, setProblems] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const found = {
      name: displayNameProblem(name),
      email: emailProblem(email),
      password: passwordProblem(password),
    }
    setProblems(found)
    if (Object.values(found).some(Boolean)) return

    setBusy(true)
    setFormError(null)
    try {
      const { session } = await signUp({ name, email, password })
      // With a session, you're logged in and the page moves on by itself.
      // Without one, Supabase wants the email confirmed first.
      if (!session) setCheckEmail(true)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (checkEmail) {
    return (
      <NarrowPage
        title="Check your email"
        intro={`We sent a link to ${email.trim()}. Click it to finish making your account.`}
      />
    )
  }

  return (
    <NarrowPage
      title="Sign up"
      intro="Save events, see what friends are going to and make plans."
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <FormError>{formError}</FormError>
        <TextField
          label="Your name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={problems.name}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={problems.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={problems.password}
        />
        <Button type="submit" disabled={busy} className="justify-self-start">
          {busy ? 'Making your account…' : 'Sign up'}
        </Button>
      </form>

      <p className="mt-8">
        Already have an account?{' '}
        <Link
          to="/login"
          state={location.state}
          className="font-bold underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </NarrowPage>
  )
}
