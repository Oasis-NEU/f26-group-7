import { Link, NavLink } from 'react-router'
import { useAuth } from '../lib/useAuth'
import { BellIcon } from './Icons'
import Logo from './Logo'
import Avatar from './ui/Avatar'

const PUBLIC_LINKS = [
  { to: '/', label: 'Feed' },
  { to: '/explore', label: 'Explore' },
]

const ACCOUNT_LINKS = [
  { to: '/messages', label: 'Messages' },
  { to: '/friends', label: 'Friends' },
]

function underlineWhenActive({ isActive }) {
  return isActive ? 'underline decoration-2 underline-offset-8' : ''
}

// Logged in: your pages, the bell and your avatar. Logged out: log in and
// sign up. While it's still checking, the account side stays empty, so it
// doesn't flash "Log in" at someone who is logged in.
function AccountArea() {
  const { loading, user, profile } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <div className="flex items-center gap-4 text-[15px] font-semibold">
        <Link to="/login">Log in</Link>
        <Link
          to="/signup"
          className="border-2 border-ink bg-ink px-3 py-1.5 font-bold text-on-ink"
        >
          Sign up
        </Link>
      </div>
    )
  }

  const name = profile?.displayName || profile?.username || 'You'
  return (
    <div className="flex items-center gap-2">
      <NavLink
        to="/notifications"
        aria-label="Notifications"
        title="Notifications"
        className={({ isActive }) =>
          `grid size-9 place-items-center ${isActive ? 'bg-ink text-on-ink' : ''}`
        }
      >
        <BellIcon className="size-5" />
      </NavLink>
      <Link to="/profile" aria-label="Your profile" title="Your profile">
        <Avatar name={name} src={profile?.avatarUrl} size="sm" />
      </Link>
    </div>
  )
}

export default function Header() {
  const { user } = useAuth()
  const links = user ? [...PUBLIC_LINKS, ...ACCOUNT_LINKS] : PUBLIC_LINKS

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
                className={underlineWhenActive}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <AccountArea />
        </div>
      </div>
    </header>
  )
}
