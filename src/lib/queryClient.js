import { QueryClient } from '@tanstack/react-query'

// One cache for everything the site loads. Pages ask for data by a key
// (['event', 12]); the cache loads it once and shares it. When something
// changes, we mark that key out of date and it reloads.
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Treat loaded data as fresh for 30 seconds before checking again.
        staleTime: 30_000,
        // Try a failed load once more before showing an error.
        retry: 1,
      },
    },
  })
}
