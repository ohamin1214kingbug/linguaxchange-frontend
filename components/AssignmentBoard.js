'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { levelLabel } from '../lib/languages'
import AssignmentForm from './AssignmentForm'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function AssignmentBoard({ language, currentUser, langs }) {
  const { t } = useLanguage()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const load = () => {
    const qs = language && language !== 'all' ? `?language_code=${language}` : ''
    fetch(`${API}/api/assignments${qs}`)
      .then(r => r.json())
      .then(d => setRequests(Array.isArray(d) ? d : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [language])

  return (
    <div>
      {currentUser && (
        <button onClick={() => setPosting(p => !p)}
          className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy mb-6">
          {t('assignments.post')}
        </button>
      )}

      {posting && <AssignmentForm onPosted={() => { setPosting(false); load() }} />}

      {loading && <p className="text-navy/40">…</p>}

      {!loading && requests.length === 0 && (
        <p className="text-navy/60">{t('assignments.boardEmpty')}</p>
      )}

      {requests.map(r => {
        const answered = (r.assignment_feedback || []).length > 0
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
              <span className={`ml-auto text-xs font-bold ${answered ? 'text-brand-teal' : 'text-navy/50'}`}>
                {answered ? t('assignments.answered') : t('assignments.awaiting')}
              </span>
            </div>
            <p className="font-display font-bold text-navy">{r.prompt}</p>
            <p className="text-navy/60 text-sm mt-1 line-clamp-2">{r.body}</p>
          </a>
        )
      })}
    </div>
  )
}
