'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import StreakCalendar from './StreakCalendar'
import { logout } from '../lib/auth'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const NOTIFICATIONS_POLL_MS = 30 * 1000
// Mirrors LOW_CREDIT_THRESHOLD in the backend's utils/lowCreditNudge.js — the
// balance at which it already emails "you're running low".
const LOW_BANANAS = 1

function timeAgo(iso, t) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return t('nav.justNow')
  if (minutes < 60) return t('nav.minutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('nav.hoursAgo', { n: hours })
  return t('nav.daysAgo', { n: Math.floor(hours / 24) })
}

// A live class is the one place a notification should skip the dashboard
// and drop the user straight into the call.
function notificationHref(n) {
  if (n.type === 'class_started' && n.class_session_id) return `/classroom/${n.class_session_id}`
  // Someone answered a request you posted or backed — the class is on the
  // browse page waiting to be joined, not on your dashboard yet.
  if (n.type === 'request_fulfilled') return '/classes'
  return '/dashboard'
}

// Tailwind's scanner needs literal class strings, not interpolated ones —
// hence the two full variants rather than a templated `w-${size}`.
function Avatar({ user, size = 'sm' }) {
  const sizeClass = size === 'md' ? 'w-9 h-9' : 'w-8 h-8'
  return user.photo_url ? (
    <img src={user.photo_url} alt={user.first_name}
      className={`${sizeClass} rounded-full object-cover border-2 border-navy`} />
  ) : (
    <div className={`${sizeClass} bg-brand-red rounded-full flex items-center justify-center text-white font-display font-bold text-sm border-2 border-navy`}>
      {user.first_name?.[0]?.toUpperCase()}
    </div>
  )
}

