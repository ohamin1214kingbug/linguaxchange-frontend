'use client'
import { LEVELS, levelLabel } from '../../lib/languages'
import { nextSessionDate } from '../../lib/classSchedule'
import { PROFILE_COLORS, DEFAULT_PROFILE_COLOR, profileColorClass } from '../../lib/profileColors'
import { useState, useEffect } from 'react'
import { formatDay } from '../../lib/timezone'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'
import Tabs from '../../components/Tabs'
import { countryOptions } from '../../lib/countries'
import { userCode } from '../../lib/userCode'

const API = ''

const CARD = 'bg-white rounded-2xl border-2 border-navy'
const STICKER = 'shadow-[4px_4px_0_var(--color-navy)]'
const INPUT = 'w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors'

function Avatar({ src, name, size }) {
  return src
    ? <img src={src} alt="" className={`${size} shrink-0 rounded-full object-cover border-2 border-navy`}/>
    : <div className={`${size} shrink-0 rounded-full bg-brand-red flex items-center justify-center text-white font-display font-bold border-2 border-navy`}>
        {name?.[0]?.toUpperCase() || '?'}
      </div>
}

// Steps that make a profile worth booking. The card disappears once all are
// done, so a finished profile is not nagged.
function Checklist({ steps, t, onGo }) {
  const done = steps.filter(step => step.done)
  if (done.length === steps.length) return null
  return (
    <div className={`bg-brand-yellow rounded-2xl border-2 border-navy p-5 mb-6 ${STICKER}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display font-extrabold text-xl text-navy">{t('profile.finishTitle')}</h2>
        <span className="font-display font-extrabold text-navy">{t('profile.stepsDone', { done: done.length, total: steps.length })}</span>
      </div>
      <div className="h-3 bg-white border-2 border-navy rounded-full overflow-hidden my-3" role="progressbar"
        aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done.length}>
        <div className="h-full bg-brand-green border-r-2 border-navy" style={{ width: `${(done.length / steps.length) * 100}%` }}/>
      </div>
      {done.length > 0 && (
        <p className="text-navy/80 text-sm font-semibold mb-3">{done.map(step => `✓ ${step.label}`).join(' · ')}</p>
      )}
      <div className="grid sm:grid-cols-2 gap-2">
        {steps.filter(step => !step.done).map(step => (
          <button key={step.key} type="button" onClick={() => onGo(step)}
            className="flex items-center gap-3 bg-white border-2 border-navy rounded-xl px-3 py-2.5 text-left hover:-translate-y-0.5 transition-transform">
            <span className="w-5 h-5 shrink-0 rounded-full border-2 border-navy" aria-hidden="true"/>
            <span className="font-semibold text-navy text-sm flex-1">{step.label}</span>
            <span className="text-brand-red font-bold text-sm whitespace-nowrap">{step.action} →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// What a student sees on /teachers/[id], drawn from the unsaved form so the
// member sees a change before saving it.
function PublicPreview({ form, profile, langs, nextClass, rating, t }) {
  const teach = langs.find(l => l.code === form.teach_language)
  return (
    <div className={`${profileColorClass(profile.profile_color)} rounded-2xl border-2 border-navy ${STICKER} p-5`}>
      <div className="flex items-center gap-3">
        <Avatar src={form.photo_url} name={form.first_name} size="w-14 h-14 text-2xl"/>
        <div className="min-w-0">
          <p className="font-display font-extrabold text-xl text-navy leading-tight break-words">{form.first_name} {form.last_name}</p>
          <p className="text-navy/65 text-sm">{[form.nationality, rating && `★ ${rating.avg} (${rating.count})`].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {teach && (
          <span className="bg-brand-blue/15 text-navy px-3 py-0.5 rounded-full text-sm font-bold border-2 border-navy">
            {teach.flag} {teach.name}{form.teach_level ? ` · ${levelLabel(teach.code, form.teach_level, t)}` : ''}
          </span>
        )}
        {form.has_certificate && profile.certificate_uploaded_at && (
          <span className="bg-brand-teal/15 text-navy px-3 py-0.5 rounded-full text-sm font-bold border-2 border-navy">{t('teacher.certificateOnFile')}</span>
        )}
        {profile.university_domain && (
          <span className="bg-white text-navy px-3 py-0.5 rounded-full text-sm font-bold border-2 border-navy">🎓 {profile.university_domain}</span>
        )}
      </div>
      {form.bio && <p className="text-navy text-sm mt-3 whitespace-pre-line break-words">{form.bio}</p>}
      {nextClass && (
        <p className="text-navy/65 text-xs mt-3">
          {t('teacher.upcomingClasses')}: {nextClass.title} · {nextSessionDate(nextClass).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </div>
  )
}

const readAsDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export default function ProfilePage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const countries = countryOptions(language)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('basic')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)
  const [classes, setClasses] = useState([])
  const [rating, setRating] = useState(null)
  const [certBusy, setCertBusy] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', nationality: '', bio: '',
    photo_url: '', teach_language: '', teach_level: '',
    learn_languages: [], learn_details: {}, has_certificate: null, certificate_explanation: ''
  })

  const LANGUAGES = [
    { code: 'KO', flag: '🇰🇷', name: t('home.langKorean') },
    { code: 'ES', flag: '🇪🇸', name: t('home.langSpanish') },
    { code: 'DE', flag: '🇩🇪', name: t('home.langGerman') },
    { code: 'EN', flag: '🇬🇧', name: t('home.langEnglish') },
    { code: 'PT', flag: '🇧🇷', name: t('home.langPortuguese') },
    { code: 'FR', flag: '🇫🇷', name: t('home.langFrench') },
    { code: 'IT', flag: '🇮🇹', name: t('home.langItalian') },
  ]

  // Built from the shared ladder rather than a seventh copy of it; the
  // translated "Native" is appended here because lib/languages has no
  // translator to call.
  // Values, not labels. This list used to end with t('profile.native'), and
  // whichever button was clicked went straight into teach_level — so a
  // Korean member's stored level became "원어민".
  const LEVEL_OPTIONS = [...LEVELS, 'Native']

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const u = JSON.parse(stored)
    setUser(u)
    // /me, not the public /:id: only /me carries learning levels, the
    // certificate name and phone status. Loading the public view showed saved
    // levels as empty, and Save would then have erased them.
    fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          nationality: data.nationality || '',
          bio: data.bio || '',
          photo_url: data.photo_url || '',
          teach_language: data.teach_language || '',
          teach_level: data.teach_level || '',
          learn_languages: data.learn_languages || [],
          learn_details: data.learn_details || {},
          has_certificate: data.has_certificate ?? null,
          certificate_explanation: data.certificate_explanation || ''
        })
      })
    // For the checklist's "first class" step and the preview's next class.
    // Both are extras: if either fails, the page still works without them.
    fetch(`${API}/api/classes?teacher_id=${u.id}`)
      .then(r => r.json())
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch(`${API}/api/reviews/teacher/${u.id}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) return
        setRating({ avg: (data.reduce((sum, r) => sum + r.rating, 0) / data.length).toFixed(1), count: data.length })
      })
      .catch(() => {})
  }, [])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const image = await readAsDataUrl(file)
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/users/${user.id}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image })
      })
      const data = await res.json()
      if (!res.ok) {
        // Stays a rendered string rather than a key: half of it is the raw
        // backend error, which has nothing to translate. t() passes unknown
        // strings through untouched, so rendering t(message) still works.
        setMessage(t('profile.photoUploadFailed') + data.error)
        setMessageOk(false)
        return
      }
      setForm(f => ({ ...f, photo_url: data.photo_url }))
    } catch (e) {
      setMessage(t('profile.photoUploadFailed') + e.message)
      setMessageOk(false)
    } finally {
      setUploading(false)
    }
  }

  // Uploads straight away, like the photo: the file is stored on its own
  // route, not with the rest of the form.
  const handleCertificateUpload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setCertBusy(true)
    setMessage('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/users/${user.id}/certificate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ file: await readAsDataUrl(file), name: file.name })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(t('profile.certificateUploadFailed') + (data.error || `HTTP ${res.status}`))
        setMessageOk(false)
        return
      }
      setProfile(p => ({ ...p, ...data }))
      setForm(f => ({ ...f, has_certificate: true }))
    } catch (err) {
      setMessage(t('profile.certificateUploadFailed') + err.message)
      setMessageOk(false)
    } finally {
      setCertBusy(false)
    }
  }

  const removeCertificate = async () => {
    setCertBusy(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/users/${user.id}/certificate`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(p => ({ ...p, ...data }))
      }
    } finally {
      setCertBusy(false)
    }
  }

  // Saved on the spot, like the photo: a colour is not something you
  // expect to press Save for. Shown at once and put back if saving fails.
  const pickColor = async (key) => {
    const before = profile.profile_color
    setProfile(p => ({ ...p, profile_color: key }))
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ profile_color: key })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      setProfile(p => ({ ...p, profile_color: before }))
      setMessage('profile.saveFailed')
      setMessageOk(false)
    }
  }

  const setLearnDetail = (code, field, value) => setForm(f => ({
    ...f,
    learn_details: { ...f.learn_details, [code]: { ...f.learn_details[code], [field]: value } }
  }))

  const toggleLearnLanguage = (code) => {
    const current = form.learn_languages
    setForm(f => ({
      ...f,
      learn_languages: current.includes(code)
        ? current.filter(l => l !== code)
        : [...current, code]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'profile.saveFailed')
        setMessageOk(false)
      } else {
        localStorage.setItem('user', JSON.stringify({ ...user, first_name: data.first_name }))
        setMessage('profile.profileSaved')
        setMessageOk(true)
      }
    } catch (e) {
      setMessage('common.connectionError')
      setMessageOk(false)
    }
    setSaving(false)
  }

  if (!profile) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/65 font-medium">{t('common.loading')}</div>
  )

  const teachLang = LANGUAGES.find(l => l.code === form.teach_language)
  const facts = [
    profile.university_domain && `🎓 ${profile.university_domain}`,
    profile.current_streak > 0 && `🔥 ${t('profile.streakWeeks', { n: profile.current_streak })}`,
    profile.badges?.length > 0 && `🏅 ${t('profile.badgesCount', { n: profile.badges.length })}`,
  ].filter(Boolean)

  const steps = [
    { key: 'photo', label: t('profile.stepPhoto'), action: t('profile.stepAdd'), done: Boolean(form.photo_url), tab: 'basic' },
    { key: 'bio', label: t('profile.stepBio'), action: t('profile.stepAdd'), done: Boolean(form.bio.trim()), tab: 'basic' },
    { key: 'phone', label: t('profile.stepPhone'), action: t('profile.stepVerify'), done: profile.phone_verified !== false, href: '/auth/verify-phone' },
    // A confirmed university email also approves the member to teach.
    { key: 'university', label: t('profile.stepUniversity'), action: t('profile.stepVerify'), done: Boolean(profile.university_verified_at), href: '/settings?tab=university' },
    { key: 'class', label: t('profile.stepFirstClass'), action: t('profile.stepCreate'), done: classes.length > 0, href: '/classes/create' },
  ]
  const goToStep = step => {
    if (step.href) { router.push(step.href); return }
    setTab(step.tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const nextClass = classes.find(c => nextSessionDate(c))
  const preview = <PublicPreview form={form} profile={profile} langs={LANGUAGES} nextClass={nextClass} rating={rating} t={t}/>

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="sr-only">{t('profile.yourProfile')}</h1>
        {/* The member picks this colour (lib/profileColors.js); students see
            the same colour on the public teacher page. */}
        <div className={`${profileColorClass(profile.profile_color)} rounded-2xl border-2 border-navy ${STICKER} p-5 sm:p-6 mb-6 flex items-start gap-4 sm:gap-6`}>
          <label className="shrink-0 text-center cursor-pointer group">
            <Avatar src={form.photo_url} name={form.first_name} size="w-16 h-16 sm:w-24 sm:h-24 text-3xl sm:text-4xl"/>
            <span className="block text-navy text-xs font-bold mt-2 underline decoration-2 underline-offset-2">
              {uploading ? t('profile.uploading') : t('profile.changePhoto')}
            </span>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading}/>
          </label>
          <div className="min-w-0 flex-1">
            <p className="font-display font-extrabold text-2xl sm:text-3xl text-navy leading-tight break-words">{form.first_name} {form.last_name}</p>
            <p className="text-navy/80 text-sm mt-0.5">
              {[form.nationality, userCode(profile.id)].filter(Boolean).join(' · ')}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {teachLang && (
                <span className="bg-white text-navy px-3 py-0.5 rounded-full text-sm font-bold border-2 border-navy">
                  {t('teacher.teaches', { lang: `${teachLang.flag} ${teachLang.name}` })}{form.teach_level ? ` · ${levelLabel(teachLang.code, form.teach_level, t)}` : ''}
                </span>
              )}
              {form.learn_languages.length > 0 && (
                <span className="bg-white text-navy px-3 py-0.5 rounded-full text-sm font-bold border-2 border-navy">
                  {t('profile.learningLabel')} {form.learn_languages.map(code => LANGUAGES.find(l => l.code === code)?.flag).join(' ')}
                </span>
              )}
            </div>
            {facts.length > 0 && <p className="text-navy/80 text-sm mt-3">{facts.join(' · ')}</p>}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap" role="radiogroup" aria-label={t('profile.cardColor')}>
              <span className="text-navy/80 text-xs font-bold mr-1">{t('profile.cardColor')}</span>
              {Object.entries(PROFILE_COLORS).map(([key, cls]) => {
                const on = (profile.profile_color || DEFAULT_PROFILE_COLOR) === key
                const name = t(`profile.color${key[0].toUpperCase()}${key.slice(1)}`)
                return (
                  <button key={key} type="button" role="radio" aria-checked={on} aria-label={name} title={name}
                    onClick={() => pickColor(key)}
                    className={`w-6 h-6 rounded-full border-2 border-navy bg-cream ${on ? 'ring-2 ring-navy ring-offset-2 ring-offset-cream' : 'hover:scale-110'} transition-transform`}>
                    <span className={`block w-full h-full rounded-full ${cls}`}/>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <Checklist steps={steps} t={t} onGo={goToStep}/>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${
            messageOk
              ? 'bg-brand-teal/10 text-brand-teal-dark border-brand-teal/30'
              : 'bg-brand-red/10 text-brand-red border-brand-red/30'
          }`}>
            {t(message)}
          </div>
        )}

        {/* Approval status */}
        {!profile.is_approved && (
          <div className="bg-brand-yellow/10 border-2 border-brand-yellow/40 text-navy px-4 py-3 rounded-xl mb-6 text-sm font-medium">
            {t('profile.pendingApprovalNotice')}
          </div>
        )}

        {/* Four stacked cards meant scrolling past the photo picker to
            reach what you teach. Same pill tabs settings uses; Save stays
            below them since one button still submits the whole form. */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 lg:items-start">
        <div className="min-w-0">
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'basic', label: t('profile.basicInfo') },
          { key: 'teaching', label: t('profile.teaching') },
          { key: 'learning', label: t('profile.languagesWantLearn') }
        ]} />

        {tab === 'basic' && (<>
        {/* Basic info */}
        <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
          <h2 className="font-display font-bold text-navy mb-4">{t('profile.basicInfo')}</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-navy mb-1">{t('auth.firstName')}</label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-bold text-navy mb-1">{t('auth.lastName')}</label>
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('auth.nationality')}</label>
              <select value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 bg-white focus:border-brand-red focus:outline-none transition-colors">
                <option value="" disabled>{t('auth.selectNationality')}</option>
                {/* Anything typed before this was a dropdown ("Korean") matches
                    no option, and a select with no match renders blank — which
                    would quietly wipe the value on the next save. Same escape
                    hatch the timezone select in /settings uses. */}
                {form.nationality && !countries.some(c => c.value === form.nationality) && (
                  <option value={form.nationality}>{form.nationality}</option>
                )}
                {countries.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">
                {t('profile.bio')} <span className="text-navy/65 font-normal">{t('profile.bioCount', { n: form.bio.length })}</span>
              </label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                maxLength={300} rows={3}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 resize-none focus:border-brand-red focus:outline-none transition-colors"
                placeholder={t('profile.bioPlaceholder')}/>
            </div>
          </div>
        </div>

        </>)}

        {/* Teaching */}
        {tab === 'teaching' && (
        <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
          <h2 className="font-display font-bold text-navy mb-4">{t('profile.teaching')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-navy mb-2">{t('profile.languageYouTeach')}</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => setForm(f => ({ ...f, teach_language: lang.code }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm font-bold transition-colors
                      ${form.teach_language === lang.code
                        ? 'border-navy bg-brand-red/10 text-navy'
                        : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>
            {form.teach_language && (
              <div>
                <label className="block text-sm font-bold text-navy mb-2">{t('profile.yourLevel')}</label>
                <div className="flex gap-2 flex-wrap">
                  {LEVEL_OPTIONS.map(level => (
                    <button key={level} onClick={() => setForm(f => ({ ...f, teach_level: level }))}
                      className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-colors
                        ${form.teach_level === level
                          ? 'border-navy bg-brand-red text-white'
                          : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                      {levelLabel(form.teach_language, level, t)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-navy mb-2">{t('profile.certificateStatus')}</label>
              <div className="flex gap-3">
                <button onClick={() => setForm(f => ({ ...f, has_certificate: true }))}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-colors
                    ${form.has_certificate === true
                      ? 'border-navy bg-brand-red text-white'
                      : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                  {t('profile.haveCertificate')}
                </button>
                <button onClick={() => setForm(f => ({ ...f, has_certificate: false }))}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-colors
                    ${form.has_certificate === false
                      ? 'border-navy bg-brand-red text-white'
                      : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                  {t('profile.noCertificate')}
                </button>
              </div>
            </div>
            {form.has_certificate === true && (
              <div className="space-y-2">
                {profile.certificate_uploaded_at ? (
                  <div className="flex items-center gap-3 border-2 border-navy rounded-xl px-3 py-2.5">
                    <span aria-hidden="true">📄</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-navy text-sm truncate">{profile.certificate_name}</p>
                      <p className="text-navy/65 text-xs">{t('profile.certificateUploadedOn', { date: formatDay(profile.certificate_uploaded_at) })}</p>
                    </div>
                    <label className="text-navy text-xs font-bold cursor-pointer hover:underline">
                      {t('profile.replaceFile')}
                      <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={handleCertificateUpload} className="hidden" disabled={certBusy}/>
                    </label>
                    <button type="button" onClick={removeCertificate} disabled={certBusy} className="text-brand-red text-xs font-bold hover:underline">
                      {t('profile.removeFile')}
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 border-2 border-dashed border-navy/40 rounded-xl px-4 py-3 cursor-pointer hover:border-navy transition-colors">
                    <span className="text-2xl" aria-hidden="true">📄</span>
                    <span className="flex-1">
                      <span className="block font-bold text-navy text-sm">{t('profile.uploadCertificate')}</span>
                      <span className="block text-navy/65 text-xs">{t('profile.certificateFormats')}</span>
                    </span>
                    <span className="bg-white border-2 border-navy rounded-full px-3 py-1 text-sm font-bold text-navy whitespace-nowrap">
                      {certBusy ? t('profile.uploading') : t('profile.chooseFile')}
                    </span>
                    <input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={handleCertificateUpload} className="hidden" disabled={certBusy}/>
                  </label>
                )}
                <p className="text-navy/65 text-xs">{t('profile.certificatePrivacy')}</p>
              </div>
            )}
            {form.has_certificate === false && (
              <div>
                <label className="block text-sm font-bold text-navy mb-1">{t('profile.explainYourLevel')}</label>
                <textarea value={form.certificate_explanation}
                  onChange={e => setForm(f => ({ ...f, certificate_explanation: e.target.value }))}
                  rows={2} className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 resize-none focus:border-brand-red focus:outline-none transition-colors"
                  placeholder={t('profile.certificateExplanationPlaceholder')}/>
              </div>
            )}
          </div>
        </div>

        )}

        {/* Learning */}
        {tab === 'learning' && (
        <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-8">
          <h2 className="font-display font-bold text-navy mb-4">{t('profile.languagesWantLearn')}</h2>
          <div className="space-y-2">
            {LANGUAGES.map(lang => {
              const on = form.learn_languages.includes(lang.code)
              const detail = form.learn_details[lang.code] || {}
              return (
                <div key={lang.code} className={`rounded-xl border-2 ${on ? 'border-navy p-3' : 'border-navy/15 px-3 py-2'}`}>
                  <button type="button" onClick={() => toggleLearnLanguage(lang.code)} aria-pressed={on}
                    className="flex items-center gap-3 w-full text-left font-bold text-navy">
                    <span className={`w-5 h-5 shrink-0 rounded-md border-2 border-navy flex items-center justify-center text-xs ${on ? 'bg-brand-green' : 'bg-white'}`} aria-hidden="true">{on ? '✓' : ''}</span>
                    {lang.flag} {lang.name}
                  </button>
                  {on && (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('profile.learnLevel')}>
                        {LEVELS.map(level => (
                          <button key={level} type="button" aria-pressed={detail.level === level}
                            onClick={() => setLearnDetail(lang.code, 'level', detail.level === level ? null : level)}
                            className={`px-3 py-1 rounded-full border-2 text-xs font-bold transition-colors ${
                              detail.level === level ? 'bg-brand-blue text-white border-navy' : 'border-navy/20 text-navy hover:border-navy/50'}`}>
                            {levelLabel(lang.code, level, t)}
                          </button>
                        ))}
                      </div>
                      <textarea value={detail.note || ''} maxLength={200} rows={2}
                        onChange={e => setLearnDetail(lang.code, 'note', e.target.value)}
                        placeholder={t('profile.describeLevel')} aria-label={t('profile.describeLevel')}
                        className={`${INPUT} text-sm resize-none`}/>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-navy/65 text-xs mt-3">{t('profile.learnDetailsHint')}</p>
        </div>

        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
          {saving ? t('profile.saving') : t('profile.saveProfile')}
        </button>
        </div>

        {/* lg and up: beside the form. Smaller: folded under it, because open
            above the form it pushed the fields a screen down on a phone. */}
        <aside className="hidden lg:block lg:sticky lg:top-6">
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <p className="font-bold text-navy text-sm">{t('profile.previewTitle')}</p>
            <a href={`/teachers/${profile.id}`} target="_blank" rel="noopener" className="text-brand-red text-sm font-bold hover:underline">{t('profile.openPublicPage')} ↗</a>
          </div>
          {preview}
          <p className="text-navy/65 text-xs mt-2">{t('profile.previewNote')}</p>
        </aside>
        <details className={`lg:hidden mt-6 ${CARD}`}>
          <summary className="px-4 py-3 font-bold text-navy cursor-pointer">👀 {t('profile.previewToggle')}</summary>
          <div className="px-4 pb-4">
            {preview}
            <a href={`/teachers/${profile.id}`} target="_blank" rel="noopener" className="inline-block mt-3 text-brand-red text-sm font-bold hover:underline">{t('profile.openPublicPage')} ↗</a>
          </div>
        </details>
        </div>

      </div>
    </main>
  )
}
