// Form checks. Each returns a message to show, or null when the value is
// fine. The database has the same rules, so these just give a friendlier
// message before anything is sent.

// "  Jordan_Lee " -> "jordan_lee"
export function cleanUsername(value) {
  return value.trim().toLowerCase()
}

export function usernameProblem(username) {
  if (username.length < 3) return 'Usernames need at least 3 characters.'
  if (username.length > 20) return 'Usernames can be at most 20 characters.'
  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Usernames can only use lowercase letters, numbers and _.'
  }
  return null
}

export function emailProblem(email) {
  return /^\S+@\S+\.\S+$/.test(email.trim())
    ? null
    : 'That doesn’t look like an email address.'
}

export const MIN_PASSWORD_LENGTH = 8

export function passwordProblem(password) {
  return password.length < MIN_PASSWORD_LENGTH
    ? `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`
    : null
}

export function displayNameProblem(name) {
  if (!name.trim()) return 'Add the name people will see.'
  if (name.trim().length > 50) return 'Names can be at most 50 characters.'
  return null
}

export function bioProblem(bio) {
  return bio.length > 300 ? 'Bios can be at most 300 characters.' : null
}
