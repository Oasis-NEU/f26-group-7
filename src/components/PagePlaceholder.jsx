// Stands in for a page that hasn't been built yet. `step` is the
// roadmap step that builds it.
export default function PagePlaceholder({ title, description, step }) {
  return (
    <main className="mx-auto max-w-content px-4 py-12 md:px-10">
      <h1 className="text-display font-extrabold text-balance">{title}</h1>
      <p className="mt-6 max-w-2xl text-lg">{description}</p>
      {step && (
        <p className="mt-4 text-sm font-bold text-muted">
          Coming in step {step}.
        </p>
      )}
    </main>
  )
}
