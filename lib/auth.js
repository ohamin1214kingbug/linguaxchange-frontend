const API = 'https://linguaxchange-backend-production.up.railway.app'

// Removes the auth keys specifically (not localStorage.clear()) so
// unrelated data like site_language survives. The backend call revokes the
// token server-side (see routes/auth.js POST /logout) so it can't still be
// used if it leaked — fire-and-forget since the client-side logout should
// never hang or fail just because the network call did.
export function logout(destination = '/') {
  const token = localStorage.getItem('token')
  if (token) {
    fetch(`${API}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
  }
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = destination
}

// Where to send someone once sign-in finishes. A logged-out visitor who
// clicks "Request this class" goes off to register, phone verification or
// Google and used to land on /dashboard — losing the language and level a
// study guide had brought them to. The page is remembered for the length of
// the tab and handed back by whichever page completes the sign-in.
//
// Only same-site paths are honoured, so the stored value can never become an
// open redirect, and never an /auth/ page, which would loop.
const RETURN_PATH_KEY = 'postAuthReturnPath'

export function isSafeReturnPath(path) {
  return typeof path === 'string'
    && path.startsWith('/')
    && !path.startsWith('//')
    && !path.startsWith('/\\')
    && !path.startsWith('/auth/')
}

export function rememberReturnPath(path) {
  try {
    if (isSafeReturnPath(path)) sessionStorage.setItem(RETURN_PATH_KEY, path)
  } catch {}
}

export function takeReturnPath(fallback = '/dashboard') {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY)
    sessionStorage.removeItem(RETURN_PATH_KEY)
    return isSafeReturnPath(path) ? path : fallback
  } catch {
    return fallback
  }
}
