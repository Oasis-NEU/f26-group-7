import { initials } from '../../lib/names'

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-20 text-2xl',
}

// A profile photo, or initials when there isn't one. Square on purpose:
// the timetable's station dot is the only round shape on the site.
export default function Avatar({ name, src, size = 'md' }) {
  const box = `${SIZES[size]} shrink-0 border-2 border-ink`

  if (src) {
    return <img src={src} alt={name} className={`${box} object-cover`} />
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`${box} grid place-items-center bg-ink font-bold text-on-ink`}
    >
      {initials(name) || '?'}
    </span>
  )
}
