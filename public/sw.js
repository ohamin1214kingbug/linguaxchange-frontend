// Minimal no-op service worker. Some browsers (notably older Android Chrome)
// require an active service worker for the "Add to Home Screen" install
// prompt to fire at all, even with zero offline functionality. This one
// intentionally does not cache anything or intercept fetches — offline
// support is a separate feature, not part of this one.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
