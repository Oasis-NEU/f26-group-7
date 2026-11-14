import { supabase } from './supabase'

// Supabase's error messages are written for developers. These are the
// ones people actually run into, in plain words.
export function authErrorMessage(error) {
  const message = error?.message ?? ''
  if (error?.status === 429 || /rate limit/i.test(message)) {
    return 'Too many tries. Wait a minute and try again.'
  }
  if (/invalid login credentials/i.test(message)) {
    return 'That email and password don’t match.'
  }
  if (/already registered|already exists/i.test(message)) {
    return 'There’s already an account with that email. Try logging in.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Check your email and click the link to confirm your account first.'
  }
  if (/password/i.test(message)) return message
  return 'Something went wrong. Try again.'
}

// Makes an account. `session` is null when Supabase is set to make people
// confirm their email first.
export async function signUp({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    // The sign-up trigger copies this into the new profile.
    options: { data: { display_name: name.trim() } },
  })
  if (error) throw new Error(authErrorMessage(error))
  return { session: data.session }
}

export async function logIn({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw new Error(authErrorMessage(error))
}

export async function logOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(authErrorMessage(error))
}
