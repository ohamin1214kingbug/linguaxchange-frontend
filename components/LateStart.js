'use client'
import { useState } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { formatInTimezone } from '../lib/timezone'

// The teacher's "Running late?" card on the class page (owner, 2026-11-27):
// moves a session's start by 5, 10 or 15 minutes, 15 in total, and the
// backend tells the booked students (POST /api/classes/sessions/:id/delay,
// rules in backend utils/classDelay.js). Shown from 30 minutes before the
// original start until the no-show cutoff, start + 15 minutes.
const MIN = 60 * 1000
const MAX = 15
const BTN = 'border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors disabled:opacity-40'

export function lateSession(sessions, now = Date.now()) {
  return (sessions || []).find(s => {
    if (s.status !== 'scheduled') return false
    const start = new Date(s.session_date).getTime()
    const original = start - (s.delayed_minutes || 0) * MIN
    return now >= original - 30 * MIN && now <= start + 15 * MIN && (s.delayed_minutes || 0) < MAX
  })
}

export default function LateStart({ session, user, onMoved }) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const delayed = session.delayed_minutes || 0
  const when = formatInTimezone(session.session_date, user?.timezone, user?.time_format)

  const move = async minutes => {
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/classes/sessions/${session.id}/delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ minutes }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) onMoved({ ...session, session_date: d.session_date, delayed_minutes: d.delayed_minutes })
      else setError(d.error || 'classDetail.lateFailed')
    } catch { setError('classDetail.lateFailed') }
    setBusy(false)
  }

  return (
    <section className="bg-white border-2 border-navy rounded-2xl shadow-[4px_4px_0_var(--color-navy)] p-4 mb-6">
      <p className="font-display font-extrabold text-navy text-lg">{delayed ? `✅ ${t('classDetail.lateMoved', { time: when })}` : `⏰ ${t('classDetail.lateTitle')}`}</p>
      <p className="text-navy/65 text-sm mt-0.5">{delayed ? t('classDetail.lateTold') : t('classDetail.lateBody', { time: when })}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {[5, 10, 15].filter(m => delayed + m <= MAX).map(m => (
          <button key={m} onClick={() => move(m)} disabled={busy} className={BTN}>+{m} min</button>
        ))}
      </div>
      {!delayed && <p className="text-navy/65 text-xs mt-2">{t('classDetail.lateNote')}</p>}
      {error && <p className="text-brand-red text-sm font-bold mt-2">{t(error)}</p>}
    </section>
  )
}
