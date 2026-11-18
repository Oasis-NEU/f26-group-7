import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { searchEvents, watchEvents } from './events'
import { writeFilters } from './filters'

const SEARCHES = ['events', 'search']

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
    // The filters as text, plus today's date: "next 7 days" means a
    // different week tomorrow.
    queryKey: [
      ...SEARCHES,
      writeFilters(filters).toString(),
      new Date().toDateString(),
    ],
    queryFn: () => searchEvents(filters),
    // While new results load, keep showing the old ones (dimmed) instead
    // of flashing an empty page.
    placeholderData: keepPreviousData,
  })
}
