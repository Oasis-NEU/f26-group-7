import { createClient } from '@supabase/supabase-js'

// The project URL and publishable key come from .env.local.
// Vite only gives the browser variables whose names start with VITE_.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error(
    'Missing Supabase settings. Check .env.local, then restart npm run dev.',
  )
}

// One Supabase client for the whole site.
export const supabase = createClient(url, key)
