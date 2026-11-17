import { useLocation } from 'react-router'
import { useAuth } from '../lib/useAuth'
import { useRsvp, useSaved } from '../lib/useMyEvents'
import { BookmarkIcon, CheckIcon } from './Icons'
import { Button, ButtonLink } from './ui/Button'
import FormError from './ui/FormError'

// A button that stays pressed: solid when on, outline when off.
function Toggle({ on, onClick, disabled, icon, children }) {
  return (
    <Button
      variant={on ? 'solid' : 'outline'}
      aria-pressed={on}
      onClick={onClick}
      disabled={disabled}
    >
      {on && icon}
      {children}
    </Button>
  )
}

function Choices({ eventId }) {
  const rsvp = useRsvp(eventId)
  const save = useSaved(eventId)
  const busy = rsvp.loading || rsvp.saving || save.loading || save.saving

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Toggle
          on={rsvp.status === 'going'}
          onClick={() => rsvp.choose('going')}
          disabled={busy}
          icon={<CheckIcon className="size-4" />}
        >
          Going
        </Toggle>
        <Toggle
          on={rsvp.status === 'interested'}
          onClick={() => rsvp.choose('interested')}
          disabled={busy}
          icon={<CheckIcon className="size-4" />}
        >
          Interested
        </Toggle>
      </div>
      <Toggle
        on={save.saved}
        onClick={save.toggle}
        disabled={busy}
        icon={<BookmarkIcon className="size-4" />}
      >
        {save.saved ? 'Saved' : 'Save'}
      </Toggle>
      <FormError>
        {rsvp.error && 'Your RSVP didn’t save. Try again.'}
        {save.error && 'That didn’t save. Try again.'}
      </FormError>
    </div>
  )
}

// Going, Interested and Save for one event. Logged out: a way to log in
// that comes back here afterward.
export default function RsvpButtons({ eventId }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return (
      <ButtonLink to="/login" state={{ from: location.pathname }}>
        Log in to RSVP
      </ButtonLink>
    )
  }
  return <Choices eventId={eventId} />
}
