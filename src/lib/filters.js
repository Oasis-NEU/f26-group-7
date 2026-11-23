import { shortDate } from './dates'
import { WALK_METERS_PER_MINUTE } from './geo'
import { NICHES } from './niches'
import { findStop } from './stops'

// The Home page's filters, kept in the page address so a filtered view
// can be bookmarked or shared:
//
//   /?q=vinyl&when=weekend&niche=Records,Film&walk=10&near=Symphony&price=free
//
// Anything missing or invalid falls back to the default, so a mangled
// link still shows a working page.

export const WHEN_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'Next 7 days' },
  { value: 'month', label: 'Next 30 days' },
  { value: 'dates', label: 'Pick dates' },
]

export const WALK_OPTIONS = [
  { value: '', label: 'Any distance' },
  { value: '5', label: '5-minute walk' },
  { value: '10', label: '10-minute walk' },
  { value: '15', label: '15-minute walk' },
  { value: '20', label: '20-minute walk' },
]

export const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: 'free', label: 'Free only' },
  { value: '10', label: '$10 or less' },
  { value: '20', label: '$20 or less' },
  { value: '50', label: '$50 or less' },
]

export const DEFAULT_FILTERS = {
  q: '',
  when: 'week',
  from: '', // "2026-11-20", only for when = 'dates'
  to: '',
  niches: [],
  walk: '', // minutes, as text ('10'), or '' for any distance
  near: '', // a stop name, used with walk
  price: '', // '', 'free' or a top price as text ('20')
}

const NICHE_CHOICES = NICHES.filter((niche) => niche !== 'All')

function oneOf(options, value, fallback) {
  return options.some((option) => option.value === value) ? value : fallback
}

function isDay(text) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(parseDay(text).getTime())
  )
}

// "2026-11-20" -> midnight at the start of Nov 20, on this computer's clock.
function parseDay(text) {
  const [year, month, day] = text.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// URLSearchParams -> filters
export function readFilters(params) {
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const near = params.get('near') ?? ''

  return {
    q: (params.get('q') ?? '').slice(0, 100),
    when: oneOf(WHEN_OPTIONS, params.get('when'), DEFAULT_FILTERS.when),
    from: isDay(from) ? from : '',
    to: isDay(to) ? to : '',
    niches: (params.get('niche') ?? '')
      .split(',')
      .filter((niche) => NICHE_CHOICES.includes(niche)),
    walk: oneOf(WALK_OPTIONS, params.get('walk'), ''),
    near: findStop(near) ? near : '',
    price: oneOf(PRICE_OPTIONS, params.get('price'), ''),
  }
}

// filters -> URLSearchParams, leaving out anything at its default.
export function writeFilters(filters) {
  const params = new URLSearchParams()
  if (filters.q.trim()) params.set('q', filters.q)
  if (filters.when !== DEFAULT_FILTERS.when) params.set('when', filters.when)
  if (filters.when === 'dates') {
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
  }
  if (filters.niches.length) params.set('niche', filters.niches.join(','))
  if (filters.walk) {
    params.set('walk', filters.walk)
    if (filters.near) params.set('near', filters.near)
  }
  if (filters.price) params.set('price', filters.price)
  return params
}

// True when anything differs from a plain Home page.
export function hasFilters(filters) {
  return writeFilters(filters).toString() !== ''
}

function startOfDay(date) {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

function addDays(date, days) {
  const later = new Date(date)
  later.setDate(later.getDate() + days)
  return later
}

// The times to search between: { from, to }, where `to` is the first
// moment after the range.
export function dateRange(filters, now = new Date()) {
  const today = startOfDay(now)

  switch (filters.when) {
    case 'today':
      return { from: today, to: addDays(today, 1) }

    case 'weekend': {
      // Saturday and Sunday. On a weekend, from today through Sunday.
      const day = today.getDay() // 0 is Sunday, 6 is Saturday
      if (day === 6) return { from: today, to: addDays(today, 2) }
      if (day === 0) return { from: today, to: addDays(today, 1) }
      const saturday = addDays(today, 6 - day)
      return { from: saturday, to: addDays(saturday, 2) }
    }

    case 'month':
      return { from: today, to: addDays(today, 30) }

    case 'dates': {
      let first = filters.from ? parseDay(filters.from) : today
      let last = filters.to ? parseDay(filters.to) : first
      if (last < first) [first, last] = [last, first]
      // Include all of the last day.
      return { from: first, to: addDays(last, 1) }
    }

    default:
      return { from: today, to: addDays(today, 7) }
  }
}

// The headline's words for the range: "today", "this weekend", "Nov 20–25".
export function whenText(filters, now = new Date()) {
  switch (filters.when) {
    case 'today':
      return 'today'
    case 'weekend':
      return 'this weekend'
    case 'month':
      return 'in the next 30 days'
    case 'dates': {
      const { from, to } = dateRange(filters, now)
      const last = addDays(to, -1)
      if (from.getTime() === last.getTime()) return `on ${shortDate(from)}`
      const sameMonth = from.getMonth() === last.getMonth()
      const end = sameMonth ? last.getDate() : shortDate(last)
      return `${shortDate(from)}–${end}`
    }
    default:
      return 'this week'
  }
}

// The area the walk filter searches: { stop, meters } around a T stop, or
// null when there's no walk filter. The map draws this same circle.
export function walkArea(filters) {
  const stop = filters.walk ? findStop(filters.near) : null
  if (!stop) return null
  return { stop, meters: Number(filters.walk) * WALK_METERS_PER_MINUTE }
}

// filters -> the inputs for search_events() in the database.
export function toSearchArgs(filters, now = new Date()) {
  const { from, to } = dateRange(filters, now)
  const area = walkArea(filters)

  return {
    q: filters.q.trim() || null,
    starts_after: from.toISOString(),
    starts_before: to.toISOString(),
    niches: filters.niches.length ? filters.niches : null,
    near_lat: area?.stop.lat ?? null,
    near_lng: area?.stop.lng ?? null,
    within_m: area?.meters ?? null,
    free_only: filters.price === 'free',
    max_price:
      filters.price && filters.price !== 'free' ? Number(filters.price) : null,
  }
}
