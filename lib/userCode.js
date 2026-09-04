// A member's permanent, public handle: their row id, zero-padded.
//
// Written out three times before this file existed — the admin queue, a
// member's own profile, and now every public profile — which is one copy too
// many for a one-line function that has to agree everywhere. A report filed
// against U000012 has to reach user 12 whichever screen the code was read
// from.
//
// Public on purpose. It is derived from the id, and the id is already in the
// URL of the page showing it (/teachers/12), so this reveals nothing that
// was not already on screen. It exists to be quoted: reporting someone means
// naming them, and a name is not unique.
export const userCode = id => 'U' + String(id).padStart(6, '0')
