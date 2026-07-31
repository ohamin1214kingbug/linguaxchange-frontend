const API = 'https://linguaxchange-backend-production.up.railway.app'

// Removes the auth keys specifically (not localStorage.clear()) so
// unrelated data like site_language survives. The backend call revokes the
// token server-side (see routes/auth.js POST /logout) so it can't still be
// used if it leaked — fire-and-forget since the client-side logout should
// never hang or fail just because the network call did.
export function logout() {
  const token = localStorage.getItem('token')
  if (token) {
    fetch(`${API}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
  }
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/'
}
