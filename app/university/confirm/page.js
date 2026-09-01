'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../../lib/i18n/LanguageContext'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function ConfirmUniversity() {
  const { t } = useLanguage()
  const [state, setState] = useState('working')
  const [university, setUniversity] = useState('')

  useEffect(() => {
    // Read off window.location rather than useSearchParams(), which would drag
    // a Suspense boundary into an otherwise plain client page — the same call
    // the class creation page makes.
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setState('failed'); return }

    // The token is captured above, so drop it from the address bar. Otherwise
    // it stays in browser history and rides along in the Referer of the two
    // links on this page, both of which are same-origin and therefore send the
    // full URL.
    window.history.replaceState(null, '', window.location.pathname)

    fetch(`${API}/api/university/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setState('failed'); return }
        setUniversity(data.university || '')
        setState('done')
      })
      .catch(() => setState('failed'))
  }, [])

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      </nav>
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="font-display font-extrabold text-2xl text-navy mb-3">
          {state === 'working' && t('university.confirming')}
          {state === 'done' && t('university.confirmed')}
          {state === 'failed' && t('university.confirmFailed')}
        </p>
        {state === 'done' && university && (
          <p className="text-navy/60 mb-6">🎓 {university}</p>
        )}
        {state !== 'working' && (
          <a href="/profile" className="inline-block bg-brand-red text-white px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
            {t('common.profile')}
          </a>
        )}
      </div>
    </main>
  )
}
