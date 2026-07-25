'use client'
import { useEffect } from 'react'

// Registers the no-op service worker (see public/sw.js) so the install
// prompt can fire on browsers that require an active worker for it.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return null
}
