import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/useAuth'

// Pages that need an account. Logged out: go to Login, which sends you
// back here afterward. Use as a layout route: <Route element={<RequireAuth />}>
export function RequireAuth() {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  return <Outlet />
}

// Logged in but not set up yet: finish onboarding first.
export function RequireOnboarded() {
  const { loading, user, profile } = useAuth()

  if (loading) return null
  if (user && !profile?.onboardedAt) {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}

// Login and Signup: already logged in, so carry on to where you were going.
export function RequireLoggedOut() {
  const { loading, user } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />
  return <Outlet />
}
