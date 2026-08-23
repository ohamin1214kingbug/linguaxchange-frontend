import { asUtcDate } from './timezone'

// A class_session keeps status 'scheduled' after its time passes — nothing
// flips it — so "upcoming" has to be decided against the clock, not the
// status alone. Getting that wrong is what listed finished classes under
// "Upcoming classes" with a Join button on the teacher profile.
//
// asUtcDate, not new Date(): session_date comes back without a Z suffix,
// which JS parses as local time and would shift a class across the
// upcoming/past boundary by the viewer's UTC offset.
//
// Shared rather than copied: the browse list and the teacher profile both
// need this, and a fix landing in only one of them is how they drift.

// Soonest session still ahead of `now`, or null if the class is done.
export function nextSessionDate(cls, now = new Date()) {
  const upcoming = (cls?.class_sessions || [])
    .filter(s => s.status === 'scheduled' && asUtcDate(s.session_date) > now)
    .map(s => asUtcDate(s.session_date))
  return upcoming.length ? new Date(Math.min(...upcoming)) : null
}

// Latest session that wasn't cancelled — "when did this class last run".
export function lastSessionDate(cls) {
  const held = (cls?.class_sessions || [])
    .filter(s => s.status !== 'cancelled')
    .map(s => asUtcDate(s.session_date))
  return held.length ? new Date(Math.max(...held)) : null
}

// Call as `.filter(c => hasUpcomingSession(c))`, never `.filter(hasUpcomingSession)`
// — Array.filter passes the index as the second argument, which would land
// in `now` and make every session compare later than 0.
export function hasUpcomingSession(cls, now = new Date()) {
  return nextSessionDate(cls, now) !== null
}

// Whether one session has run its full course — belongs in a history/log
// once it has finished, not merely started, or a class you're sitting in
// right now would jump straight to the archive.
//
// This, not classes.status === 'completed', is what "taught" means in
// practice: marking a class complete is a separate admin action
// (routes/admin.js POST /classes/:id/complete) that real usage almost never
// triggers, so gating on it would show a teacher's history as empty even
// after they'd genuinely taught the class.
export function hasFinished(sessionDate, durationMinutes) {
  if (!sessionDate) return false
  const end = asUtcDate(sessionDate).getTime() + (durationMinutes || 60) * 60 * 1000
  return Date.now() > end
}
