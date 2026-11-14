import { Link } from 'react-router'

// Shown for any address that doesn't match a page.
export default function NotFound() {
  return (
    <main className="mx-auto max-w-content px-4 py-12 md:px-10">
      <h1 className="text-display font-extrabold text-balance">
        This stop isn’t on the line
      </h1>
      <p className="mt-6 text-lg">The page you’re looking for doesn’t exist.</p>
      <Link
        to="/"
        className="mt-6 inline-block bg-ink px-4 py-3 text-[15px] font-bold text-on-ink"
      >
        Back to events
      </Link>
    </main>
  )
}
