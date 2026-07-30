const API = 'https://linguaxchange-backend-production.up.railway.app'

// IANA zone name (e.g. "Asia/Seoul"), not a raw UTC offset — offsets break
// under DST, IANA names don't.
export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch (e) {
    return null
  }
}

// Called right after establishing a session (login, register, Google
// callback). Always sends the detected value rather than fetching first to
// compare — the write is idempotent (same value in = no visible change), so
// comparing first would just be an extra round trip for no behavioral
// difference. Updates the cached localStorage user object with whatever the
// backend confirms, so later pages can read it without another fetch.
// Fire-and-forget: never blocks navigation, never surfaces an error.
export async function syncTimezone(userId, token) {
  const timezone = detectTimezone()
  if (!timezone) return
  try {
    const res = await fetch(`${API}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ timezone })
    })
    if (!res.ok) return
    const updated = await res.json()
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    localStorage.setItem('user', JSON.stringify({ ...stored, timezone: updated.timezone }))
  } catch (e) {
    // best-effort — a failed sync just means times render in the browser's
    // local zone (the pre-existing default) until the next login
  }
}

// The API returns session_date/scheduled_at as a UTC instant but without a
// 'Z' suffix or offset (e.g. "2026-08-03T01:00:00") — a bare `new Date(...)`
// on a date-time string with no timezone marker is parsed as LOCAL time per
// the JS spec, not UTC, silently shifting every displayed class time by the
// viewer's own UTC offset. Force UTC interpretation unless a zone marker is
// already present. Passing an already-parsed Date through unchanged keeps
// this safe to call on values callers may have already converted.
function asUtcDate(date) {
  if (date instanceof Date) return date
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(date)
  return new Date(hasZone ? date : `${date}Z`)
}

// Renders a UTC ISO date string in `timezone` if given, or the browser's
// local zone otherwise (Intl's own default when timeZone is undefined) —
// which is exactly what a bare `.toLocaleString()` call already did, so
// this is a safe drop-in for a guest or a user with no stored timezone yet.
export function formatInTimezone(dateISO, timezone) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone || undefined,
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(asUtcDate(dateISO))
  } catch (e) {
    return asUtcDate(dateISO).toLocaleString()
  }
}

export { asUtcDate }
