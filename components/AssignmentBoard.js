'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { levelLabel } from '../lib/languages'
import AssignmentForm from './AssignmentForm'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function AssignmentBoard({ language, currentUser, langs }) {
  const { t } = useLanguage()
  const [requests, setRequests] = useState([])
  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const load = () => {
    const qs = language && language !== 'all' ? `?language_code=${language}` : ''
    fetch(`${API}/api/assignments${qs}`)
      .then(r => r.json())
      .then(d => setRequests(Array.isArray(d) ? d : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))

    // The board drops a request at 72 hours. A student whose request was
    // answered at hour 70 would otherwise lose access to feedback they paid
    // for — the notification carries no link, so this list is the only route
    // back to it. Deliberately unfiltered by language: it is your own list,
    // not a search.
    if (!currentUser) { setMine([]); return }
    fetch(`${API}/api/assignments/mine`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => (r.ok ? r.json() : []))
      .then(d => setMine(Array.isArray(d) ? d : []))
      .catch(() => setMine([]))
  }

  useEffect(load, [language, currentUser])

  const card = (r, showExpiry) => {
    const answered = (r.assignment_feedback || []).length > 0
    const expired = new Date(r.expires_at) <= new Date()
    return (
      <a key={r.id} href={`/assignments/${r.id}`}
        className="block bg-white border-2 border-navy rounded-2xl p-5 mb-4 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{langs[r.language_code]?.flag}</span>
          {r.level && (
            <span className="bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">
              {levelLabel(r.language_code, r.level)}
            </span>
          )}
          {/* Answered wins over expired: once someone has written feedback the
              request's expiry stops mattering to the student, and "expired" on
              a request that actually got answered reads as a failure. */}
          <span className={`ml-auto text-xs font-bold ${answered ? 'text-brand-teal' : expired ? 'text-navy/40' : 'text-navy/50'}`}>
            {answered
              ? t('assignments.answered')
              : showExpiry && expired
                ? t('assignments.expired')
                : t('assignments.awaiting')}
          </span>
        </div>
        <p className="font-display font-bold text-navy">{r.prompt}</p>
        <p className="text-navy/60 text-sm mt-1 line-clamp-2">{r.body}</p>
      </a>
    )
  }

  return (
    <div>
      {currentUser && (
        <button onClick={() => setPosting(p => !p)}
          className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy mb-6">
          {t('assignments.post')}
        </button>
      )}

      {posting && <AssignmentForm onPosted={() => { setPosting(false); load() }} />}

      {mine.length > 0 && (
        <div className="mb-8">
          <p className="font-display font-extrabold text-navy mb-3">{t('assignments.mine')}</p>
          {mine.map(r => card(r, true))}
          <p className="font-display font-extrabold text-navy mb-3 mt-8">{t('assignments.openBoard')}</p>
        </div>
      )}

      {loading && <p className="text-navy/40">…</p>}

      {!loading && requests.length === 0 && (
        <p className="text-navy/60">{t('assignments.boardEmpty')}</p>
      )}

      {requests.map(r => card(r, false))}
    </div>
  )
}