export default function Navbar() {
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(null)
  const [streak, setStreak] = useState(null)
  const [needsPhone, setNeedsPhone] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showCreditsTip, setShowCreditsTip] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) return
    const parsedUser = JSON.parse(stored)
    setUser(parsedUser)

    const headers = { Authorization: `Bearer ${token}` }

    // A 401 means the token is genuinely dead — expired, revoked by a logout
    // or password reset, or invalidated by a JWT_SECRET rotation. A network
    // blip throws instead, so it never lands here.
    //
    // This is why the balance "disappeared": every authed call was 401ing, and
    // `d?.balance ?? null` turned that into null, which hides the badge. The
    // page still looked signed in because the streak comes from
    // GET /api/users/:id, which is public and kept working. Sign the dead
    // session out instead of rendering a half-broken navbar.
    const authed = (path) =>
      fetch(`${API}${path}`, { headers }).then(r => {
        if (r.status === 401) { logout(); return null }
        return r.json()
      })

    const fetchCredits = () => {
      authed('/api/credits').then(d => d && setCredits(d.balance ?? 0))
    }
    fetchCredits()
    fetch(`${API}/api/users/${parsedUser.id}`, { headers }).then(r => r.json()).then(d => setStreak(d?.current_streak ?? 0))

    // A Google sign-up is sent to /auth/verify-phone once, on its very first
    // login (app/auth/callback/page.js gates on isNewUser). Skip it and there
    // is no route back: nothing else in the app links there, so the account
    // sits without its signup grant and without any way to claim it.
    authed('/api/auth/me').then(d => d && setNeedsPhone(d.phone_verified === false))

    const fetchNotifications = () => {
      authed('/api/notifications').then(d => setNotifications(Array.isArray(d) ? d : []))
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, NOTIFICATIONS_POLL_MS)

    // Other pages fire this after an action that changes the balance (join,
    // cancel) so the badge doesn't sit stale until the next navigation.
    window.addEventListener('credits-changed', fetchCredits)
    return () => {
      clearInterval(interval)
      window.removeEventListener('credits-changed', fetchCredits)
    }
  }, [])

  const markRead = (id) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    fetch(`${API}/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).catch(() => {})
  }

  const unreadCount = notifications.filter(n => !n.read_at).length
  // "1 bananas" reads wrong, and the count shows in both the tooltip and the
  // dropdown heading — so pick the wording once.
  const bananaLabel = credits === 1
    ? t('common.bananasCountOne')
    : t('common.bananasCount', { n: credits })

  // The banana is the one invented concept on this site, and until now it was
  // never explained anywhere — the homepage mentions "1 free banana" and
  // leaves a stranger to guess. Shown once, on the first open of this menu,
  // then never again.
  //
  // Read in an effect rather than during render: localStorage does not exist
  // on the server, and reading it while rendering would make the first client
  // paint disagree with the server's and trip a hydration mismatch.
  const [bananaExplained, setBananaExplained] = useState(true)
  useEffect(() => {
    try {
      setBananaExplained(localStorage.getItem('bananaExplained') === '1')
    } catch (e) {
      // Private mode, or storage blocked. Treat as explained rather than
      // showing the panel on every single open.
      setBananaExplained(true)
    }
  }, [])

  const dismissBananaExplainer = () => {
    setBananaExplained(true)
    try { localStorage.setItem('bananaExplained', '1') } catch (e) {}
  }

  return (
    <>
    {needsPhone && (
      <div className="bg-brand-yellow/20 border-b-2 border-brand-yellow px-4 md:px-8 py-2.5 flex items-center justify-center gap-3 flex-wrap text-center">
        <span className="text-navy text-sm font-medium">📱 {t('nav.verifyPhoneBanner')}</span>
        <a href="/auth/verify-phone"
          className="bg-navy text-white px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap hover:bg-navy/90 transition-colors">
          {t('nav.verifyPhoneCta')}
        </a>
      </div>
    )}
    <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
      <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      <div className="flex gap-3 md:gap-4 items-center">
        <a href="/classes" className="hidden sm:block text-navy/70 font-medium hover:text-navy">{t('common.exploreShort')}</a>
        <a href="/resources" className="text-navy/70 font-medium hover:text-navy">{t('nav.resources')}</a>
        <LanguageSwitcher />

        {!user && (
          <a href="/auth/login" className="text-navy/70 font-medium hover:text-navy">{t('common.signIn')}</a>
        )}

        {user && (
          <>
            {!!streak && <StreakCalendar userId={user.id} streakCount={streak} />}
            {credits !== null && (
              <div className="relative">
                {/* Low state mirrors LOW_CREDIT_THRESHOLD in the backend's
                    utils/lowCreditNudge.js rather than inventing a number, so
                    the badge turns amber at exactly the balance that already
                    triggers the low-balance email. */}
                <button onClick={() => setShowCreditsTip(o => !o)}
                  title={bananaLabel}
                  className={`px-3 py-1 rounded-full text-sm font-bold border-2 transition-colors ${
                    credits <= LOW_BANANAS
                      ? 'bg-brand-red/10 text-brand-red border-brand-red/40 hover:bg-brand-red/20'
                      : 'bg-brand-yellow/15 text-navy border-brand-yellow hover:bg-brand-yellow/25'}`}>
                  🍌 {credits}
                </button>
                {showCreditsTip && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCreditsTip(false)} />
                    <div className="absolute right-0 mt-2 bg-white border-2 border-navy rounded-xl z-20 w-64 shadow-lg overflow-hidden">
                      {!bananaExplained ? (
                        /* First open only. The links are deliberately not
                           rendered yet: someone who has never been told what a
                           banana is cannot make sense of "spend one to join",
                           and a panel they can scroll past is a panel they
                           will scroll past. */
                        <div className="bg-brand-yellow/25 px-4 py-4 text-center">
                          {/* The source PNG has no alpha, so the teal ground
                              is baked in — cropped to a circle it reads as a
                              deliberate badge rather than a pasted rectangle. */}
                          <img src="/banana-monkey.png" alt=""
                            className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-navy object-cover" />
                          <p className="font-display font-extrabold text-navy text-sm">
                            {t('common.bananaWhatTitle')}
                          </p>
                          <p className="text-navy text-xs mt-1.5 leading-relaxed">
                            {t('common.bananaWhatRule')}
                          </p>
                          <p className="text-navy/60 text-xs mt-1">
                            {t('common.bananaWhatNoMoney')}
                          </p>
                          <button onClick={dismissBananaExplainer}
                            className="mt-3 w-full bg-navy text-white rounded-full py-2 text-sm font-bold hover:bg-navy/90 transition-colors">
                            {t('common.bananaWhatGotIt')}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="px-4 py-3 border-b border-navy/10">
                            <p className="font-display font-extrabold text-navy">
                              {bananaLabel}
                            </p>
                            <p className="text-navy/60 text-xs mt-0.5">
                              {credits <= LOW_BANANAS ? t('common.bananasLow') : t('common.creditsTip')}
                            </p>
                          </div>
                          {/* Teaching is the only way to earn, so it leads when
                              you're low — browsing costs a banana you don't have. */}
                          <a href="/classes/create" className="block px-4 py-2.5 text-sm font-bold text-navy hover:bg-cream transition-colors">{t('classes.createClass')} →</a>
                          <a href="/classes" className="block px-4 py-2.5 text-sm font-bold text-navy hover:bg-cream transition-colors">{t('classes.browseClasses')} →</a>
                          <a href="/dashboard" className="block px-4 py-2.5 text-sm font-medium text-navy/70 hover:bg-cream transition-colors border-t border-navy/10">{t('dashboard.creditHistory')} →</a>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="relative">
              <button onClick={() => setShowNotifications(o => !o)} aria-label={t('nav.notifications')}
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-cream transition-colors text-lg">
                🔔
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 bg-brand-red text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 bg-white border-2 border-navy rounded-xl z-20 w-72 shadow-lg overflow-hidden max-h-96 overflow-y-auto">
                    <p className="px-4 py-3 text-sm font-bold text-navy border-b border-navy/10">{t('nav.notifications')}</p>
                    {notifications.length === 0 && (
                      <p className="px-4 py-6 text-sm text-navy/40 text-center">{t('nav.noNotifications')}</p>
                    )}
                    {notifications.map(n => (
                      <a key={n.id} href={notificationHref(n)} onClick={() => markRead(n.id)}
                        className={`block px-4 py-3 text-sm border-b border-navy/5 hover:bg-cream transition-colors last:border-0 ${!n.read_at ? 'bg-brand-red/5' : ''}`}>
                        <p className={!n.read_at ? 'text-navy font-medium' : 'text-navy/60'}>{n.message}</p>
                        <p className="text-navy/40 text-xs mt-0.5">{timeAgo(n.created_at, t)}</p>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setShowProfileMenu(o => !o)}>
                <Avatar user={user} />
              </button>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-2 bg-white border-2 border-navy rounded-xl z-20 w-56 shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-navy/10 flex items-center gap-3">
                      <Avatar user={user} size="md" />
                      <p className="font-bold text-navy text-sm">{user.first_name} {user.last_name}</p>
                    </div>
                    <a href="/" className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-cream transition-colors">{t('nav.home')}</a>
                    <a href="/profile" className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-cream transition-colors">{t('common.profile')}</a>
                    <a href="/dashboard" className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-cream transition-colors">{t('common.dashboard')}</a>
                    <a href="/history" className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-cream transition-colors">{t('nav.myClasses')}</a>
                    <a href="/saved-teachers" className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-cream transition-colors">{t('nav.savedTeachers')}</a>
                    <a href="/settings" className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-cream transition-colors">{t('nav.settings')}</a>
                    <button onClick={() => window.confirm(t('common.logoutConfirm')) && logout()}
                      className="block w-full text-left px-4 py-2.5 text-sm font-medium text-brand-red hover:bg-cream transition-colors border-t border-navy/10">
                      {t('common.logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
    </>
  )
}
