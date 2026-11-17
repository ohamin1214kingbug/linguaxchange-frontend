'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { formatInTimezone } from '../../lib/timezone'

const CATEGORY_LABEL = {
  harassment: 'teacher.reportCatHarassment',
  inappropriate_content: 'teacher.reportCatInappropriate',
  spam_or_scam: 'teacher.reportCatSpam',
  no_show: 'teacher.reportCatNoShow',
  other: 'teacher.reportCatOther',
}
// Report statuses (backend utils/reports.js) as the member sees them.
const STATUS = {
  pending: { step: 1, badge: 'myReports.statusSent', tone: 'bg-brand-yellow/25', note: 'myReports.noteSent' },
  reviewed: { step: 2, badge: 'myReports.statusLooking', tone: 'bg-brand-blue/20', note: 'myReports.noteLooking' },
  resolved: { step: 3, badge: 'myReports.statusAction', tone: 'bg-brand-teal/20', note: 'myReports.noteAction' },
  rejected: { step: 3, badge: 'myReports.statusClosed', tone: 'bg-navy/10', note: 'myReports.noteClosed' },
}
const OPEN = new Set(['pending', 'reviewed'])

function Steps({ status, t }) {
  const { step } = STATUS[status] || STATUS.pending
  const last = status === 'resolved' ? t('myReports.statusAction') : t('myReports.stepClosed')
  const labels = [t('myReports.stepSent'), t('myReports.stepLooking'), last]
  return (
    <ol className="flex mt-3" aria-label={t(STATUS[status]?.badge || 'myReports.statusSent')}>
      {labels.map((label, i) => {
        const done = i < step
        return (
          <li key={label} className={`flex-1 text-center text-[11px] font-bold relative ${done ? 'text-navy' : 'text-navy/40'}`}>
            {i > 0 && <span aria-hidden="true" className={`absolute top-[7px] right-1/2 w-full h-0.5 ${done ? 'bg-navy' : 'bg-navy/15'}`}/>}
            <span aria-hidden="true" className={`relative block w-4 h-4 mx-auto mb-1 rounded-full border-2 ${done ? 'bg-navy border-navy' : 'bg-white border-navy/30'}`}/>
            {label}
          </li>
        )
      })}
    </ol>
  )
}

// Reports this member sent, and what happened to them. Only the member and
// admins see these; the admin's notes are never sent here
// (GET /api/reports/mine).
export default function MyReports() {
  const router = useRouter()
  const { t } = useLanguage()
  const [reports, setReports] = useState(null)
  const [view, setView] = useState('all')
  const [me, setMe] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.replace('/auth/login'); return }
    try { setMe(JSON.parse(localStorage.getItem('user') || 'null')) } catch {}
    fetch('/api/reports/mine', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : [])).then(d => setReports(Array.isArray(d) ? d : [])).catch(() => setReports([]))
  }, [router])

  const list = (reports || []).filter(r => view === 'all' || (view === 'open') === OPEN.has(r.status))
  const openCount = (reports || []).filter(r => OPEN.has(r.status)).length

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-navy">{t('myReports.title')}</h1>
        <p className="text-navy/65 text-sm md:text-base mt-1 mb-5">{t('myReports.privacy')}</p>

        <div className="flex items-center gap-3 flex-wrap mb-5">
          <div className="flex gap-1 bg-white border-2 border-navy rounded-full p-1">
            {[['all', t('myReports.all'), (reports || []).length], ['open', t('myReports.open'), openCount], ['closed', t('myReports.closed'), (reports || []).length - openCount]].map(([key, label, n]) => (
              <button key={key} onClick={() => setView(key)} aria-pressed={view === key}
                className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${view === key ? 'bg-navy text-white' : 'text-navy/65 hover:text-navy'}`}>
                {label} ({n})
              </button>
            ))}
          </div>
          <Link href="/dashboard#report" className="ml-auto bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
            🚩 {t('dashboard.reportSomeone')}
          </Link>
        </div>

        {!reports && <p className="text-navy/65">{t('common.loading')}</p>}
        {reports && list.length === 0 && (
          <div className="bg-white border-2 border-navy rounded-2xl p-6 text-center text-navy/70">{t('myReports.empty')}</div>
        )}

        <div className="space-y-4">
          {list.map(r => {
            const s = STATUS[r.status] || STATUS.pending
            const isUser = r.report_type === 'user'
            return (
              <article key={r.id} className="bg-white rounded-2xl p-4 md:p-5 border-2 border-navy shadow-[4px_4px_0_var(--color-navy)]">
                <div className="flex items-center gap-3">
                  <span className={`w-12 h-12 shrink-0 border-2 border-navy overflow-hidden flex items-center justify-center font-display font-extrabold text-navy text-lg ${isUser ? 'rounded-full bg-brand-yellow/30' : 'rounded-xl bg-brand-yellow/20'}`}>
                    {isUser
                      ? (r.reported_photo ? <img src={r.reported_photo} alt="" className="w-full h-full object-cover"/> : (r.reported_name || '?')[0])
                      : '📚'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-extrabold text-navy text-lg leading-tight break-words">
                      {isUser ? t('myReports.member', { name: r.reported_name || '—' }) : t('myReports.class', { title: r.reported_name || '—' })}
                    </p>
                    <p className="text-navy/60 text-xs mt-0.5">
                      {t(CATEGORY_LABEL[r.category] || 'teacher.reportCatOther')} · {t('myReports.sent', { date: formatInTimezone(r.created_at, me?.timezone, me?.time_format) })}
                    </p>
                  </div>
                  <span className={`ml-auto shrink-0 border-2 border-navy rounded-full px-2.5 py-0.5 text-xs font-bold text-navy ${s.tone}`}>{t(s.badge)}</span>
                </div>
                {r.reason && <p className="bg-cream rounded-xl px-3 py-2 text-sm text-navy mt-3 whitespace-pre-line break-words">“{r.reason}”</p>}
                {r.files > 0 && <p className="text-navy/55 text-xs mt-2">📎 {t('myReports.files', { n: r.files })}</p>}
                <Steps status={r.status} t={t}/>
                <p className="text-navy/75 text-sm mt-2">{t(s.note)}</p>
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}
