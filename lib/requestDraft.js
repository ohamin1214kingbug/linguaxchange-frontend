// The class request a logged-out visitor typed, kept for the trip through
// registration. Posting requires an account, so pressing Post sends them to
// sign up first; without this the form came back blank and they had to type
// their request again. Read once, then gone.

const DRAFT_KEY = 'classRequestDraft'
const FIELDS = ['language_code', 'level', 'topic', 'details', 'max_students', 'preferred_time', 'time_flexible']

const pick = obj => Object.fromEntries(FIELDS.filter(k => k in obj).map(k => [k, obj[k]]))

export function saveRequestDraft(form) {
  try {
    if (!form?.topic?.trim()) return
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(pick(form)))
  } catch {}
}

export function takeRequestDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    sessionStorage.removeItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw)
    return draft && typeof draft === 'object' ? pick(draft) : null
  } catch {
    return null
  }
}
