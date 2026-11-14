import { NavLink } from 'react-router'
import { BellIcon, UserIcon } from './Icons'
import Logo from './Logo'

const links = [
  { to: '/', label: 'Feed' },
  { to: '/explore', label: 'Explore' },
  { to: '/messages', label: 'Messages' },
  { to: '/friends', label: 'Friends' },
]

// Icon-only links need a label for screen readers.
const iconLinks = [
  { to: '/notifications', label: 'Notifications', Icon: BellIcon },
  { to: '/profile', label: 'Profile', Icon: UserIcon },
]

export default function Header() {
  return (
    <header className="mx-auto max-w-content px-4 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b-4 border-ink pt-6 pb-3">
        <Logo />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <nav className="flex gap-6 text-[15px] font-semibold">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                // Without `end`, "/" would count as active on every page.
                end={link.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'underline decoration-2 underline-offset-8' : ''
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex gap-1">
            {iconLinks.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                title={label}
                className={({ isActive }) =>
                  `grid size-9 place-items-center ${isActive ? 'bg-ink text-on-ink' : ''}`
                }
              >
                <Icon className="size-5" />
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
