import { NICHES } from '../lib/niches'

// Square tabs that share their 2px borders. Pick any number of niches;
// "All" is lit when none are picked, and clicking it clears them.
// `selected` (a list) and `onChange` come from the page.
export default function NicheTabs({ selected, onChange }) {
  function toggle(niche) {
    if (niche === 'All') return onChange([])
    onChange(
      selected.includes(niche)
        ? selected.filter((n) => n !== niche)
        : [...selected, niche],
    )
  }

  return (
    <div className="flex overflow-x-auto pt-0.5 pl-0.5 md:flex-wrap">
      {NICHES.map((niche) => {
        const isOn =
          niche === 'All' ? selected.length === 0 : selected.includes(niche)
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
  )
}
