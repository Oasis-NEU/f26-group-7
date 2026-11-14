import { createClient } from '@supabase/supabase-js'

// The project URL and anonymous key come from .env.
// Vite only gives the browser variables whose names start with VITE_.
const rawUrl = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!rawUrl || !key) {
  throw new Error(
    'Missing Supabase settings. Check .env, then restart npm run dev.',
  )
}

// The client adds /rest/v1 itself, so the URL must end at .supabase.co.
// The dashboard also shows a REST URL ending in /rest/v1/, which is easy to
// copy by mistake. Trim anything after the host and say what to fix.
const url = new URL(rawUrl).origin
if (url !== rawUrl.replace(/\/$/, '')) {
  console.warn(
    `VITE_SUPABASE_URL in .env should be ${url} (without the part after .supabase.co). Using that for now.`,
  )
}

// One Supabase client for the whole site.
export const supabase = createClient(url, key)
