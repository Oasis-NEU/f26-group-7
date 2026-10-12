import { LINES } from '../lib/lines'

// A small rectangle in the line's color: GL B, RL, OL...
export default function LineBadge({ line }) {
  return (
    <span
      className={`inline-flex h-6 min-w-11 shrink-0 items-center justify-center border-2 border-badge-ring px-1.5 text-xs font-bold ${LINES[line]}`}
    >
      {line}
    </span>
  )
}