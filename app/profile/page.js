'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { detectTimezone } from '../../lib/timezone'
import Navbar from '../../components/Navbar'

const API = 'https://linguaxchange-backend-production.up.railway.app'

const BADGE_KEYS = { first_class: 'firstClass', five_taught: 'fiveTaught', polyglot: 'polyglot' }

// Same permanent id-derived code shown to admins in the reports queue —
// lets a user quote it themselves instead of admins being the only ones
// who can see it.
const userCode = id => 'U' + String(id).padStart(6, '0')

// Native IANA list — no library, no hardcoded table to go stale when a
// country changes its zones. A plain <select> is type-to-jump searchable,
// so it covers the "searchable dropdown" need without a combobox widget.
// ponytail: falls back to just the detected zone on browsers without
// supportedValuesOf; swap in a combobox if 400 options proves unwieldy.
const TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch (e) {
    return []
  }
})()

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
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [changingPw, setChangingPw] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [pwOk, setPwOk] = useState(false)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', nationality: '', bio: '',
    photo_url: '', teach_language: '', teach_level: '',
    learn_languages: [], has_certificate: null, certificate_explanation: '',
    timezone: '', timezone_source: 'auto', time_format: ''
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
          certificate_explanation: data.certificate_explanation || '',
          timezone: data.timezone || detectTimezone() || '',
          timezone_source: data.timezone_source || 'auto',
          time_format: data.time_format || ''
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

  const handleChangePassword = async () => {
    setPwMessage('')
    if (pw.next !== pw.confirm) {
      setPwMessage('profile.passwordsDontMatch')
      setPwOk(false)
      return
    }
    if (pw.next.length < 8) {
      setPwMessage('profile.passwordTooShort')
      setPwOk(false)
      return
    }
    setChangingPw(true)
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ current_password: pw.current, new_password: pw.next })
      })
      const data = await res.json()
      if (!res.ok) {
        setPwMessage(data.error || 'profile.passwordChangeFailed')
        setPwOk(false)
      } else {
        // The old token died with the password change; the server issues a
        // replacement so this device stays signed in. Storing it is what
        // keeps the next request from 401-ing.
        if (data.token) localStorage.setItem('token', data.token)
        setPw({ current: '', next: '', confirm: '' })
        setPwMessage('profile.passwordChanged')
        setPwOk(true)
      }
    } catch (e) {
      setPwMessage('common.connectionError')
      setPwOk(false)
    }
    setChangingPw(false)
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
        localStorage.setItem('user', JSON.stringify({
          ...user,
          first_name: data.first_name,
          timezone: data.timezone,
          timezone_source: data.timezone_source,
          time_format: data.time_format
        }))
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
              <input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder={t('profile.nationalityPlaceholder')}/>
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

        {/* Teaching */}
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

        {/* Learning */}
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

        {/* Display preferences */}
        <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-8">
          <h2 className="font-display font-bold text-navy mb-4">{t('profile.displayPrefs')}</h2>

          <label className="block text-sm font-bold text-navy mb-1.5">{t('profile.timezoneLabel')}</label>
          <select value={form.timezone}
            onChange={e => setForm(f => ({ ...f, timezone: e.target.value, timezone_source: 'manual' }))}
            className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy focus:border-brand-red focus:outline-none transition-colors">
            {!TIMEZONES.includes(form.timezone) && form.timezone && (
              <option value={form.timezone}>{form.timezone}</option>
            )}
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>

          {form.timezone_source === 'manual' ? (
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-navy/50 text-xs">{t('profile.timezoneManualNote')}</p>
              <button type="button"
                onClick={() => setForm(f => ({ ...f, timezone: detectTimezone() || f.timezone, timezone_source: 'auto' }))}
                className="text-brand-red text-xs font-bold hover:underline whitespace-nowrap">
                {t('profile.timezoneReset')}
              </button>
            </div>
          ) : (
            <p className="text-navy/50 text-xs mt-2">{t('profile.timezoneAutoNote')}</p>
          )}

          <label className="block text-sm font-bold text-navy mb-1.5 mt-5">{t('profile.timeFormatLabel')}</label>
          <select value={form.time_format}
            onChange={e => setForm(f => ({ ...f, time_format: e.target.value }))}
            className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy focus:border-brand-red focus:outline-none transition-colors">
            <option value="">{t('profile.timeFormatAuto')}</option>
            <option value="12h">{t('profile.timeFormat12h')}</option>
            <option value="24h">{t('profile.timeFormat24h')}</option>
          </select>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
          {saving ? t('profile.saving') : t('profile.saveProfile')}
        </button>

        {/* Password — its own endpoint and its own button, deliberately not
            part of the profile save: it needs the current password and
            hands back a fresh token. */}
        <div className="bg-white rounded-2xl p-6 border-2 border-navy mt-8">
          <h2 className="font-display font-bold text-navy mb-1">{t('profile.changePassword')}</h2>
          <p className="text-navy/50 text-xs mb-4">{t('profile.changePasswordNote')}</p>

          {pwMessage && (
            <div className={`px-4 py-3 rounded-xl mb-4 text-sm font-medium border-2 ${pwOk
              ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
              : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>
              {t(pwMessage)}
            </div>
          )}

          <div className="space-y-3">
            <input type="password" value={pw.current} autoComplete="current-password"
              onChange={e => setPw(p => ({ ...p, current: e.target.value }))}
              placeholder={t('profile.currentPassword')}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy focus:border-brand-red focus:outline-none transition-colors"/>
            <input type="password" value={pw.next} autoComplete="new-password"
              onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
              placeholder={t('profile.newPassword')}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy focus:border-brand-red focus:outline-none transition-colors"/>
            <input type="password" value={pw.confirm} autoComplete="new-password"
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))}
              placeholder={t('profile.confirmPassword')}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy focus:border-brand-red focus:outline-none transition-colors"/>
          </div>

          <button onClick={handleChangePassword} disabled={changingPw}
            className="w-full mt-4 bg-navy text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
            {changingPw ? t('profile.changingPassword') : t('profile.changePassword')}
          </button>
        </div>
      </div>
    </main>
  )
}
