import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchEvent, watchEvents } from './events'

export function eventKey(id) {
  return ['event', String(id)]
}

// One event, loaded through the shared cache, and reloaded when its row
// changes (someone RSVPs, the engine updates it).
// const { data: event, isPending, isError } = useEvent(id)
export function useEvent(id) {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      watchEvents(
        () => queryClient.invalidateQueries({ queryKey: eventKey(id) }),
        { id, waitMs: 500 },
      ),
    [id, queryClient],
  )

  return useQuery({ queryKey: eventKey(id), queryFn: () => fetchEvent(id) })
}
