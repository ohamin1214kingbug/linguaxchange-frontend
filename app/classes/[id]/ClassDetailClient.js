'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import Navbar from '../../../components/Navbar'
import { formatInTimezone, utcLabel } from '../../../lib/timezone'

const API = 'https://linguaxchange-backend-production.up.railway.app'

const card = 'bg-white rounded-2xl p-6 border-2 border-navy mb-6'

// `initialClass` comes from the server component in page.js. Seeding state with
// it is what puts the class into the server-rendered HTML: a client component
// is still prerendered on the server, but a useEffect fetch never runs during
// that pass, so this page used to ship an empty shell to crawlers. A null
// (the server fetch failed) falls back to fetching here, exactly as before.
export default function ClassDetailClient({ initialClass = null }) {
  const { id } = useParams()
  const { t } = useLanguage()
  const [cls, setCls] = useState(initialClass)
  const [roster, setRoster] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(!initialClass)
  const [materials, setMaterials] = useState(initialClass?.materials || '')
  // Session times are formatted in UTC on the server and on the first client
  // render, so the two agree exactly and there is no hydration mismatch to
  // suppress. After mount the viewer's own timezone applies.
  //
  // This has to be driven by state rather than left to React's hydration
  // repair: a logged-out visitor arriving from search triggers no other state
  // update at all — no stored user, no token, no stored language, and the class
  // already in hand — so nothing else would ever re-render the page.
  const [mounted, setMounted] = useState(false)
  const [savingMaterials, setSavingMaterials] = useState(false)
  const [materialsMessage, setMaterialsMessage] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)

  const LANGS = {
    KO: { flag: '🇰🇷', name: t('home.langKorean') },
    ES: { flag: '🇪🇸', name: t('home.langSpanish') },
    DE: { flag: '🇩🇪', name: t('home.langGerman') },
    EN: { flag: '🇬🇧', name: t('home.langEnglish') },
    PT: { flag: '🇧🇷', name: t('home.langPortuguese') },
    FR: { flag: '🇫🇷', name: t('home.langFrench') },
    IT: { flag: '🇮🇹', name: t('home.langItalian') },
  }

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('user')
    if (stored) setCurrentUser(JSON.parse(stored))

    // Only fetch when the server didn't already hand us the class — otherwise
    // this repeats a request whose answer is already on screen.
    if (!initialClass) {
      fetch(`${API}/api/classes/${id}`)
        .then(r => r.json())
        .then(data => {
          setCls(data.error ? null : data)
          setMaterials(data.materials || '')
        })
        .catch(() => setCls(null))
        .finally(() => setLoading(false))
    }

    // 403s for anyone who isn't the teacher/admin — the roster simply stays
    // null and its section never renders, so no special-casing needed here.
    const token = localStorage.getItem('token')
    if (token) {
      fetch(`${API}/api/classes/${id}/roster`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => setRoster(data?.error ? null : data))
        .catch(() => {})
    }
  }, [id])

  const saveMaterials = async () => {
    setSavingMaterials(true)
    setMaterialsMessage('')
    try {
      const res = await fetch(`${API}/api/classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ materials })
      })
      const data = await res.json()
      setMaterialsMessage(res.ok ? t('classDetail.materialsSaved') : (data.error || t('classDetail.materialsSaveFailed')))
      if (res.ok) setCls(c => ({ ...c, materials: data.materials }))
    } catch (e) {
      setMaterialsMessage(t('common.connectionError'))
    }
    setSavingMaterials(false)
  }

  // Sends { pdf: dataUrl } to upload, or { pdf: null } to remove. Same
  // base64-in-JSON shape the avatar upload uses, so the browser never needs
  // the Supabase anon key.
  const sendPdf = async (pdf) => {
    setUploadingPdf(true)
    setMaterialsMessage('')
    try {
      const res = await fetch(`${API}/api/classes/${id}/materials-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ pdf })
      })
      const data = await res.json()
      if (res.ok) {
        setCls(c => ({ ...c, lesson_plan_url: data.lesson_plan_url }))
        setMaterialsMessage(t(pdf ? 'classDetail.pdfUploaded' : 'classDetail.pdfRemoved'))
      } else {
        setMaterialsMessage(data.error || t('classDetail.pdfUploadFailed'))
      }
    } catch (e) {
      setMaterialsMessage(t('common.connectionError'))
    }
    setUploadingPdf(false)
  }

  const onPickPdf = (e) => {
    const file = e.target.files?.[0]
    // Reset the input so picking the same filename twice still fires change.
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') {
      setMaterialsMessage(t('classDetail.pdfOnly'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMaterialsMessage(t('classDetail.pdfTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => sendPdf(reader.result)
    reader.onerror = () => setMaterialsMessage(t('classDetail.pdfUploadFailed'))
    reader.readAsDataURL(file)
  }

  if (loading) return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <p className="text-navy/40 text-center py-20 font-medium">{t('common.loading')}</p>
    </main>
  )

  if (!cls) return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <p className="text-navy/40 text-center py-20 font-medium">{t('classDetail.notFound')}</p>
    </main>
  )

  // Materials stay editable after the class has happened — a recap or
  // homework handed out afterwards is normal teaching. Only a cancelled
  // class closes the door, which the backend enforces; the teacher would
  // have no route to it here anyway.
  const isTeacher = currentUser?.id === cls.teacher?.id
  const canEditMaterials = isTeacher && cls.status !== 'cancelled'

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <a href="/classes" className="text-brand-red text-sm font-bold hover:underline">← {t('classDetail.backToClasses')}</a>

        <div className="flex items-center gap-2 mt-4 mb-1">
          <span className="text-lg">{LANGS[cls.language_code]?.flag}</span>
          <span className="bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">{cls.level}</span>
          <span className="bg-navy/5 text-navy/60 px-2 py-0.5 rounded-full text-xs font-medium">{cls.duration_minutes} {t('classes.min')}</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl text-navy mb-6">{cls.title}</h1>

        {/* Class information */}
        <div className={card}>
          <h2 className="font-display font-bold text-navy mb-4">{t('classDetail.classInfo')}</h2>
          {cls.description && <p className="text-navy/70 text-sm mb-4">{cls.description}</p>}
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-navy/50">{t('classes.topic')}</dt>
              <dd className="text-navy font-medium text-right">{cls.topic}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy/50">{t('classes.maxStudentsLabel')}</dt>
              <dd className="text-navy font-medium text-right">{cls.max_students}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-navy/50">{t('classDetail.teacher')}</dt>
              <dd className="text-navy font-medium text-right">
                <a href={`/teachers/${cls.teacher?.id}`} className="text-brand-red hover:underline">
                  {cls.teacher?.first_name} {cls.teacher?.last_name}
                </a>
              </dd>
            </div>
          </dl>

          {cls.class_sessions?.length > 0 && (
            <>
              <h3 className="font-display font-bold text-navy text-sm mt-5 mb-2">{t('classDetail.sessions')}</h3>
              <ul className="space-y-1">
                {[...cls.class_sessions]
                  .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
                  .map(s => (
                    <li key={s.id} className="text-sm flex items-center gap-2">
                      <span className={s.status === 'cancelled' ? 'text-navy/30 line-through' : 'text-brand-red font-bold'}>
                        🗓️ {mounted ? formatInTimezone(s.session_date, currentUser?.timezone, currentUser?.time_format) : utcLabel(s.session_date)}
                      </span>
                      {s.status === 'cancelled' && <span className="text-navy/40 text-xs">{t('classDetail.cancelled')}</span>}
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>

        {/* Class materials — everyone sees them, only the teacher edits. */}
        <div className={card}>
          <h2 className="font-display font-bold text-navy mb-1">{t('classDetail.materials')}</h2>
          <p className="text-navy/50 text-xs mb-4">{t('classDetail.materialsNote')}</p>

          {canEditMaterials ? (
            <>
              {materialsMessage && (
                <div className="bg-navy/5 text-navy/70 border-2 border-navy/10 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
                  {materialsMessage}
                </div>
              )}
              <textarea value={materials} onChange={e => setMaterials(e.target.value)} rows={5}
                placeholder={t('classDetail.materialsPlaceholder')}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy text-sm resize-none focus:border-brand-red focus:outline-none transition-colors"/>
              <button onClick={saveMaterials} disabled={savingMaterials}
                className="w-full mt-3 bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
                {savingMaterials ? t('settings.saving') : t('classDetail.saveMaterials')}
              </button>

              <div className="mt-5 border-t border-navy/10 pt-4">
                <p className="font-display font-bold text-navy text-sm mb-1">{t('classDetail.pdfTitle')}</p>
                <p className="text-navy/50 text-xs mb-3">{t('classDetail.pdfNote')}</p>

                {cls.lesson_plan_url && (
                  <a href={cls.lesson_plan_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-brand-red text-sm font-bold hover:underline mb-3">
                    📄 {t('classDetail.pdfOpen')}
                  </a>
                )}

                <div className="flex gap-2">
                  <label className={`flex-1 text-center bg-white text-navy py-2.5 rounded-full font-bold text-sm border-2 border-navy transition-colors ${uploadingPdf ? 'opacity-50' : 'hover:bg-cream cursor-pointer'}`}>
                    {uploadingPdf
                      ? t('classDetail.pdfUploading')
                      : cls.lesson_plan_url ? t('classDetail.pdfReplace') : t('classDetail.pdfUpload')}
                    <input type="file" accept="application/pdf" onChange={onPickPdf}
                      disabled={uploadingPdf} className="hidden"/>
                  </label>
                  {cls.lesson_plan_url && (
                    <button onClick={() => sendPdf(null)} disabled={uploadingPdf}
                      className="px-4 py-2.5 rounded-full font-bold text-sm border-2 border-brand-red/30 bg-brand-red/10 text-brand-red disabled:opacity-50 transition-colors">
                      {t('classDetail.pdfRemove')}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {cls.materials
                ? <p className="text-navy/70 text-sm whitespace-pre-line">{cls.materials}</p>
                : !cls.lesson_plan_url && <p className="text-navy/40 text-sm">{t('classDetail.noMaterials')}</p>}
              {cls.lesson_plan_url && (
                <a href={cls.lesson_plan_url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-brand-red text-sm font-bold hover:underline ${cls.materials ? 'mt-3' : ''}`}>
                  📄 {t('classDetail.pdfOpen')}
                </a>
              )}
            </>
          )}
        </div>

        {/* Who joined — teacher/admin only, per session. */}
        {roster && (
          <div className={card}>
            <h2 className="font-display font-bold text-navy mb-1">{t('classDetail.students')}</h2>
            <p className="text-navy/50 text-xs mb-4">{t('classDetail.studentsNote')}</p>

            <div className="space-y-5">
              {roster.sessions.map(s => (
                <div key={s.id}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-navy font-bold text-sm">
                      🗓️ {mounted ? formatInTimezone(s.session_date, currentUser?.timezone, currentUser?.time_format) : utcLabel(s.session_date)}
                    </p>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border-2 ${
                      s.students.length >= roster.max_students
                        ? 'bg-brand-red/10 text-brand-red border-brand-red/30'
                        : 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'}`}>
                      {s.students.length} / {roster.max_students}
                    </span>
                  </div>
                  {s.students.length > 0 ? (
                    <ul className="space-y-1.5">
                      {s.students.map(st => (
                        <li key={st.id} className="flex items-center gap-2.5">
                          {st.photo_url
                            ? <img src={st.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-navy"/>
                            : <div className="w-7 h-7 rounded-full bg-brand-teal flex items-center justify-center text-white text-xs font-display font-bold border-2 border-navy">
                                {st.first_name?.[0]}
                              </div>}
                          <a href={`/teachers/${st.id}`} className="text-navy text-sm font-medium hover:underline">
                            {st.first_name} {st.last_name}
                          </a>
                          {st.attended && <span className="text-brand-teal text-xs font-bold">✓</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-navy/40 text-sm">{t('classDetail.noStudentsYet')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
