import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import NarrowPage from '../components/NarrowPage'
import { Button } from '../components/ui/Button'
import FormError from '../components/ui/FormError'
import TextField from '../components/ui/TextField'
import { logIn } from '../lib/auth'
import { emailProblem } from '../lib/validate'

export default function Login() {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [problems, setProblems] = useState({})
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const found = {
      email: emailProblem(email),
      password: password ? null : 'Enter your password.',
    }
    setProblems(found)
    if (Object.values(found).some(Boolean)) return

    setBusy(true)
    setFormError(null)
    try {
      // Once you're logged in, the page moves on by itself to wherever
      // you were going.
      await logIn({ email, password })
    } catch (error) {
      setFormError(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <NarrowPage title="Log in">
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <FormError>{formError}</FormError>
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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={problems.password}
        />
        <Button type="submit" disabled={busy} className="justify-self-start">
          {busy ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="mt-8">
        New here?{' '}
        <Link
          to="/signup"
          state={location.state}
          className="font-bold underline underline-offset-4"
        >
          Make an account
        </Link>
      </p>
    </NarrowPage>
  )
}
