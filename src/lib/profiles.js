import { supabase } from './supabase'

// One profile row in the shape pages use. Private fields are only present
// on your own profile (from my_profile()).
export function toProfile(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    school: row.school,
    favoriteNiches: row.favorite_niches ?? [],
    homeStop: row.home_stop,
    homeNeighborhood: row.home_neighborhood,
    privacy: row.privacy,
    role: row.role,
    onboardedAt: row.onboarded_at ? new Date(row.onboarded_at) : null,
  }
}

// Page names -> database columns, for the fields people can change.
const EDITABLE = {
  username: 'username',
  displayName: 'display_name',
  avatarUrl: 'avatar_url',
  bio: 'bio',
  school: 'school',
  homeStop: 'home_stop',
  homeNeighborhood: 'home_neighborhood',
  favoriteNiches: 'favorite_niches',
  privacy: 'privacy',
  onboardedAt: 'onboarded_at',
}

// { displayName: 'Jo', bio: '' } -> { display_name: 'Jo', bio: null }
// Empty text is saved as "nothing" rather than as "".
export function toProfileRow(fields) {
  const row = {}
  for (const [key, value] of Object.entries(fields)) {
    const column = EDITABLE[key]
    if (!column) throw new Error(`Profiles can't change "${key}".`)
    row[column] = value === '' ? null : value
  }
  return row
}

// Your own profile, including private fields, or null if logged out.
export async function fetchMyProfile() {
  const { data, error } = await supabase.rpc('my_profile').maybeSingle()
  if (error) throw error
  return data ? toProfile(data) : null
}

export async function updateMyProfile(userId, fields) {
  const { error } = await supabase
    .from('profiles')
    .update(toProfileRow(fields))
    .eq('id', userId)

  if (error?.code === '23505') {
    // The database's "must be unique" rule: someone took the username.
    throw new Error('That username is taken.')
  }
  if (error) throw error
}

// True when someone other than `myId` already has this username.
export async function isUsernameTaken(username, myId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (error) throw error
  return data !== null && data.id !== myId
}

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function photoProblem(file) {
  if (!PHOTO_TYPES.includes(file.type)) {
    return 'Photos need to be JPG, PNG, WebP or GIF.'
  }
  if (file.size > MAX_PHOTO_BYTES) return 'Photos can be at most 2 MB.'
  return null
}

// Puts the photo in the user's own folder (replacing the old one) and
// returns its public link. The ?v= part makes browsers fetch the new
// photo instead of showing a saved copy of the old one.
export async function uploadAvatar(userId, file) {
  const path = `${userId}/avatar`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}
