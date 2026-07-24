'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import LanguageSwitcher from '../../components/LanguageSwitcher'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function ProfilePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
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
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      setMessage(t('profile.photoUploadFailed') + error.message)
      setMessageOk(false)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setForm(f => ({ ...f, photo_url: publicUrl }))
    setUploading(false)
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
        setMessage(data.error || t('profile.saveFailed'))
        setMessageOk(false)
      } else {
        localStorage.setItem('user', JSON.stringify({ ...user, first_name: data.first_name }))
        setMessage(t('profile.profileSaved'))
        setMessageOk(true)
      }
    } catch (e) {
      setMessage(t('common.connectionError'))
      setMessageOk(false)
    }
    setSaving(false)
  }

  if (!profile) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('common.loading')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <div className="flex gap-6 items-center">
          <a href="/classes" className="text-navy/70 font-medium hover:text-navy">{t('common.exploreShort')}</a>
          <a href="/dashboard" className="text-navy/70 font-medium hover:text-navy">{t('common.dashboard')}</a>
          <a href="/profile" className="text-brand-red font-bold">{t('common.profile')}</a>
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">{t('profile.yourProfile')}</h1>
        <p className="text-navy/60 mb-2">{t('profile.howOthersSeeYou')}</p>
        <p className="text-navy/40 text-sm mb-8">
          {profile.longest_streak > 0
            ? `${t('profile.longestStreak')}: ${t('profile.weeksCount', { n: profile.longest_streak })}`
            : t('profile.noStreakYet')}
        </p>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${
            messageOk
              ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
              : 'bg-brand-red/10 text-brand-red border-brand-red/30'
          }`}>
            {message}
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

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
          {saving ? t('profile.saving') : t('profile.saveProfile')}
        </button>
      </div>
    </main>
  )
}
