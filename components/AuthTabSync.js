'use client'
import { useEffect } from 'react'

// Logging out in one tab clears the 'token' key in localStorage, which
// fires a `storage` event in every OTHER open tab on the same origin (not
// the tab that made the change). Redirect those other tabs to the home
// page too, so a logout is reflected everywhere instead of leaving stale
// logged-in UI open elsewhere.
export default function AuthTabSync() {
  useEffect(() => {
    function handleStorageChange(event) {
      if (event.key === 'token' && event.newValue === null) {
        window.location.href = '/'
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return null
}
