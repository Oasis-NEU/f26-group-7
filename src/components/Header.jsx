import { Link, NavLink } from 'react-router'
import { BirdIcon } from './Icons'

const links = [
  { to: '/', label: 'Find events' },
  { to: '/messages', label: 'Messages' },
  { to: '/profile', label: 'Profile' },
]

export default function Header() {
  return (
    <header className="mx-auto max-w-content px-4 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b-4 border-ink pt-6 pb-3">
        <Link to="/" className="flex items-end gap-1">
          <span className="text-3xl leading-none font-black tracking-tight">
            Espial
          </span>
          <BirdIcon className="size-7" />
        </Link>

        <nav className="flex gap-6 text-[15px] font-semibold">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'underline decoration-2 underline-offset-8' : ''
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}