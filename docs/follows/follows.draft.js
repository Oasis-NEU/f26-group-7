// DRAFT FOR PLANNING: nothing imports this yet, and the database functions
// it calls don't exist until docs/follows/0008_follows.draft.sql is run.
// The imports are written as they will be once this file moves to
// src/lib/follows.js, so it can be moved as it is.
//
// Follows, follow requests, and what other people's profiles show. Same
// shape as profiles.js and myEvents.js: small functions that load or
// change one thing, plus snake_case -> camelCase mappers that are easy to
// unit test.

import { EVENT_COLUMNS, toEvent } from './events'
import { upcoming } from './myEvents'
import { toProfile } from './profiles'
import { actualStart, isCancelled, isOver } from './schedule'
import { supabase } from './supabase'

// The profile columns anyone may read.
export const PUBLIC_PROFILE_COLUMNS = [
  'id',
  'username',
  'display_name',
  'avatar_url',
  'bio',
  'school',
  'favorite_niches',
  'privacy',
  'saves_public',
  'created_at',
].join(',')

// ── Shapes ─────────────────────────────────────────────────────────────

// A person in a list (followers, search results, suggestions).
export function toPerson(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    school: row.school,
    privacy: row.privacy ?? null, // 'public' or 'private', when loaded
  }
}

// One row of my_follows: a follow, or a request, that you're in.
export function toFollow(row) {
  return {
    direction: row.direction, // 'following' (you follow them) or 'follower'
    status: row.status, // 'accepted' or 'pending'
    createdAt: new Date(row.created_at),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
    person: toPerson({ ...row, id: row.person_id }),
  }
}

// One row of follow_suggestions(), with the numbers behind its score.
export function toSuggestion(row) {
  return {
    ...toPerson(row),
    followsYou: Boolean(row.follows_you),
    followedBy: row.followed_by ?? 0,
    sharedEvents: row.shared_events ?? 0,
    sameSchool: Boolean(row.same_school),
    sharedNiches: row.shared_niches ?? [],
  }
}

// ── Helpers for pages ──────────────────────────────────────────────────

// The lists on the People page.
export function groupFollows(follows) {
  const pick = (direction, status) =>
    follows.filter(
      (follow) => follow.direction === direction && follow.status === status,
    )

  return {
    following: pick('following', 'accepted'),
    followers: pick('follower', 'accepted'),
    requests: pick('follower', 'pending'), // waiting on you to answer
    requested: pick('following', 'pending'), // waiting on them
  }
}

// How you and someone relate, for the buttons on their profile:
//   youFollow   'following', 'requested' or 'none'
//   followsYou  true when they follow you ("Follows you")
//   theyAsked   true when they've asked to follow you ("Accept")
export function relationshipWith(personId, myId, follows) {
  if (personId === myId) {
    return {
      self: true,
      youFollow: 'none',
      followsYou: false,
      theyAsked: false,
    }
  }

  const find = (direction) =>
    follows.find(
      (follow) =>
        follow.direction === direction && follow.person.id === personId,
    )
  const mine = find('following')
  const theirs = find('follower')

  let youFollow = 'none'
  if (mine) youFollow = mine.status === 'accepted' ? 'following' : 'requested'

  return {
    self: false,
    youFollow,
    followsYou: theirs?.status === 'accepted',
    theyAsked: theirs?.status === 'pending',
  }
}

// The follow button's words. `person.privacy` decides whether following
// starts at once or sends a request.
export function followButtonText(person, youFollow) {
  if (youFollow === 'following') return 'Following'
  if (youFollow === 'requested') return 'Requested'
  return person.privacy === 'private' ? 'Request to follow' : 'Follow'
}

// "Records", "Records and Film", "Records, Film and Books"
function listText(items) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

// Why someone is suggested, strongest reason first.
export function suggestionReason(suggestion) {
  const { followsYou, followedBy, sharedEvents, sameSchool, school } =
    suggestion

  if (followsYou) return 'Follows you'
  if (followedBy > 0) {
    return followedBy === 1
      ? 'Followed by 1 person you follow'
      : `Followed by ${followedBy} people you follow`
  }
  if (sharedEvents > 0) {
    return sharedEvents === 1
      ? '1 event in common'
      : `${sharedEvents} events in common`
  }
  if (sameSchool && school) return `Also at ${school}`
  if (suggestion.sharedNiches.length > 0) {
    return `Also into ${listText(suggestion.sharedNiches.slice(0, 3))}`
  }
  return null
}

