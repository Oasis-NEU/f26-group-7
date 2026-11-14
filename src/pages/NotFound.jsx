import { ButtonLink } from '../components/ui/Button'

// Shown for any address that doesn't match a page.
export default function NotFound() {
  return (
    <main className="mx-auto max-w-content px-4 py-12 md:px-10">
      <h1 className="text-display font-extrabold text-balance">
        This stop isn’t on the line
      </h1>
      <p className="mt-6 text-lg">The page you’re looking for doesn’t exist.</p>
      <ButtonLink to="/" className="mt-6">
        Back to events
      </ButtonLink>
    </main>
  )
}
