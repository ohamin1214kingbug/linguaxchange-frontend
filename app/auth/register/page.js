'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function Register() {
  const router = useRouter()
  const { t } = useLanguage()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const LANGUAGES = [
    { code: 'KO', flag: '🇰🇷', name: t('home.langKorean') },
    { code: 'ES', flag: '🇪🇸', name: t('home.langSpanish') },
    { code: 'DE', flag: '🇩🇪', name: t('home.langGerman') },
    { code: 'EN', flag: '🇬🇧', name: t('home.langEnglish') },
    { code: 'PT', flag: '🇧🇷', name: t('home.langPortuguese') },
  ]

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', nationality: '', bio: '',
    teach_language: '', teach_level: '',
    learn_languages: [], has_certificate: null,
    certificate_explanation: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const toggleLearnLanguage = (code) => {
    const current = form.learn_languages
    if (current.includes(code)) {
      setForm({ ...form, learn_languages: current.filter(l => l !== code) })
    } else {
      setForm({ ...form, learn_languages: [...current, code] })
    }
  }

  const validateStep1 = () => {
    if (!form.first_name || !form.last_name || !form.email || !form.nationality) {
      setError(t('auth.errorFillAllFields'))
      return false
    }
    if (form.password.length < 8) {
      setError(t('auth.errorPasswordLength'))
      return false
    }
    if (!form.email.includes('@')) {
      setError(t('auth.errorValidEmail'))
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!photo) {
      setError(t('auth.errorUploadPhoto'))
      return false
    }
    if (!form.bio || form.bio.length < 20) {
      setError(t('auth.errorBioLength'))
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (!form.teach_language) {
      setError(t('auth.errorSelectTeachLanguage'))
      return false
    }
    if (!form.teach_level) {
      setError(t('auth.errorSelectTeachLevel'))
      return false
    }
    if (form.learn_languages.length === 0) {
      setError(t('auth.errorSelectLearnLanguage'))
      return false
    }
    return true
  }

  const validateStep4 = () => {
    if (form.has_certificate === null) {
      setError(t('auth.errorSelectCertificate'))
      return false
    }
    if (!form.has_certificate && !form.certificate_explanation) {
      setError(t('auth.errorExplainLevel'))
      return false
    }
    return true
  }

  const nextStep = () => {
    setError('')
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    setStep(step + 1)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) setError(error.message)
  }

  const handleSubmit = async () => {
    setError('')
    if (!validateStep4()) return
    setLoading(true)
    try {
      const response = await fetch('https://linguaxchange-backend-production.up.railway.app/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          nationality: form.nationality,
          bio: form.bio,
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || t('auth.errorSomethingWrong'))
      } else {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/dashboard')
      }
    } catch (err) {
      setError(t('common.connectionError'))
    }
    setLoading(false)
  }

  const StepIndicator = () => (
    <div className="w-full bg-navy/10 rounded-full h-1.5 mb-8">
      <div className="bg-brand-red h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${(step / 4) * 100}%` }}/>
    </div>
  )

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <h1 className="font-display font-extrabold text-navy text-3xl mt-4 mb-2">{t('auth.createAccount')}</h1>
        <p className="text-navy/60 mb-6">{t('auth.stepOf', { n: step })}</p>

        <StepIndicator />

        {error && (
          <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 rounded-xl px-4 py-3 mb-4 text-sm font-medium">{error}</div>
        )}

        {/* STEP 1 - Basic info */}
        {step === 1 && (
          <div className="space-y-4">
            <button onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 border-2 border-navy/20 rounded-full py-3 hover:border-navy transition-colors font-bold text-navy">
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              {t('auth.continueWithGoogle')}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-navy/10"></div>
              <span className="text-navy/40 text-sm font-medium">{t('auth.or')}</span>
              <div className="flex-1 h-px bg-navy/10"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-navy mb-1">{t('auth.firstName')}</label>
                <input name="first_name" type="text" onChange={handleChange} value={form.first_name}
                  className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder="Maria"/>
              </div>
              <div>
                <label className="block text-sm font-bold text-navy mb-1">{t('auth.lastName')}</label>
                <input name="last_name" type="text" onChange={handleChange} value={form.last_name}
                  className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder="Garcia"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('auth.email')}</label>
              <input name="email" type="email" onChange={handleChange} value={form.email}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder="maria@email.com"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('auth.password')}</label>
              <input name="password" type="password" onChange={handleChange} value={form.password}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder={t('auth.minCharacters')}/>
              {form.password.length > 0 && (
                <p className={`text-xs mt-1 font-medium ${form.password.length >= 8 ? 'text-brand-teal' : 'text-brand-red'}`}>
                  {form.password.length >= 8 ? t('auth.strongEnough') : t('auth.moreCharactersNeeded', { n: 8 - form.password.length })}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('auth.nationality')}</label>
              <input name="nationality" type="text" onChange={handleChange} value={form.nationality}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder={t('home.langSpanish')}/>
            </div>
            <button onClick={nextStep}
              className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
              {t('auth.continueArrow')}
            </button>
          </div>
        )}

        {/* STEP 2 - Photo + Bio */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-navy mb-2">{t('auth.yourRealPhoto')}</label>
              <div className="border-2 border-dashed border-navy/30 rounded-xl p-6 text-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="preview"
                    className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-2 border-navy"/>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-cream border-2 border-navy/20 mx-auto mb-3 flex items-center justify-center text-3xl">👤</div>
                )}
                <label className="cursor-pointer bg-brand-red/10 text-brand-red px-4 py-2 rounded-full text-sm font-bold hover:bg-brand-red/20 transition-colors">
                  {photoPreview ? t('auth.changePhoto') : t('auth.uploadPhoto')}
                  <input type="file" accept="image/*" onChange={handlePhoto} className="hidden"/>
                </label>
                <p className="text-navy/40 text-xs mt-2">{t('auth.mustBeRealPhoto')}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">
                {t('auth.shortBio')} <span className="text-navy/40 font-normal">({form.bio.length}/300)</span>
              </label>
              <textarea name="bio" onChange={handleChange} value={form.bio} maxLength={300} rows={3}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 resize-none focus:border-brand-red focus:outline-none transition-colors"
                placeholder={t('auth.bioPlaceholder')}/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="w-full border-2 border-navy text-navy py-3 rounded-full font-bold hover:bg-navy hover:text-white transition-colors">
                {t('auth.back')}
              </button>
              <button onClick={nextStep}
                className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
                {t('auth.continueArrow')}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 - Languages */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-navy mb-2">{t('auth.whichLanguageTeach')}</label>
              <div className="grid grid-cols-1 gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => setForm({ ...form, teach_language: lang.code })}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors
                      ${form.teach_language === lang.code
                        ? 'border-navy bg-brand-red/10 text-navy'
                        : 'border-navy/15 hover:border-navy/40'}`}>
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-bold">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {form.teach_language && (
              <div>
                <label className="block text-sm font-bold text-navy mb-2">{t('auth.yourLevelInLanguage')}</label>
                <div className="flex gap-2 flex-wrap">
                  {[...LEVELS, 'Native'].map(level => (
                    <button key={level} onClick={() => setForm({ ...form, teach_level: level })}
                      className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-colors
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
              <label className="block text-sm font-bold text-navy mb-2">{t('auth.languagesWantToLearn')}</label>
              <div className="flex gap-2 flex-wrap">
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
            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="w-full border-2 border-navy text-navy py-3 rounded-full font-bold hover:bg-navy hover:text-white transition-colors">
                {t('auth.back')}
              </button>
              <button onClick={nextStep}
                className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
                {t('auth.continueArrow')}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 - Certificate */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-navy mb-3">
                {t('auth.certificateQuestion', { lang: LANGUAGES.find(l => l.code === form.teach_language)?.name || form.teach_language })}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setForm({ ...form, has_certificate: true })}
                  className={`py-3 rounded-full border-2 font-bold text-sm transition-colors
                    ${form.has_certificate === true
                      ? 'border-navy bg-brand-red text-white'
                      : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                  {t('auth.yesIDo')}
                </button>
                <button onClick={() => setForm({ ...form, has_certificate: false })}
                  className={`py-3 rounded-full border-2 font-bold text-sm transition-colors
                    ${form.has_certificate === false
                      ? 'border-navy bg-brand-red text-white'
                      : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                  {t('auth.noCertificate')}
                </button>
              </div>
            </div>

            {form.has_certificate === true && (
              <div className="border-2 border-dashed border-navy/30 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">📄</div>
                <label className="cursor-pointer bg-brand-red/10 text-brand-red px-4 py-2 rounded-full text-sm font-bold hover:bg-brand-red/20 transition-colors">
                  {t('auth.uploadCertificate')}
                  <input type="file" accept=".pdf,.jpg,.png" className="hidden"/>
                </label>
                <p className="text-navy/40 text-xs mt-2">{t('auth.certificateExamples')}</p>
              </div>
            )}

            {form.has_certificate === false && (
              <div>
                <label className="block text-sm font-bold text-navy mb-1">
                  {t('auth.explainYourLevel')}
                </label>
                <textarea name="certificate_explanation" onChange={handleChange}
                  value={form.certificate_explanation} rows={3}
                  className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 resize-none focus:border-brand-red focus:outline-none transition-colors"
                  placeholder={t('auth.certificateExplanationPlaceholder')}/>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="w-full border-2 border-navy text-navy py-3 rounded-full font-bold hover:bg-navy hover:text-white transition-colors">
                {t('auth.back')}
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors disabled:opacity-50">
                {loading ? t('auth.creating') : t('auth.createAccountButton')}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-navy/60 text-sm mt-6">
          {t('auth.alreadyHaveAccount')} <a href="/auth/login" className="text-brand-red font-bold hover:underline">{t('auth.login')}</a>
        </p>
      </div>
    </main>
  )
}
