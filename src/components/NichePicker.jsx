import { NICHES } from '../lib/niches'

const CHOICES = NICHES.filter((niche) => niche !== 'All')

// Pick any number of niches. Looks like the niche tabs on Home, but each
// button turns on and off by itself.
export default function NichePicker({ label, selected, onChange, error }) {
  function toggle(niche) {
    onChange(
      selected.includes(niche)
        ? selected.filter((n) => n !== niche)
        : [...selected, niche],
    )
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{label}</legend>
      <div className="flex flex-wrap pt-0.5 pl-0.5">
        {CHOICES.map((niche) => {
          const isOn = selected.includes(niche)
          return (
            <button
              key={niche}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(niche)}
              className={`-mt-0.5 -ml-0.5 border-2 border-ink px-3.5 py-2.5 text-sm font-bold whitespace-nowrap ${
                isOn ? 'bg-ink text-on-ink' : ''
              }`}
            >
              {niche}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-2 text-sm font-bold text-alert">{error}</p>}
    </fieldset>
  )
}
