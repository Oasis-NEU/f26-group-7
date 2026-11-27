// DRAFT FOR PLANNING: nothing imports this yet, and the database functions
// it calls don't exist until docs/friends/0008_friends.draft.sql is run.
// The imports are written as they will be once this file moves to
// src/lib/friends.js, so it can be moved as it is.
//
// Friends and friend requests: what the Friends page, profile pages and
// event pages need. Same shape as profiles.js and myEvents.js: small
// functions that load or change one thing, plus snake_case -> camelCase
// mappers that are easy to unit test.

import { EVENT_COLUMNS, toEvent } from './events'
import { upcoming } from './myEvents'
import { toProfile } from './profiles'
import { supabase } from './supabase'

// The profile columns anyone may read (0005 keeps the others private).
export const PUBLIC_PROFILE_COLUMNS = [
  'id',
  'username',
  'display_name',
  'avatar_url',
  'bio',
  'school',
  'favorite_niches',
  'created_at',
].join(',')

// ── Shapes ─────────────────────────────────────────────────────────────

// A person in a list (friends, search results, suggestions).
export function toPerson(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    school: row.school,
  }
}

// One row of my_friendships: a friendship or a request you're in.
export function toFriendship(row) {
  return {
    id: row.id,
    status: row.status, // 'pending' or 'accepted'
    direction: row.direction, // 'sent' (you asked) or 'received'
    createdAt: new Date(row.created_at),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    person: toPerson({ ...row, id: row.person_id }),
  }
}

// One row of friend_suggestions(), with the numbers behind its score.
export function toSuggestion(row) {
  return {
    ...toPerson(row),
    mutualFriends: row.mutual_friends ?? 0,
    sharedEvents: row.shared_events ?? 0,
    sameSchool: Boolean(row.same_school),
    sharedNiches: row.shared_niches ?? [],
  }
}

// ── Helpers for pages ──────────────────────────────────────────────────

// The three lists on the Friends page.
export function groupFriendships(friendships) {
  const pending = (direction) =>
    friendships.filter(
      (friendship) =>
        friendship.status === 'pending' && friendship.direction === direction,
    )

  return {
    friends: friendships.filter(
      (friendship) => friendship.status === 'accepted',
    ),
    received: pending('received'),
    sent: pending('sent'),
  }
}

// How you relate to someone, to pick the button on their profile:
// 'self', 'friends', 'sent' (waiting on them), 'received' (waiting on
// you) or 'none'. Also returns the row, which accepting or removing needs.
export function relationshipWith(personId, myId, friendships) {
  if (personId === myId) return { relationship: 'self', friendship: null }

  const friendship =
    friendships.find((item) => item.person.id === personId) ?? null
  if (!friendship) return { relationship: 'none', friendship }

  const relationship =
    friendship.status === 'accepted' ? 'friends' : friendship.direction
  return { relationship, friendship }
}

// "Records", "Records and Film", "Records, Film and Books"
function listText(items) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

// Why someone is suggested, strongest reason first.
export function suggestionReason(suggestion) {
  const { mutualFriends, sharedEvents, sameSchool, school, sharedNiches } =
    suggestion

  if (mutualFriends > 0) {
    return mutualFriends === 1
      ? '1 mutual friend'
      : `${mutualFriends} mutual friends`
  }
  if (sharedEvents > 0) {
    return sharedEvents === 1
      ? '1 event in common'
      : `${sharedEvents} events in common`
  }
  if (sameSchool && school) return `Also at ${school}`
  if (sharedNiches.length > 0) {
    return `Also into ${listText(sharedNiches.slice(0, 3))}`
  }
  return null
}

// The database's refusals, as something to show on the page.
function requestProblem(error) {
  // The "one row per pair" rule: a request already exists, either way.
  if (error.code === '23505') {
    return new Error('One of you already sent a friend request.')
  }
  // The "not yourself" rule.
  if (error.code === '23514') return new Error('You can’t add yourself.')
  return error
}

// ── Loading ────────────────────────────────────────────────────────────

// Your friends and requests, newest first. Split them with
// groupFriendships().
export async function fetchMyFriendships() {
  const { data, error } = await supabase
    .from('my_friendships')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toFriendship)
}

// The Find tab. Leave both empty and nothing comes back.
export async function searchPeople({ q = '', school = '' } = {}) {
  const { data, error } = await supabase.rpc('search_people', {
    q: q.trim() || null,
    from_school: school || null,
  })

  if (error) throw error
  return data.map((row) => ({
    ...toPerson(row),
    relationship: row.relationship,
  }))
}

export async function fetchSuggestions(max = 10) {
  const { data, error } = await supabase.rpc('friend_suggestions', {
    max_results: max,
  })

  if (error) throw error
  return data.map(toSuggestion)
}

// Someone's friends, for their profile page.
export async function fetchFriendsOf(personId) {
  const { data, error } = await supabase.rpc('friends_of', {
    person: personId,
  })

  if (error) throw error
  return data.map(toPerson)
}

// Your friends with an RSVP for one event: { going: [...], interested: [...] }
export async function fetchFriendsGoing(eventId) {
  const { data, error } = await supabase.rpc('friends_going', {
    for_event: eventId,
  })

  if (error) throw error
  const people = data.map((row) => ({ ...toPerson(row), status: row.status }))
  return {
    going: people.filter((person) => person.status === 'going'),
    interested: people.filter((person) => person.status === 'interested'),
  }
}

// Someone's public profile, from the username in /u/:username. null when
// nobody has that username.
export async function fetchProfileByUsername(username) {
  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('username', username)
    .maybeSingle()

  if (error) throw error
  return data ? toProfile(data) : null
}

// Someone's upcoming Going and Interested events, if their privacy setting
// lets you see them. When it doesn't, `visible` is false, so the page can
// say "Sam keeps their plans private" instead of "Nothing yet".
export async function fetchUpcomingFor(personId) {
  const [allowed, rsvps] = await Promise.all([
    supabase.rpc('can_see_plans', { person: personId }),
    supabase
      .from('rsvps')
      .select(`status, event:events(${EVENT_COLUMNS})`)
      .eq('user_id', personId),
  ])
  if (allowed.error) throw allowed.error
  if (rsvps.error) throw rsvps.error

  if (!allowed.data) return { visible: false, going: [], interested: [] }

  const withStatus = (status) =>
    upcoming(
      rsvps.data
        .filter((row) => row.status === status && row.event)
        .map((row) => toEvent(row.event)),
    )

  return {
    visible: true,
    going: withStatus('going'),
    interested: withStatus('interested'),
  }
}

// ── Changing ───────────────────────────────────────────────────────────

// Ask someone to be friends. The database fills in who's asking.
export async function sendFriendRequest(personId) {
  const { error } = await supabase
    .from('friendships')
    .insert({ addressee_id: personId })

  if (error) throw requestProblem(error)
}

// Accept a request someone sent you.
export async function acceptFriendRequest(friendshipId) {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select('id')

  if (error) throw error
  // The rules quietly skip rows you can't change, so "nothing changed"
  // means it was cancelled meanwhile, or wasn't yours to accept.
  if (data.length === 0) throw new Error('That request isn’t there any more.')
}

// Decline or cancel a request, or unfriend: all three delete the row.
export async function removeFriendship(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)

  if (error) throw error
}
