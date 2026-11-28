// Interest tags (owner, 2026-11-28). Same keys and order as the backend's
// utils/interests.js; labels are translations (interests.<key>).
export const INTERESTS = [
  ['music', '🎵'], ['movies', '🎬'], ['anime', '📺'], ['sports', '⚽'], ['gaming', '🎮'], ['travel', '✈️'],
  ['food', '🍳'], ['books', '📚'], ['business', '💼'], ['exams', '🎓'], ['tech', '💻'], ['art', '🎨'],
  ['culture', '🏛️'], ['humour', '😂'], ['pets', '🐾'], ['daily', '☕'],
]
export const MAX_INTERESTS = 5
export const interestEmoji = key => (INTERESTS.find(([k]) => k === key) || [])[1] || ''
