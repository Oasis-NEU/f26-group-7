import { Outlet } from 'react-router'
import Logo from '../components/Logo'
import TStripe from '../components/TStripe'

// A quieter frame for logging in, signing up and onboarding: just the
// logo, no nav, so the form is the only thing to do.
export default function AuthLayout() {
  return (
    <>
      <TStripe />
      <header className="mx-auto max-w-content px-4 md:px-10">
        <div className="border-b-4 border-ink pt-6 pb-3">
          <Logo />
        </div>
      </header>
      <Outlet />
    </>
  )
}
