const API = 'https://linguaxchange-backend-production.up.railway.app'

// Class ids the viewer is already confirmed in.
//
// Shared rather than copied: browse and the teacher profile both render a
// join button, and a page that doesn't ask this question offers to join a
// class the backend will just reject ("Already joined all upcoming
// occurrences of this class").
//
// Keyed by class id, not session id, because that's what both callers have
// in hand — a recurring class the viewer has joined one occurrence of still
// counts as joined here, matching what the join endpoint does when it runs
// out of unjoined sessions.
export async function fetchJoinedClassIds(token) {
  try {
    const res = await fetch(`${API}/api/enrollments`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    return new Set((Array.isArray(data) ? data : [])
      .filter(e => e.status === 'confirmed')
      .map(e => e.class_sessions?.classes?.id)
      .filter(Boolean))
  } catch (e) {
    // An empty set just means every button renders as Join — the same thing
    // that happened before this existed, and the backend still refuses.
    return new Set()
  }
}
