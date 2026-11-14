// The layout for form pages (log in, sign up, onboarding, settings):
// a big title and a narrow column, so lines and fields aren't too wide.
export default function NarrowPage({ title, intro, children }) {
  return (
    <main className="mx-auto max-w-content px-4 py-12 md:px-10">
      <div className="max-w-lg">
        <h1 className="text-display font-extrabold text-balance">{title}</h1>
        {intro && <p className="mt-6 text-lg">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  )
}
