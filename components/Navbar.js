'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../lib/i18n/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import StreakCalendar from './StreakCalendar'
import { logout } from '../lib/auth'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const NOTIFICATIONS_POLL_MS = 30 * 1000

// The sections you actually move between. These used to live only inside the
// avatar dropdown, so reaching your own dashboard took a click to open a menu
// that gave no clue which section you were already in — and on mobile the one
// visible link (Explore) was hidden entirely, leaving no text links at all.
const SECTIONS = [
  { href: '/classes', label: 'common.exploreShort' },
  { href: '/dashboard', label: 'common.dashboard' },
  { href: '/history', label: 'nav.myClasses' },
  { href: '/saved-teachers', label: 'nav.savedTeachers' }
]

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
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(null)
  const [streak, setStreak] = useState(null)
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
    const fetchCredits = () => {
      fetch(`${API}/api/credits`, { headers }).then(r => r.json()).then(d => setCredits(d?.balance ?? null))
    }
    fetchCredits()
    fetch(`${API}/api/users/${parsedUser.id}`, { headers }).then(r => r.json()).then(d => setStreak(d?.current_streak ?? 0))

    const fetchNotifications = () => {
      fetch(`${API}/api/notifications`, { headers })
        .then(r => r.json())
        .then(d => setNotifications(Array.isArray(d) ? d : []))
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

  // Signed out there's nothing personal to navigate to, so Explore is the
  // only section that means anything.
  const sections = user ? SECTIONS : SECTIONS.slice(0, 1)

  return (
    <>
    <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
      <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      <div className="flex gap-3 md:gap-4 items-center">
        {sections.map(s => (
          <a key={s.href} href={s.href}
            className={`hidden md:block font-medium transition-colors ${
              pathname === s.href
                ? 'text-brand-red font-bold'
                : 'text-navy/70 hover:text-navy'}`}>
            {t(s.label)}
          </a>
        ))}
        <LanguageSwitcher />

        {!user && (
          <a href="/auth/login" className="text-navy/70 font-medium hover:text-navy">{t('common.signIn')}</a>
        )}

        {user && (
          <>
            {!!streak && <StreakCalendar userId={user.id} streakCount={streak} />}
            {credits !== null && (
              <div className="relative">
                <button onClick={() => setShowCreditsTip(o => !o)}
                  className="bg-brand-yellow/15 text-navy px-3 py-1 rounded-full text-sm font-bold border-2 border-brand-yellow">
                  ⚡ {credits} {t('common.credits')}
                </button>
                {showCreditsTip && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCreditsTip(false)} />
                    <div className="absolute right-0 mt-2 bg-white border-2 border-navy rounded-xl z-20 w-56 shadow-lg overflow-hidden">
                      <p className="px-4 py-3 text-sm font-medium text-navy/80 border-b border-navy/10">{t('common.creditsTip')}</p>
                      <a href="/classes" className="block px-4 py-2.5 text-sm font-bold text-navy hover:bg-cream transition-colors">{t('classes.browseClasses')} →</a>
                      <a href="/classes/create" className="block px-4 py-2.5 text-sm font-bold text-navy hover:bg-cream transition-colors">{t('classes.createClass')} →</a>
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
                    {/* Dashboard/My classes/Saved teachers moved out to the
                        bar itself — leaving them here too would give the same
                        page two doors and neither would show you're on it.
                        Home is the logo. What's left is account-level. */}
                    <a href="/profile" className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-cream transition-colors">{t('common.profile')}</a>
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

    {/* Below md the icons alone fill the bar, so the sections get their own
        row rather than a burger menu — one tap instead of two, and the
        current section is still visible. Scrolls if the labels outgrow it. */}
    <div className="md:hidden flex gap-4 px-4 py-2.5 border-b border-navy/10 bg-white overflow-x-auto">
      {sections.map(s => (
        <a key={s.href} href={s.href}
          className={`whitespace-nowrap text-sm font-medium transition-colors ${
            pathname === s.href
              ? 'text-brand-red font-bold'
              : 'text-navy/70'}`}>
          {t(s.label)}
        </a>
      ))}
    </div>
    </>
  )
}
