// Helpers for showing people's names.

// "Jordan Lee" -> "Jordan"
export function firstName(name = '') {
  return (name ?? '').trim().split(/\s+/)[0]
}

// "Jordan Lee" -> "JL"
export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}
