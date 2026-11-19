import { DEFAULT_FILTERS } from './filters'
import { WALK_METERS_PER_MINUTE, distanceMeters } from './geo'
import { NICHES } from './niches'
import { actualStart, isCancelled, isOver } from './schedule'
import { findStop } from './stops'

// "For you" on Home: a few upcoming events in your favorite niches,
// closest to your home stop first.

export const FOR_YOU_COUNT = 4

// The search behind "For you": the next 7 days in your favorite niches.
// null when you haven't picked any niches, so there's nothing to search.
export function forYouFilters(profile) {
  const niches = (profile?.favoriteNiches ?? []).filter(
    (niche) => niche !== 'All' && NICHES.includes(niche),
  )
  return niches.length ? { ...DEFAULT_FILTERS, niches } : null
}

// From the search results, the events to show, each with the walk from
// your home stop: [{ event, walkMinutes }]. walkMinutes is null when we
// don't know where the event or your stop is.
export function pickForYou(events, homeStop, now = new Date()) {
  const stop = findStop(homeStop)

  return events
    .filter((event) => !isCancelled(event) && !isOver(event, now))
    .map((event) => {
      const meters =
        stop && event.location ? distanceMeters(stop, event.location) : null
      return { event, meters }
    })
    .sort((a, b) => {
      // Closest first; unknown distances last; then whichever is sooner.
      if (a.meters !== b.meters) {
        if (a.meters === null) return 1
        if (b.meters === null) return -1
        return a.meters - b.meters
      }
      return actualStart(a.event) - actualStart(b.event)
    })
    .slice(0, FOR_YOU_COUNT)
    .map(({ event, meters }) => ({
      event,
      walkMinutes:
        meters === null
          ? null
          : Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE)),
    }))
}
