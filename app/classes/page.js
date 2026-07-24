'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import LanguageSwitcher from '../../components/LanguageSwitcher'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function Classes() {
  const { t } = useLanguage()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [joining, setJoining] = useState(null)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)
  const [credits, setCredits] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/classes`)
      .then(res => res.json())
      .then(data => {
        setClasses(Array.isArray(data) ? data : [])
        setLoading(false)
      })

    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (stored && token) {
      const u = JSON.parse(stored)
      setCurrentUser(u)
      fetch(`${API}/api/credits`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setCredits(d?.balance ?? null))
    }
  }, [])

  const joinClass = async (cls) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const token = localStorage.getItem('token')
    if (!user || !token) {
      window.location.href = '/auth/login'
      return
    }
    setJoining(cls.id)
    try {
      const res = await fetch(`${API}/api/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ class_id: cls.id })
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || t('classes.errorJoinClass'))
        setMessageOk(false)
      } else {
        setMessage(t('classes.successfullyJoined'))
        setMessageOk(true)
        fetch(`${API}/api/credits`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => setCredits(d?.balance ?? null))
      }
    } catch (e) {
      setMessage(t('common.connectionError'))
      setMessageOk(false)
    }
    setJoining(null)
  }

  const LANGS = {
    KO: { flag: '🇰🇷', name: t('home.langKorean') },
    ES: { flag: '🇪🇸', name: t('home.langSpanish') },
    DE: { flag: '🇩🇪', name: t('home.langGerman') },
    EN: { flag: '🇬🇧', name: t('home.langEnglish') },
    PT: { flag: '🇧🇷', name: t('home.langPortuguese') },
  }

  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

  const filtered = classes
    .filter(c => filter === 'all' || c.language_code === filter)
    .filter(c => levelFilter === 'all' || c.level === levelFilter)

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <div className="flex gap-3 md:gap-4 items-center">
          <a href="/dashboard" className="hidden sm:block text-navy/70 font-medium hover:text-navy">{t('common.dashboard')}</a>
          <LanguageSwitcher />
          {credits !== null && (
            <span className="bg-brand-yellow/15 text-navy px-3 py-1 rounded-full text-sm font-bold border-2 border-brand-yellow">
              ⚡ {credits} {t('common.credits')}
            </span>
          )}
          <a href="/classes/create" className="bg-brand-red text-white px-3 md:px-4 py-2 rounded-full text-sm font-bold border-2 border-navy">+ {t('classes.createClass')}</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-display font-extrabold text-2xl md:text-3xl text-navy mb-6 md:mb-8">{t('classes.browseClasses')}</h1>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${messageOk ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>
            {message}
          </div>
        )}

        <div className="flex gap-3 mb-4 flex-wrap">
          {['all', 'KO', 'ES', 'DE', 'EN', 'PT'].map(lang => (
            <button key={lang} onClick={() => setFilter(lang)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${filter === lang ? 'bg-brand-red text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
              {lang === 'all' ? t('classes.all') : `${LANGS[lang].flag} ${LANGS[lang].name}`}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {['all', ...LEVELS].map(level => (
            <button key={level} onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${levelFilter === level ? 'bg-navy text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
              {level === 'all' ? t('classes.allLevels') : level}
            </button>
          ))}
        </div>

        {loading && <p className="text-navy/40">{t('classes.loadingClasses')}</p>}

        <div className="space-y-4">
          {filtered.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl p-4 md:p-6 border-2 border-navy">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{LANGS[cls.language_code]?.flag}</span>
                    <span className="bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">{cls.level}</span>
                    <span className="bg-navy/5 text-navy/60 px-2 py-0.5 rounded-full text-xs font-medium">{cls.duration_minutes} {t('classes.min')}</span>
                  </div>
                  <h3 className="font-display font-bold text-navy text-lg mb-1">{cls.title}</h3>
                  {cls.description && <p className="text-navy/60 text-sm mb-2">{cls.description}</p>}
                  {cls.class_sessions?.[0]?.session_date && (
                    <p className="text-brand-red text-xs font-bold mb-1">
                      🗓️ {new Date(cls.class_sessions[0].session_date).toLocaleString()}
                    </p>
                  )}
                  <p className="text-navy/40 text-xs">
                    {cls.topic} · {t('classes.maxStudents', { n: cls.max_students })}
                    {cls.teacher && (
                      <>
                        {' · '}
                        <a href={`/teachers/${cls.teacher.id}`}
                          className="text-brand-red font-bold hover:underline">
                          {cls.teacher.first_name} {cls.teacher.last_name}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <span className="text-navy/70 text-sm font-bold">{t('classes.oneCredit')}</span>
                  <button onClick={() => joinClass(cls)}
                    disabled={joining === cls.id}
                    className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
                    {joining === cls.id ? t('classes.joining') : t('classes.joinClass')}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-navy/40 text-center py-12">{t('classes.noClassesYet')}</p>
          )}
        </div>
      </div>
    </main>
  )
}