// Events that are over, most recent first: the "Went to" list. Cancelled
// events are left out, since nobody went.
export function past(events, now = new Date()) {
  return events
    .filter((event) => event && !isCancelled(event) && isOver(event, now))
    .sort((a, b) => actualStart(b) - actualStart(a))
}

// ── Loading ────────────────────────────────────────────────────────────

// Everyone you follow, who follows you, and the requests either way.
// Split them with groupFollows().
export async function fetchMyFollows() {
  const { data, error } = await supabase
    .from('my_follows')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(toFollow)
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
    youFollow: row.you_follow,
    followsYou: row.follows_you,
  }))
}

export async function fetchSuggestions(max = 10) {
  const { data, error } = await supabase.rpc('follow_suggestions', {
    max_results: max,
  })

  if (error) throw error
  return data.map(toSuggestion)
}

// Someone's followers, and who they follow. Empty for a private account
// you don't follow.
export async function fetchFollowers(personId) {
  const { data, error } = await supabase.rpc('followers_of', {
    person: personId,
  })

  if (error) throw error
  return data.map(toPerson)
}

export async function fetchFollowing(personId) {
  const { data, error } = await supabase.rpc('following_of', {
    person: personId,
  })

  if (error) throw error
  return data.map(toPerson)
}

// { followers: 12, following: 30 }, shown on every profile.
export async function fetchFollowCounts(personId) {
  const { data, error } = await supabase
    .rpc('follow_counts', { person: personId })
    .single()

  if (error) throw error
  return data
}

// People you follow with an RSVP for one event: { going, interested }
export async function fetchFollowingGoing(eventId) {
  const { data, error } = await supabase.rpc('following_going', {
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
  // When this moves to src/lib, add savesPublic to toProfile() instead.
  return data
    ? { ...toProfile(data), savesPublic: Boolean(data.saves_public) }
    : null
}

// What a profile page shows: events coming up (Going and Interested), the
// events they went to, and their saved events. plansVisible and
// savesVisible say whether each part is hidden from you, so the page can
// say "This account is private" instead of "Nothing here yet".
export async function fetchProfileEvents(personId) {
  const [plans, saves, rsvps, saved] = await Promise.all([
    supabase.rpc('can_see_plans', { person: personId }),
    supabase.rpc('can_see_saves', { person: personId }),
    supabase
      .from('rsvps')
      .select(`status, event:events(${EVENT_COLUMNS})`)
      .eq('user_id', personId),
    supabase
      .from('saves')
      .select(`event:events(${EVENT_COLUMNS})`)
      .eq('user_id', personId),
  ])
  for (const result of [plans, saves, rsvps, saved]) {
    if (result.error) throw result.error
  }

  const withStatus = (status) =>
    rsvps.data
      .filter((row) => row.status === status && row.event)
      .map((row) => toEvent(row.event))
  const going = withStatus('going')

  return {
    plansVisible: Boolean(plans.data),
    savesVisible: Boolean(saves.data),
    going: upcoming(going),
    interested: upcoming(withStatus('interested')),
    went: past(going),
    saved: upcoming(
      saved.data.filter((row) => row.event).map((row) => toEvent(row.event)),
    ),
  }
}

// ── Changing ───────────────────────────────────────────────────────────

// Follow someone: 'following' for a public account, 'requested' for a
// private one. null when you already follow them or already asked.
export async function follow(personId) {
  const { data, error } = await supabase
    .from('follows')
    .insert({ followee_id: personId })
    .select('status')
    .single()

  if (error?.code === '23505') return null
  if (error?.code === '23514') throw new Error('You can’t follow yourself.')
  if (error) throw error
  return data.status === 'accepted' ? 'following' : 'requested'
}

// Unfollow, or cancel a request you sent.
export async function unfollow(myId, personId) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', myId)
    .eq('followee_id', personId)

  if (error) throw error
}

// Accept someone's request to follow you.
export async function acceptFollower(myId, personId) {
  const { data, error } = await supabase
    .from('follows')
    .update({ status: 'accepted' })
    .eq('follower_id', personId)
    .eq('followee_id', myId)
    .select('status')

  if (error) throw error
  // The rules quietly skip rows you can't change, so "nothing changed"
  // means they cancelled it meanwhile.
  if (data.length === 0) throw new Error('That request isn’t there any more.')
}

// Decline someone's request, or remove a follower. Either way the row is
// gone, as if it never existed, so they can ask again later.
export async function removeFollower(myId, personId) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', personId)
    .eq('followee_id', myId)

  if (error) throw error
}
