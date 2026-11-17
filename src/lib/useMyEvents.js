import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchIsSaved,
  fetchMyRsvp,
  fetchMyUpcoming,
  setMyRsvp,
  setSaved,
} from './myEvents'
import { useAuth } from './useAuth'
import { eventKey } from './useEvent'

const MY_EVENTS = ['my-events']

// Your RSVP for one event, with a button-friendly way to change it.
// Changes show at once ("optimistic"), save in the background, and switch
// back if the save fails. The going count moves along with it.
export function useRsvp(eventId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['rsvp', String(eventId), user?.id]

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchMyRsvp(user.id, eventId),
    enabled: Boolean(user),
  })

  const mutation = useMutation({
    mutationFn: ({ status, current }) =>
      setMyRsvp(user.id, eventId, status, current),

    onMutate: async ({ status, current }) => {
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData(key, status)

      // Going +1 when you start going, -1 when you stop.
      const change = (status === 'going') - (current === 'going')
      queryClient.setQueryData(eventKey(eventId), (event) =>
        event ? { ...event, going: Math.max(0, event.going + change) } : event,
      )
      return { current, change }
    },

    onError: (_error, _variables, saved) => {
      queryClient.setQueryData(key, saved.current)
      queryClient.setQueryData(eventKey(eventId), (event) =>
        event ? { ...event, going: event.going - saved.change } : event,
      )
    },

    // Whatever happened, reload the real values.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: eventKey(eventId) })
      queryClient.invalidateQueries({ queryKey: MY_EVENTS })
    },
  })

  const status = query.data ?? null

  return {
    status,
    loading: Boolean(user) && query.isPending,
    saving: mutation.isPending,
    error: mutation.error,
    // Clicking the current choice again turns it off.
    choose: (choice) =>
      mutation.mutate({
        status: choice === status ? null : choice,
        current: status,
      }),
  }
}

// Whether you saved one event, with a toggle that works the same way.
export function useSaved(eventId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['saved', String(eventId), user?.id]

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchIsSaved(user.id, eventId),
    enabled: Boolean(user),
  })

  const mutation = useMutation({
    mutationFn: (saved) => setSaved(user.id, eventId, saved),
    onMutate: async (saved) => {
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData(key, saved)
      return { previous: !saved }
    },
    onError: (_error, _saved, context) => {
      queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: MY_EVENTS })
    },
  })

  const saved = query.data ?? false

  return {
    saved,
    loading: Boolean(user) && query.isPending,
    saving: mutation.isPending,
    error: mutation.error,
    toggle: () => mutation.mutate(!saved),
  }
}

// Your upcoming Going, Interested and Saved events, for your profile.
export function useMyUpcoming() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...MY_EVENTS, user?.id],
    queryFn: () => fetchMyUpcoming(user.id),
    enabled: Boolean(user),
  })
}
