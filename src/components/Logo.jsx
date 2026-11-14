import { Link } from 'react-router'
import { BirdIcon } from './Icons'

// The Espial wordmark and bird. Links home.
export default function Logo() {
  return (
    <Link to="/" className="flex items-end gap-1">
      <span className="text-3xl leading-none font-black tracking-tight">
        Espial
      </span>
      <BirdIcon className="size-7" />
    </Link>
  )
}
