// Service worker. Some browsers (notably older Android Chrome)
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

// Notifications on this device: the backend mirrors each in-app notification
// here (backend utils/push.js). Tapping one opens the page it is about,
// reusing a GongbuLeng tab if one is already open.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) {}
  event.waitUntil(self.registration.showNotification(data.title || 'GongbuLeng', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,
    data: { url: data.url || '/dashboard' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find(w => w.url.startsWith(self.location.origin))
    if (open) {
      await open.focus()
      return open.navigate(url)
    }
    return self.clients.openWindow(url)
  })())
})
