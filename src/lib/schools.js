// Schools to choose from on a profile. Stored as plain text, so adding
// one here is all it takes.
export const SCHOOLS = [
  'Northeastern',
  'Boston University',
  'Harvard',
  'MIT',
  'Emerson',
  'Berklee',
  'Suffolk',
  'Simmons',
  'Wentworth',
  'MassArt',
  'UMass Boston',
  'Other',
  'Not a student',
]

export const SCHOOL_OPTIONS = [
  { value: '', label: 'Choose one (optional)' },
  ...SCHOOLS.map((school) => ({ value: school, label: school })),
]
