import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FILTERS,
  PRICE_OPTIONS,
  WALK_OPTIONS,
  WHEN_OPTIONS,
  hasFilters,
} from '../lib/filters'
import { STOPS } from '../lib/stops'
import NicheTabs from './NicheTabs'
import { Button } from './ui/Button'
import Select from './ui/Select'
import TextField from './ui/TextField'

// How long typing has to pause before the search runs.
export const TYPING_PAUSE_MS = 350

const STOP_CHOICES = STOPS.map((stop) => ({
  value: stop.name,
  label: stop.name,
}))

// The search box keeps its own text while you type, and tells the page
// once you pause, so every keystroke isn't a new search.
function SearchBox({ value, onSearch }) {
  const [text, setText] = useState(value)
  const [seen, setSeen] = useState(value)
  const timer = useRef(null)

  // Follow outside changes (Clear filters, the Back button): when the
  // page's search changes to something we haven't seen, show it. This is
  // React's way to adjust state when a prop changes, without an extra
  // render.
  if (value !== seen) {
    setSeen(value)
    setText(value)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  function handleChange(event) {
    const next = event.target.value
    setText(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(next), TYPING_PAUSE_MS)
  }

  return (
    <TextField
      label="Search"
      type="search"
      placeholder="Vinyl, jazz, thrift…"
      value={text}
      onChange={handleChange}
    />
  )
}

// Every filter for the Home page. `onChange(changes, { replace })`
// updates some filters; `homeStop` is where distance starts by default.
export default function FilterBar({ filters, onChange, homeStop }) {
  function pick(key) {
    return (event) => onChange({ [key]: event.target.value })
  }

  function pickWalk(event) {
    const walk = event.target.value
    // A distance needs a starting stop: your home stop, or Park Street.
    onChange({ walk, near: filters.near || homeStop || 'Park Street' })
  }

  return (
    <div className="grid gap-5">
      <SearchBox
        value={filters.q}
        onSearch={(q) => onChange({ q }, { replace: true })}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="When"
          options={WHEN_OPTIONS}
          value={filters.when}
          onChange={pick('when')}
        />
        <Select
          label="Distance"
          options={WALK_OPTIONS}
          value={filters.walk}
          onChange={pickWalk}
        />
        <Select
          label="Price"
          options={PRICE_OPTIONS}
          value={filters.price}
          onChange={pick('price')}
        />

        {filters.when === 'dates' && (
          <>
            <TextField
              label="From"
              type="date"
              value={filters.from}
              onChange={pick('from')}
            />
            <TextField
              label="To"
              type="date"
              value={filters.to}
              onChange={pick('to')}
            />
          </>
        )}

        {filters.walk && (
          <Select
            label="From the stop"
            options={STOP_CHOICES}
            value={filters.near}
            onChange={pick('near')}
          />
        )}
      </div>

      <NicheTabs
        selected={filters.niches}
        onChange={(niches) => onChange({ niches })}
      />

      {hasFilters(filters) && (
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
