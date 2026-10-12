import { NICHES } from '../lib/niches'

// Square tabs that share their 2px borders. `selected` and `onSelect`
// come from the page, which owns the state.
export default function NicheTabs({ selected, onSelect }) {
  return (
    <div className="flex overflow-x-auto pt-0.5 pl-0.5 md:flex-wrap">
      {NICHES.map((niche) => {
        const isSelected = niche === selected
        return (
          <button
            key={niche}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(niche)}
            className={`-mt-0.5 -ml-0.5 border-2 border-ink px-3.5 py-2.5 text-sm font-bold whitespace-nowrap ${
              isSelected ? 'bg-ink text-on-ink' : ''
            }`}
          >
            {niche}
          </button>
        )
      })}
    </div>
  )
}
