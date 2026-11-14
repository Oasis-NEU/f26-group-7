import { Link } from 'react-router'
import { ButtonLink } from '../components/ui/Button'
import { useAuth } from '../lib/useAuth'

export default function Welcome() {
  const { user } = useAuth()

  return (
    <main className="mx-auto max-w-content px-4 py-12 md:px-10">
      <h1 className="max-w-4xl text-display font-extrabold text-balance">
        Find the small stuff
      </h1>
      <p className="mt-6 max-w-2xl text-lg">
        Record swaps, thrift pop-ups, basement shows and free museum hours
        around Fenway and downtown, each with the nearest T stop. See what your
        friends are going to and make plans together.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {user ? (
          <ButtonLink to="/">Go to your feed</ButtonLink>
        ) : (
          <>
            <ButtonLink to="/signup">Sign up</ButtonLink>
            <ButtonLink to="/login" variant="outline">
              Log in
            </ButtonLink>
          </>
        )}
      </div>

      {!user && (
        <p className="mt-6">
          Or{' '}
          <Link to="/" className="font-bold underline underline-offset-4">
            just browse this week
          </Link>
          . No account needed.
        </p>
      )}
    </main>
  )
}
