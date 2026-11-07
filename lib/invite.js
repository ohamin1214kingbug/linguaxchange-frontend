// An invite link is any page with ?invite=U000012. The code is kept until
// signup finishes, so a friend who reads a guide first and registers three
// pages later is still counted. Signed-in visitors are ignored: an existing
// account cannot be invited.
const INVITE_KEY = 'inviteCode'

export function captureInvite(search, signedIn) {
  if (signedIn) return
  const code = new URLSearchParams(search).get('invite')
  if (!code || !/^u?\d{1,9}$/i.test(code.trim())) return
  try { localStorage.setItem(INVITE_KEY, code.trim().toUpperCase()) } catch (e) {}
}

export function pendingInvite() {
  try { return localStorage.getItem(INVITE_KEY) || undefined } catch (e) { return undefined }
}

export function clearInvite() {
  try { localStorage.removeItem(INVITE_KEY) } catch (e) {}
}
