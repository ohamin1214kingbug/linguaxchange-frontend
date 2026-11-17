'use client'
import { useState, useEffect } from 'react'

// Top of the admin page: the same "needs attention" list the daily email
// sends (GET /api/admin/attention). Shows a short all-clear when quiet.
export default function AdminAttention() {
  const [d, setD] = useState(null)

  useEffect(() => {
    fetch('/api/admin/attention', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null)).then(setD).catch(() => {})
  }, [])

  if (!d) return null
  const { alerts, stats } = d
  return (
    <section className={`rounded-2xl border-2 border-navy p-4 mb-6 ${alerts.length ? 'bg-white' : 'bg-brand-green/15'}`}>
      <h2 className="font-display font-bold text-navy">
        {alerts.length ? `🔔 ${alerts.length} thing${alerts.length === 1 ? '' : 's'} need${alerts.length === 1 ? 's' : ''} a look` : '✅ Nothing needs a look today'}
      </h2>
      {alerts.length > 0 && (
        <ul className="mt-2 space-y-2">
          {alerts.map((a, i) => (
            <li key={i} className={`border-2 border-navy rounded-xl px-3 py-2 text-sm text-navy ${a.level === 'red' ? 'bg-brand-red/10' : 'bg-brand-yellow/15'}`}>
              <b className="block">{a.level === 'red' ? '🚩' : '⚠️'} {a.title}</b>{a.text}
            </li>
          ))}
        </ul>
      )}
      <p className="text-navy/65 text-xs mt-2">
        Last 24 hours: {stats.newMembers} new member{stats.newMembers === 1 ? '' : 's'} ({stats.newVerified} verified their phone) · {stats.noShows} no-show{stats.noShows === 1 ? '' : 's'} · {stats.openReports} open report{stats.openReports === 1 ? '' : 's'}
      </p>
    </section>
  )
}
