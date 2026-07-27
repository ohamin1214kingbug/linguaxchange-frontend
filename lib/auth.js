// Backend uses a stateless JWT (jsonwebtoken, no refresh-token table or
// server-side session store), so logging out is purely a client-side
// concern — no backend call needed. Removes the auth keys specifically
// (not localStorage.clear()) so unrelated data like site_language survives.
export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/'
}
