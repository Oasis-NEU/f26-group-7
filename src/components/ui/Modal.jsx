import { useEffect, useId, useRef } from 'react'

// A pop-up dialog. It uses the browser's own <dialog>, which already
// handles the Escape key and keeps keyboard focus inside while it's open.
// The page owns `open`; `onClose` runs however the dialog was closed.
export default function Modal({ open, onClose, title, children }) {
  const dialog = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto w-[min(32rem,calc(100%-2rem))] border-2 border-ink bg-paper p-6 text-ink backdrop:bg-coal/70"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-title font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-2 px-2 text-2xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </dialog>
  )
}
