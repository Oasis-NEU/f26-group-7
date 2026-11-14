import { useId } from 'react'

// Shared by TextField and Select: a label above, then the control, then
// a hint or an error below. The ids tie them together, so clicking the
// label focuses the control and screen readers read the hint.
export function Field({ label, hint, error, children }) {
  const id = useId()
  const noteId = `${id}-note`
  const note = error || hint

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': note ? noteId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {note && (
        <p
          id={noteId}
          className={`text-sm ${error ? 'font-bold text-alert' : 'text-muted'}`}
        >
          {note}
        </p>
      )}
    </div>
  )
}

export const CONTROL =
  'w-full border-2 border-ink bg-paper px-3 py-2.5 text-[15px] text-ink placeholder:text-muted aria-invalid:border-alert'
