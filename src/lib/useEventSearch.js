import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { searchEvents, watchEvents } from './events'
import { writeFilters } from './filters'
import { forYouFilters } from './forYou'

const SEARCHES = ['events', 'search']

// The filters as text, plus today's date: "next 7 days" means a different
// week tomorrow. The same filters share one cached result.
function searchKey(filters) {
  return [
    ...SEARCHES,
    writeFilters(filters).toString(),
    new Date().toDateString(),
  ]
}

// Events for the Home page's filters, reloaded when any event changes.
// const { data, isPending, isError, isPlaceholderData } = useEventSearch(filters)
// data is { events, capped }.
export function useEventSearch(filters) {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      watchEvents(() => queryClient.invalidateQueries({ queryKey: SEARCHES })),
    [queryClient],
  )

  return useQuery({
    queryKey: searchKey(filters),
    queryFn: () => searchEvents(filters),
    // While new results load, keep showing the old ones (dimmed) instead
    // of flashing an empty page.
    placeholderData: keepPreviousData,
  })
}

// The search behind "For you": the next 7 days in your favorite niches.
// It doesn't run for people without favorite niches. It's a search like
// any other, so useEventSearch on the same page keeps it live.
export function useForYou(profile) {
  const filters = forYouFilters(profile)
  return useQuery({
    // Without niches, a name no real search uses, so this can't pick up
    // another search's results.
    queryKey: filters ? searchKey(filters) : [...SEARCHES, 'for-you-off'],
    queryFn: () => searchEvents(filters),
    enabled: filters !== null,
  })
}
