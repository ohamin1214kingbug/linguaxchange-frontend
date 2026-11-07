// Notifications on this device (phone or browser), mirroring the in-app bell.
// Everything here is best effort: a browser without push support, a member
// who says no, or a backend without keys all just leave the switch off.
const API = ''

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// iPhones only allow web push for a site added to the Home Screen, and until
// then expose no PushManager at all — so say so instead of hiding the option.
export function needsHomeScreen() {
  if (typeof window === 'undefined') return false
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const installed = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone
  return ios && !installed
}

export async function serverKey() {
  try {
    const res = await fetch(`${API}/api/push/key`)
    return res.ok ? (await res.json()).key : null
  } catch (e) {
    return null
  }
}

// The VAPID key arrives base64url-encoded; subscribe() wants raw bytes.
export function keyToBytes(base64url) {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0))
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration()
  return reg ? reg.pushManager.getSubscription() : null
}

export async function pushIsOn() {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  return !!(await currentSubscription().catch(() => null))
}

// Returns 'on', 'denied' (the member or browser said no) or 'failed'.
export async function turnPushOn(key) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) })
    const res = await fetch(`${API}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(sub.toJSON()),
    })
    return res.ok ? 'on' : 'failed'
  } catch (e) {
    return 'failed'
  }
}

// Also called on logout, so a shared computer stops receiving the previous
// member's notifications.
export async function turnPushOff(token = localStorage.getItem('token')) {
  try {
    const sub = await currentSubscription()
    if (!sub) return
    if (token) {
      await fetch(`${API}/api/push/subscribe`, {
        method: 'DELETE',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
    }
    await sub.unsubscribe()
  } catch (e) {}
}
