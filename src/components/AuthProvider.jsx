import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMyProfile } from '../lib/profiles'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../lib/useAuth'

async function loadProfile() {
  try {
    return await fetchMyProfile()
  } catch (error) {
    console.error(error)
    return null
  }
}

// Keeps track of who's logged in and their profile, for the whole site.
// Supabase remembers logins in the browser, so a refresh stays logged in.
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let currentUserId

    // Runs once at the start (with the saved login, if any), then on every
    // log in, log out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)

      const userId = newSession?.user?.id ?? null
      // A token refresh (about hourly) keeps the same person logged in.
      if (userId === currentUserId) return
      currentUserId = userId

      if (!userId) {
        setProfile(null)
        setLoading(false)
        return
      }

      setLoading(true)
      // Calling Supabase inside this listener can freeze it, so load the
      // profile right after instead.
      setTimeout(async () => {
        const loaded = await loadProfile()
        if (currentUserId !== userId) return // logged out meanwhile
        setProfile(loaded)
        setLoading(false)
      }, 0)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  // Pages call this after saving profile changes.
  const refreshProfile = useCallback(async () => {
    setProfile(await loadProfile())
  }, [])

  const value = useMemo(
    () => ({ loading, user: session?.user ?? null, profile, refreshProfile }),
    [loading, session, profile, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
