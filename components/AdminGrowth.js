'use client'
import { useState, useEffect } from 'react'
import { LANGUAGE_NAMES_EN } from '../lib/languages'

// The admin Growth tab (GET /api/admin/growth): how far members get, per
// week of sign-up, and learners vs classes per language. English only, like
// the rest of the admin page.
const STEPS = [
  ['signedUp', 'signed up', 'bg-brand-blue/30'],
  ['phoneVerified', 'phone verified (gets the 3 bananas)', 'bg-brand-teal/20'],
  ['profileDone', 'profile done (photo + teach + learn)', 'bg-brand-blue/15'],
  ['booked', 'booked a class', 'bg-brand-yellow/40'],
  ['attended', 'attended a class', 'bg-brand-green/40'],
  ['taught', 'taught (posted a class)', 'bg-brand-red/15'],
]
const pct = (n, of) => (of ? `${Math.round((n / of) * 100)}%` : '')

// Survey answers (GET /api/admin/survey), English labels like the rest of
// the admin page.
const SURVEY = [
  ['heard', 'How they heard', { instagram: '📸 Instagram', tiktok: '🎵 TikTok', youtube: '▶️ YouTube', poster: '📄 Poster', friend: '🧑‍🤝‍🧑 Friend', faculty: '🏫 Faculty / professor', google: '🔎 Google', other: '✏️ Other' }],
  ['who', 'Who they are', { ucm: '🎓 UCM student', erasmus: '🌍 Erasmus / exchange', other_uni: '🏛️ Other university', not_student: '💼 Not a student' }],
  ['goals', 'Why they learn', { speaking: '🗣️ Speaking', exam: '📝 Exam', travel: '✈️ Travel / abroad', career: '💼 Career', people: '🤝 Meeting people' }],
  ['times', "When they're free", { weekday_morning: '🌅 Weekday mornings', weekday_afternoon: '☀️ Weekday afternoons', weekday_evening: '🌙 Weekday evenings', weekend: '🗓️ Weekends' }],
]
const faculties = obj => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} ${n}`).join(', ')

function SurveyResults() {
  const [s, setS] = useState(null)
  useEffect(() => {
    fetch('/api/admin/survey', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null)).then(setS).catch(() => {})
  }, [])
  if (!s) return null
  return (
    <section className="bg-white rounded-2xl border-2 border-navy p-5">
      <h2 className="font-display font-bold text-navy mb-1">🗳️ Survey · {s.answered} answered</h2>
      {s.answered === 0 && <p className="text-navy/65 text-sm">No finished surveys yet. Members see it on their dashboard.</p>}
      {s.answered > 0 && SURVEY.map(([key, title, labels]) => {
        const max = Math.max(1, ...Object.values(s[key] || {}))
        return (
          <div key={key} className="mt-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-navy/55 mb-1.5">{title}</p>
            {Object.entries(labels).filter(([v]) => (s[key] || {})[v] > 0).sort((a, b) => s[key][b[0]] - s[key][a[0]]).map(([v, label]) => (
              <div key={v} className="flex items-center gap-2 mb-1">
                <div className="w-1/3 shrink-0"><div style={{ width: `${Math.max(6, (s[key][v] / max) * 100)}%` }} className="h-4 border-2 border-navy rounded bg-brand-yellow/30"/></div>
                <p className="text-sm font-bold text-navy">{label} · {s[key][v]}
                  {key === 'heard' && v === 'poster' && faculties(s.posterFaculties) && <span className="text-navy/55 font-semibold"> ({faculties(s.posterFaculties)})</span>}
                  {key === 'who' && v === 'ucm' && faculties(s.ucmFaculties) && <span className="text-navy/55 font-semibold"> ({faculties(s.ucmFaculties)})</span>}
                </p>
              </div>
            ))}
          </div>
        )
      })}
      {s.heardOther?.length > 0 && <p className="text-sm text-navy mt-3"><b>“Other” sources:</b> {s.heardOther.join(' · ')}</p>}
      {s.ideas?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-navy/55 mb-1">Latest ideas</p>
          <ul className="list-disc pl-5 text-sm text-navy space-y-0.5">{s.ideas.map((idea, i) => <li key={i}>{idea}</li>)}</ul>
        </div>
      )}
    </section>
  )
}

export default function AdminGrowth() {
  const [g, setG] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/growth', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setG(d) })
      .catch(e => setError(e.message || 'Could not load growth numbers'))
  }, [])

  if (error) return <p className="text-brand-red font-bold text-sm">{error}</p>
  if (!g) return <p className="text-navy/65">Loading...</p>
  const top = g.totals.signedUp || 1

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl border-2 border-navy p-5">
        <h2 className="font-display font-bold text-navy mb-3">📈 All members so far</h2>
        <div className="space-y-1.5">
          {STEPS.map(([key, label, tone]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-1/2 shrink-0">
                <div style={{ width: `${Math.max(4, (g.totals[key] / top) * 100)}%` }} className={`h-6 border-2 border-navy rounded-md ${tone}`}/>
              </div>
              <p className="text-sm font-bold text-navy min-w-0">
                {g.totals[key]} {label} <span className="text-navy/55 font-semibold">{key !== 'signedUp' && pct(g.totals[key], g.totals.signedUp)}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border-2 border-navy p-5 overflow-x-auto">
        <h2 className="font-display font-bold text-navy mb-1">By week of sign-up</h2>
        <p className="text-navy/65 text-xs mb-3">Members who signed up that week (Monday start), and how many of them reached each step since.</p>
        <table className="w-full text-sm text-navy">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-navy/55">
            <th className="py-1.5 pr-3">Week</th>{STEPS.map(([key, label]) => <th key={key} className="py-1.5 pr-3">{label.split(' (')[0]}</th>)}
          </tr></thead>
          <tbody>
            {g.weeks.map(w => (
              <tr key={w.week} className="border-t border-navy/10">
                <td className="py-1.5 pr-3 whitespace-nowrap">{w.week === 'earlier' ? 'Earlier' : w.week}</td>
                {STEPS.map(([key]) => (
                  <td key={key} className={`py-1.5 pr-3 font-bold ${key === 'booked' && w.signedUp >= 3 && w.booked / w.signedUp < 0.25 ? 'text-amber-700' : ''}`}>
                    {w[key]} <span className="text-[11px] text-navy/55 font-semibold">{key !== 'signedUp' && w.signedUp ? pct(w[key], w.signedUp) : ''}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-2xl border-2 border-navy p-5 overflow-x-auto">
        <h2 className="font-display font-bold text-navy mb-1">Languages: learners vs classes</h2>
        <p className="text-navy/65 text-xs mb-3">Biggest gap first. Learners = members who listed it as a language they learn; classes = sessions coming up.</p>
        <table className="w-full text-sm text-navy">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-navy/55">
            <th className="py-1.5 pr-3">Language</th><th className="py-1.5 pr-3">Learners</th><th className="py-1.5 pr-3">Teachers</th><th className="py-1.5 pr-3">Classes coming up</th>
          </tr></thead>
          <tbody>
            {g.languages.map(l => (
              <tr key={l.code} className="border-t border-navy/10">
                <td className="py-1.5 pr-3 font-bold">{LANGUAGE_NAMES_EN[l.code] || l.code}</td>
                <td className="py-1.5 pr-3">{l.learners}</td>
                <td className={`py-1.5 pr-3 ${l.learners > 0 && l.teachers === 0 ? 'text-brand-red font-bold' : ''}`}>{l.teachers}</td>
                <td className={`py-1.5 pr-3 ${l.learners > 0 && l.upcoming === 0 ? 'text-brand-red font-bold' : ''}`}>{l.upcoming}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <SurveyResults />
    </div>
  )
}
