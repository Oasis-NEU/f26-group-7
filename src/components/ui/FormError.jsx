import { WarningIcon } from '../Icons'

// A problem with the whole form ("That email and password don't match"),
// in the same yellow as alert chips. role="alert" makes screen readers
// announce it as soon as it appears.
export default function FormError({ children }) {
  if (!children) return null
  return (
    <p
      role="alert"
      className="flex items-start gap-2 bg-alert px-3 py-2.5 text-[15px] font-bold text-coal"
    >
      <WarningIcon className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  )
}
