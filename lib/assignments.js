// The word-count rule is duplicated from the backend's
// utils/assignmentValidation.js on purpose — the two repositories share no
// code. It must stay identical, or the live counter will disagree with the
// error the server returns.
export const MAX_WORDS = 300

export function countWords(text) {
  if (typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// Stable keys. Display strings come from t('assignments.category.<key>'), so
// editing a translation never orphans stored data.
export const CATEGORIES = [
  'word-order', 'agreement', 'tense', 'vocabulary', 'register',
  'spelling', 'punctuation', 'naturalness', 'grammar-other',
]
