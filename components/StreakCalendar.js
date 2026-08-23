'use client'
import { useState } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { isSameDay, buildCalendarGrid } from '../lib/calendarGrid'
import { asUtcDate } from '../lib/timezone'
import { hasFinished } from '../lib/classSchedule'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// getWeekStart in utils/streak.js on the backend is the source of truth for
// which ISO week (Mon-Sun, UTC) a date falls in — mirrored here so "counted
// this week" reads the same way the streak counter itself does.
function weekStartUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const isoDay = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - (isoDay - 1))
  return d.getTime()
}

export default function StreakCalendar({ userId, streakCount }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activityDates, setActivityDates] = useState([]) // Date[]
  const [viewDate, setViewDate] = useState(() => new Date())

  const now = new Date()

  const load = async () => {
    if (loaded || loading) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [enrollments, classes] = await Promise.all([
        fetch(`${API}/api/enrollments`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/classes?teacher_id=${userId}`).then(r => r.json()).catch(() => [])
      ])

      // Attended: exactly what triggers the streak credit
      // (attended === true, set by POST /enrollments/:id/confirm).
      //
      // Taught: NOT classes.status === 'completed' — that flag needs a
      // separate admin action (routes/admin.js POST /classes/:id/complete)
      // that real usage almost never triggers, and the public list endpoint
      // this fetches from only ever returns status='approved' classes
      // anyway, so that condition could never match here regardless. Uses
      // the same "session has actually finished" rule /history already
      // shows as "taught" instead, so this calendar agrees with what the
      // teacher already sees marked Ended elsewhere in the app.
      const attended = (Array.isArray(enrollments) ? enrollments : [])
        .filter(e => e.attended && e.class_sessions?.session_date)
        .map(e => asUtcDate(e.class_sessions.session_date))

      const taught = (Array.isArray(classes) ? classes : [])
        .flatMap(c => (c.class_sessions || [])
          .filter(s => s.status !== 'cancelled' && hasFinished(s.session_date, c.duration_minutes))
          .map(s => asUtcDate(s.session_date)))

      setActivityDates([...attended, ...taught])
      setLoaded(true)
    } catch (e) {
      // Quiet failure: worst case the calendar shows no dots, streak count
      // above it is unaffected either way.
    }
    setLoading(false)
  }

  const toggle = () => {
    setOpen(o => !o)
    if (!open) load()
  }

  const grid = buildCalendarGrid(viewDate)
  const weekdayLabels = grid.slice(0, 7).map(({ date }) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date))
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(viewDate)

  const countedThisWeek = activityDates.some(d => weekStartUTC(d) === weekStartUTC(now))

  return (
    <div className="relative">
      <button onClick={toggle}
        className="hidden sm:inline-block bg-brand-red/10 text-brand-red px-3 py-1 rounded-full text-sm font-bold border-2 border-brand-red/30 hover:bg-brand-red/20 transition-colors">
        {t('dashboard.weekStreak', { n: streakCount })}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 bg-white border-2 border-navy rounded-xl z-20 w-72 shadow-lg overflow-hidden">
            <div className="bg-brand-red/10 px-4 py-3 border-b border-navy/10">
              <p className="font-display font-extrabold text-navy">
                {t('dashboard.weekStreak', { n: streakCount })}
              </p>
              <p className="text-navy/60 text-xs mt-0.5">
                {countedThisWeek ? t('nav.streakCountedThisWeek') : t('nav.streakKeepGoing')}
              </p>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-cream text-navy font-bold text-sm">‹</button>
                <span className="text-xs font-bold text-navy capitalize">{monthLabel}</span>
                <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-cream text-navy font-bold text-sm">›</button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-navy/40 mb-1">
                {weekdayLabels.map((w, i) => <div key={i}>{w}</div>)}
              </div>

              {loading ? (
                <p className="text-navy/40 text-xs text-center py-6">{t('common.loading')}</p>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {grid.map(({ date, inCurrentMonth }, i) => {
                    const isToday = isSameDay(date, now)
                    const active = inCurrentMonth && activityDates.some(d => isSameDay(d, date))
                    return (
                      <div key={i}
                        className={`h-7 w-7 flex items-center justify-center rounded-full text-xs mx-auto ${
                          !inCurrentMonth ? 'text-navy/15'
                          : active ? 'bg-brand-red text-white font-bold'
                          : isToday ? 'border-2 border-brand-red/50 text-navy font-bold'
                          : 'text-navy/70'}`}>
                        {date.getDate()}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <a href="/history" className="block px-4 py-3 text-sm font-bold text-brand-red text-center border-t border-navy/10 hover:bg-cream transition-colors">
              {t('nav.viewFullHistory')}
            </a>
          </div>
        </>
      )}
    </div>
  )
}
