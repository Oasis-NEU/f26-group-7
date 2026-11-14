// What a list shows when it has nothing in it yet. `children` is an
// optional next step, usually a ButtonLink.
export default function EmptyState({ title, message, children }) {
  return (
    <div className="border-2 border-dashed border-rule-light px-6 py-10 text-center">
      <p className="text-title font-bold">{title}</p>
      {message && <p className="mx-auto mt-2 max-w-md text-muted">{message}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}
