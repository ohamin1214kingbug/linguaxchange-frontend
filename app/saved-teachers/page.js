'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// A code is just 'U' + the user's own db id, so finding someone by code is
// finding them by id — no separate lookup endpoint needed, reuses the
// existing public GET /api/users/:id.
const codeToId = code => parseInt(code.replace(/^u/i, ''), 10)

export default function SavedTeachers() {
  const router = useRouter()
  const { t } = useLanguage()
  const [code, setCode] = useState('')
  const [found, setFound] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [searching, setSearching] = useState(false)
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const LANGS = {
    KO: { flag: '🇰🇷', name: t('home.langKorean') },
    ES: { flag: '🇪🇸', name: t('home.langSpanish') },
    DE: { flag: '🇩🇪', name: t('home.langGerman') },
    EN: { flag: '🇬🇧', name: t('home.langEnglish') },
    PT: { flag: '🇧🇷', name: t('home.langPortuguese') },
    FR: { flag: '🇫🇷', name: t('home.langFrench') },
    IT: { flag: '🇮🇹', name: t('home.langItalian') },
  }

  const token = () => localStorage.getItem('token')

  const fetchSaved = () => {
    fetch(`${API}/api/saved-teachers`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => setSaved(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!localStorage.getItem('user') || !token()) { router.push('/auth/login'); return }
    fetchSaved()
  }, [])

  const search = async () => {
    setSearchError('')
    setFound(null)
    const id = codeToId(code.trim())
    if (!id) { setSearchError('savedTeachers.invalidCode'); return }
    setSearching(true)
    try {
      const res = await fetch(`${API}/api/users/${id}`)
      if (!res.ok) { setSearchError('savedTeachers.notFound'); return }
      const user = await res.json()
      if (!user.teach_language) { setSearchError('savedTeachers.notATeacher'); return }
      setFound(user)
    } catch (e) {
      setSearchError('common.connectionError')
    }
    setSearching(false)
  }

  const save = async (id) => {
    setBusy(true)
    const res = await fetch(`${API}/api/saved-teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ teacher_id: id })
    })
    if (res.ok) {
      setFound(null)
      setCode('')
      fetchSaved()
    } else {
      const data = await res.json()
      setSearchError(data.error || 'common.connectionError')
    }
    setBusy(false)
  }

  const unsave = async (id) => {
    setBusy(true)
    await fetch(`${API}/api/saved-teachers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    })
    fetchSaved()
    setBusy(false)
  }

  const isSaved = id => saved.some(t => t.id === id)

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">{t('savedTeachers.title')}</h1>
        <p className="text-navy/60 mb-8">{t('savedTeachers.subtitle')}</p>

        <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-8">
          <label className="block text-sm font-bold text-navy mb-2">{t('savedTeachers.findLabel')}</label>
          <div className="flex gap-2">
            <input value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="U000007"
              className="flex-1 border-2 border-navy/20 rounded-xl px-4 py-2.5 font-mono focus:border-brand-red focus:outline-none transition-colors"/>
            <button onClick={search} disabled={searching || !code.trim()}
              className="bg-navy text-white px-5 py-2.5 rounded-xl font-bold border-2 border-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
              {searching ? t('savedTeachers.searching') : t('savedTeachers.find')}
            </button>
          </div>

          {searchError && <p className="text-brand-red text-sm font-medium mt-3">{t(searchError)}</p>}

          {found && (
            <div className="flex items-start justify-between gap-4 mt-4 p-4 bg-cream rounded-xl border-2 border-navy/10">
              <div className="flex items-start gap-3 min-w-0">
                {found.photo_url ? (
                  <img src={found.photo_url} alt={found.first_name} className="w-10 h-10 rounded-full object-cover border-2 border-navy"/>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center text-white font-bold border-2 border-navy">
                    {found.first_name?.[0]?.toUpperCase()}
                  </div>
                )}
                {/* Same detail as a saved row — this is the card you decide
                    from, so it shouldn't show less than the list does after. */}
                <div className="min-w-0">
                  <p className="font-bold text-navy">
                    {found.first_name} {found.last_name}
                    {found.nationality && <span className="text-navy/40 font-medium text-sm"> · {found.nationality}</span>}
                  </p>
                  <p className="text-navy/50 text-xs">
                    {LANGS[found.teach_language]?.flag} {LANGS[found.teach_language]?.name}
                    {found.teach_level ? ` · ${found.teach_level}` : ''}
                  </p>
                  {found.bio && (
                    <p className="text-navy/60 text-sm mt-1 line-clamp-2">{found.bio}</p>
                  )}
                </div>
              </div>
              <button onClick={() => save(found.id)} disabled={busy || isSaved(found.id)}
                className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-50 whitespace-nowrap transition-colors">
                {isSaved(found.id) ? t('savedTeachers.alreadySaved') : t('savedTeachers.save')}
              </button>
            </div>
          )}
        </div>

        <h2 className="font-display font-bold text-navy mb-4">{t('savedTeachers.yourList', { n: saved.length })}</h2>

        {loading && <p className="text-navy/40">{t('common.loading')}</p>}

        <div className="space-y-3">
          {saved.map(teacher => (
            <div key={teacher.id} className="bg-white rounded-2xl p-4 border-2 border-navy flex items-start justify-between gap-4">
              <a href={`/teachers/${teacher.id}`} className="flex items-start gap-3 hover:opacity-80 transition-opacity min-w-0">
                {teacher.photo_url ? (
                  <img src={teacher.photo_url} alt={teacher.first_name} className="w-12 h-12 rounded-full object-cover border-2 border-navy flex-shrink-0"/>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-red flex items-center justify-center text-white font-bold border-2 border-navy flex-shrink-0">
                    {teacher.first_name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-navy">
                    {teacher.first_name} {teacher.last_name}
                    {teacher.nationality && <span className="text-navy/40 font-medium text-sm"> · {teacher.nationality}</span>}
                  </p>
                  <p className="text-navy/50 text-xs">
                    {LANGS[teacher.teach_language]?.flag} {LANGS[teacher.teach_language]?.name}
                    {teacher.teach_level ? ` · ${teacher.teach_level}` : ''}
                  </p>
                  {/* Clamped rather than truncated to one line: a bio is the
                      thing that actually distinguishes two saved teachers. */}
                  {teacher.bio && (
                    <p className="text-navy/60 text-sm mt-1 line-clamp-2">{teacher.bio}</p>
                  )}
                </div>
              </a>
              <button onClick={() => unsave(teacher.id)} disabled={busy}
                className="text-navy/40 hover:text-brand-red text-sm font-bold px-3 py-1.5 disabled:opacity-50 transition-colors whitespace-nowrap">
                {t('savedTeachers.remove')}
              </button>
            </div>
          ))}
          {!loading && saved.length === 0 && (
            <p className="text-navy/40 text-center py-12">{t('savedTeachers.empty')}</p>
          )}
        </div>
      </div>
    </main>
  )
}
