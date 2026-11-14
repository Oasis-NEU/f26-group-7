import { createContext, useContext } from 'react'

// Who's logged in, shared with every page by <AuthProvider>.
// The default (no provider) is "logged out", which is what tests get.
export const AuthContext = createContext({
  loading: false,
  user: null,
  profile: null,
  refreshProfile: async () => {},
})

// const { user, profile, loading, refreshProfile } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}
