// The card colours a member can pick for their profile (owner request,
// 2026-11-12). Keys match PROFILE_COLORS in the backend's
// utils/profileFields.js and the CHECK in migrations/add_profile_color.sql.
//
// Light tints of the brand colours, so navy text stays readable on every
// one; full-strength yellow was tried first and was too loud for a whole
// card. Full class names, not built strings, so Tailwind can see them.
export const PROFILE_COLORS = {
  yellow: 'bg-brand-yellow/55',
  blue: 'bg-brand-blue/20',
  coral: 'bg-brand-coral/25',
  green: 'bg-brand-green/25',
  purple: 'bg-brand-purple/20',
  teal: 'bg-brand-teal/25',
  white: 'bg-white',
}

export const DEFAULT_PROFILE_COLOR = 'yellow'

// A missing or unknown value gets the default rather than a blank card.
export function profileColorClass(key) {
  return PROFILE_COLORS[key] || PROFILE_COLORS[DEFAULT_PROFILE_COLOR]
}
