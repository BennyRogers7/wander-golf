export const US_STATES: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
}

// Also include full names as keys for reverse lookup
export const US_STATE_NAMES = new Set(Object.values(US_STATES))

// Reverse lookup: full name to abbreviation
export const US_STATE_ABBREVS: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATES).map(([abbrev, name]) => [name, abbrev])
)

// Get full state name from abbreviation or return original if already full name
export function getStateName(stateInput: string): string {
  // Check if it's an abbreviation
  const upper = stateInput.toUpperCase()
  if (US_STATES[upper]) {
    return US_STATES[upper]
  }
  // Check if it's already a full name
  const titleCase = stateInput.replace(/\b\w/g, c => c.toUpperCase())
  if (US_STATE_NAMES.has(titleCase)) {
    return titleCase
  }
  // Return formatted version
  return titleCase
}

// Check if a state is a valid US state
export function isValidUSState(stateInput: string): boolean {
  const upper = stateInput.toUpperCase()
  if (US_STATES[upper]) {
    return true
  }
  const titleCase = stateInput.replace(/\b\w/g, c => c.toUpperCase())
  return US_STATE_NAMES.has(titleCase)
}

// Get state slug from state name or abbreviation
export function getStateSlug(stateInput: string): string {
  const fullName = getStateName(stateInput)
  return fullName.toLowerCase().replace(/\s+/g, '-')
}

// Get state abbreviation from full name or return original if already abbreviation
export function getStateAbbrev(stateInput: string): string {
  const upper = stateInput.toUpperCase()
  // Already an abbreviation
  if (US_STATES[upper]) {
    return upper
  }
  // Convert full name to abbreviation
  const titleCase = stateInput.replace(/\b\w/g, c => c.toUpperCase())
  if (US_STATE_ABBREVS[titleCase]) {
    return US_STATE_ABBREVS[titleCase]
  }
  return upper
}
