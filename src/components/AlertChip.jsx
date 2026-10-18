import { changeMessage } from '../lib/status'
import { WarningIcon } from './Icons'

// The yellow chip for a changed plan, worded like a T service alert.
export default function AlertChip({ change }) {
  return (
    <p className="mt-2 inline-flex items-center gap-2 bg-alert px-2.5 py-1 text-[13px] font-bold text-coal">
      <WarningIcon className="size-3.5 shrink-0" />
      {changeMessage(change)}
    </p>
  )
}
