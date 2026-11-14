import { useState } from 'react'
import AlertChip from '../components/AlertChip'
import LineBadge from '../components/LineBadge'
import NicheTabs from '../components/NicheTabs'
import Avatar from '../components/ui/Avatar'
import { Button, ButtonLink } from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import TextField from '../components/ui/TextField'
import { daysFromNow } from '../lib/dates'
import { LINES } from '../lib/lines'
import { NICHES } from '../lib/niches'

// Every building block on one page, for the team. Not linked in the nav:
// visit /styleguide.

const COLORS = [
  ['paper', 'bg-paper'],
  ['ink', 'bg-ink'],
  ['muted', 'bg-muted'],
  ['rule-light', 'bg-rule-light'],
  ['alert', 'bg-alert'],
  ['green-line', 'bg-green-line'],
  ['red-line', 'bg-red-line'],
  ['orange-line', 'bg-orange-line'],
  ['blue-line', 'bg-blue-line'],
]

const CHANGES = [
  { type: 'delayed', newStart: daysFromNow(1, 21) },
  { type: 'early', newStart: daysFromNow(1, 18, 30) },
  { type: 'cancelled' },
  { type: 'detour', newVenue: 'Summer St atrium' },
]

function Section({ title, children }) {
  return (
    <section className="border-t-2 border-ink py-8">
      <h2 className="mb-5 text-title font-extrabold">{title}</h2>
      {children}
    </section>
  )
}

export default function Styleguide() {
  const [niche, setNiche] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="mx-auto max-w-content px-4 pb-20 md:px-10">
      <h1 className="py-10 text-display font-extrabold">Styleguide</h1>

      <Section title="Colors">
        <p className="mb-4 text-muted">
          Tokens from src/index.css. Use these names, never raw colors.
        </p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {COLORS.map(([name, swatch]) => (
            <li key={name} className="text-sm font-bold">
              <span
                className={`mb-2 block h-14 border-2 border-ink ${swatch}`}
              />
              {name}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Type">
        <p className="text-display font-extrabold">Display</p>
        <p className="mt-4 text-title font-bold">Title, for event names</p>
        <p className="mt-2 text-lg">Large body text, for intros.</p>
        <p className="mt-2">Body text.</p>
        <p className="mt-2 text-muted">
          Muted text, for less important details.
        </p>
      </Section>

      <Section title="T lines and alerts">
        <div className="flex flex-wrap gap-2">
          {Object.keys(LINES).map((line) => (
            <LineBadge key={line} line={line} />
          ))}
        </div>
        <div className="mt-4 flex flex-col items-start">
          {CHANGES.map((change) => (
            <AlertChip key={change.type} change={change} />
          ))}
        </div>
      </Section>

      <Section title="Niche tabs">
        <NicheTabs selected={niche} onSelect={setNiche} />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Solid button</Button>
          <Button variant="outline">Outline button</Button>
          <Button disabled>Disabled</Button>
          <ButtonLink to="/">Link to a page</ButtonLink>
          <ButtonLink variant="outline" href="https://www.mbta.com">
            Link to another site
          </ButtonLink>
        </div>
      </Section>

      <Section title="Forms">
        <form className="grid max-w-md gap-5">
          <TextField
            label="Username"
            placeholder="jordan"
            hint="Letters, numbers and underscores."
          />
          <TextField
            label="Email"
            type="email"
            defaultValue="not-an-email"
            error="That doesn’t look like an email address."
          />
          <TextField label="Bio" multiline placeholder="A line about you" />
          <Select label="Favorite niche" options={NICHES.slice(1)} />
          <Checkbox label="Only show free events" />
        </form>
      </Section>

      <Section title="Avatars">
        <div className="flex items-end gap-4">
          <Avatar name="Jordan Lee" size="sm" />
          <Avatar name="Aidan Gao" />
          <Avatar name="Sam" size="lg" />
        </div>
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setModalOpen(true)}>Open a dialog</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Share this event"
        >
          <p>Dialogs close with the × button, the Escape key, or an action.</p>
          <Button className="mt-5" onClick={() => setModalOpen(false)}>
            Done
          </Button>
        </Modal>
      </Section>

      <Section title="Empty state">
        <EmptyState
          title="No saved events yet"
          message="Tap Save on any event and it shows up here."
        >
          <ButtonLink to="/">Find events</ButtonLink>
        </EmptyState>
      </Section>
    </main>
  )
}
