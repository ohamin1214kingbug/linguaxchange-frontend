'use client'
import { useState } from 'react'
import Navbar from '../../components/Navbar'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { userCode } from '../../lib/userCode'
import { languageOptions, levelLabel } from '../../lib/languages'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// A lookup, not a directory. An empty box shows nothing rather than
// everyone: the point is reaching a person you already have in mind — the
// teacher from a class, whoever left you feedback — not browsing members.
export default function People() {
  const { t } = useLanguage()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const search = async e => {
    e?.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) { window.location.href = '/auth/login'; return }
    if (q.trim().length < 2) { setError(t('people.tooShort')); return }

    setSearching(true); setError('')
    try {
      const res = await fetch(`${API}/api/users/search?q=${encodeURIComponent(q.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || t('people.failed')); setResults(null) }
      else setResults(data)
    } catch (err) {
      setError(t('people.failed')); setResults(null)
    }
    setSearching(false)
  }

  const langName = code => {
    const match = languageOptions(t).find(l => l.code === code)
    return match ? `${match.flag} ${match.name}` : code
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-display font-extrabold text-2xl md:text-3xl text-navy mb-2">{t('people.title')}</h1>
        <p className="text-navy/60 mb-6">{t('people.subtitle')}</p>

        <form onSubmit={search} className="flex gap-2 mb-6">
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={t('people.placeholder')} maxLength={60}
            className="flex-1 border-2 border-navy/20 rounded-full px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none transition-colors"/>
          <button type="submit" disabled={searching}
            className="bg-brand-red text-white px-6 py-2.5 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-50">
            {searching ? t('people.searching') : t('people.search')}
          </button>
        </form>

        {error && <p className="text-brand-red text-sm font-bold mb-4">{error}</p>}

        {results && results.length === 0 && (
          <p className="text-navy/50 text-sm">{t('people.noMatches')}</p>
        )}

        {results && results.length > 0 && (
          <div className="space-y-3">
            {results.map(u => (
              <a key={u.id} href={`/teachers/${u.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 border-2 border-navy/10 hover:border-navy transition-colors">
                {u.photo_url ? (
                  <img src={u.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-navy/15 flex-shrink-0"/>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-teal flex items-center justify-center text-white font-display font-bold border-2 border-navy/15 flex-shrink-0">
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-navy truncate">{u.first_name} {u.last_name}</p>
                  {/* The code sits here on purpose: finding someone by name
                      is how you get the code the report form asks for. */}
                  <p className="text-navy/40 text-xs font-mono">{userCode(u.id)}</p>
                  <p className="text-navy/60 text-xs mt-0.5">
                    {u.teach_language
                      ? `${langName(u.teach_language)}${u.teach_level ? ` · ${levelLabel(u.teach_language, u.teach_level)}` : ''}`
                      : u.nationality || ''}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
