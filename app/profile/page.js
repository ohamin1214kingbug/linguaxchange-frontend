'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'
import Tabs from '../../components/Tabs'
import { countryOptions } from '../../lib/countries'

const API = 'https://linguaxchange-backend-production.up.railway.app'

const BADGE_KEYS = { first_class: 'firstClass', five_taught: 'fiveTaught', polyglot: 'polyglot' }

// Same permanent id-derived code shown to admins in the reports queue —
// lets a user quote it themselves instead of admins being the only ones
// who can see it.
const userCode = id => 'U' + String(id).padStart(6, '0')

function BadgeRow({ badges, t }) {
  if (!badges || badges.length === 0) return null
  return (
    <div className="flex gap-2 mb-6">
      {badges.map(badge => {
        const key = BADGE_KEYS[badge.id]
        const label = key ? t(`badges.${key}Label`) : badge.label
        const criteria = key ? t(`badges.${key}Criteria`) : badge.criteria
        return (
          <span key={badge.id} title={`${label} — ${criteria}`}
            className="w-9 h-9 flex items-center justify-center text-lg bg-brand-yellow/15 border-2 border-brand-yellow rounded-full">
            {badge.icon}
          </span>
        )
      })}
    </div>
  )
}

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
  const [form, setForm] = useState({
    first_name: '', last_name: '', nationality: '', bio: '',
    photo_url: '', teach_language: '', teach_level: '',
    learn_languages: [], has_certificate: null, certificate_explanation: ''
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

  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', t('profile.native')]

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const u = JSON.parse(stored)
    setUser(u)
    fetch(`${API}/api/users/${u.id}`, { headers: { Authorization: `Bearer ${token}` } })
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
          has_certificate: data.has_certificate ?? null,
          certificate_explanation: data.certificate_explanation || ''
        })
      })
  }, [])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
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
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('common.loading')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">{t('profile.yourProfile')}</h1>
        <p className="text-navy/60 mb-2">{t('profile.howOthersSeeYou')}</p>
        {profile?.university_verified_at && (
          /* The date is the point: a university address keeps working after
             graduation, so the badge states when it was checked rather than
             implying the person is enrolled today. */
          <p className="text-brand-teal font-bold text-sm mt-1">
            🎓 {profile.university_domain}
            <span className="text-navy/40 font-medium">
              {' · '}{new Date(profile.university_verified_at).toLocaleDateString()}
            </span>
          </p>
        )}
        <p className="text-navy/40 text-sm mb-4">
          {profile.longest_streak > 0
            ? `${t('profile.longestStreak')}: ${t('profile.weeksCount', { n: profile.longest_streak })}`
            : t('profile.noStreakYet')}
        </p>
        <span className="inline-block bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full text-sm font-bold font-mono border-2 border-brand-teal/30 mb-8">
          {t('profile.yourCode', { code: userCode(profile.id) })}
        </span>

        <BadgeRow badges={profile.badges} t={t} />

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${
            messageOk
              ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
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
        <Tabs active={tab} onChange={setTab} tabs={[
          { key: 'basic', label: t('profile.basicInfo') },
          { key: 'teaching', label: t('profile.teaching') },
          { key: 'learning', label: t('profile.languagesWantLearn') }
        ]} />

        {tab === 'basic' && (<>
        {/* Photo */}
        <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
          <h2 className="font-display font-bold text-navy mb-4">{t('profile.profilePhoto')}</h2>
          <div className="flex items-center gap-6">
            {form.photo_url ? (
              <img src={form.photo_url} alt="avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-navy"/>
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-red flex items-center justify-center text-3xl text-white font-display font-bold border-2 border-navy">
                {form.first_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <label className="cursor-pointer bg-brand-red/10 text-brand-red px-4 py-2 rounded-full text-sm font-bold hover:bg-brand-red/20 transition-colors">
                {uploading ? t('profile.uploading') : t('profile.uploadPhoto')}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading}/>
              </label>
              <p className="text-navy/40 text-xs mt-2">{t('profile.photoHint')}</p>
            </div>
          </div>
        </div>

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
                {t('profile.bio')} <span className="text-navy/40 font-normal">{t('profile.bioCount', { n: form.bio.length })}</span>
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
                  {LEVELS.map(level => (
                    <button key={level} onClick={() => setForm(f => ({ ...f, teach_level: level }))}
                      className={`px-4 py-2 rounded-full border-2 text-sm font-bold transition-colors
                        ${form.teach_level === level
                          ? 'border-navy bg-brand-red text-white'
                          : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                      {level}
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
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button key={lang.code} onClick={() => toggleLearnLanguage(lang.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 text-sm font-bold transition-colors
                  ${form.learn_languages.includes(lang.code)
                    ? 'border-navy bg-brand-red/10 text-navy'
                    : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>

        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
          {saving ? t('profile.saving') : t('profile.saveProfile')}
        </button>

      </div>
    </main>
  )
}
