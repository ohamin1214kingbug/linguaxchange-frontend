'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const API = 'https://linguaxchange-backend-production.up.railway.app'

function ResetPasswordForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) return setError(t('auth.errorPasswordLength'))
    if (password !== confirmPassword) return setError(t('auth.errorPasswordsMatch'))
    setLoading(true)
    try {
      const response = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || t('auth.errorSomethingWrong'))
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/auth/login'), 2000)
      }
    } catch (err) {
      setError(t('common.connectionError'))
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md text-center">
        <h1 className="font-display font-extrabold text-navy text-2xl mb-2">{t('auth.invalidLink')}</h1>
        <p className="text-navy/60 mb-6">{t('auth.invalidLinkText')}</p>
        <a href="/auth/forgot-password" className="text-brand-red font-bold hover:underline">{t('auth.requestNewLink')}</a>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="font-display font-extrabold text-navy text-2xl mb-2">{t('auth.passwordUpdated')}</h1>
        <p className="text-navy/60">{t('auth.redirectingToLogin')}</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md">
      <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      <h1 className="font-display font-extrabold text-navy text-3xl mt-4 mb-2">{t('auth.setNewPassword')}</h1>
      <p className="text-navy/60 mb-8">{t('auth.setNewPasswordSubtitle')}</p>

      {error && (
        <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 rounded-xl px-4 py-3 mb-4 text-sm font-medium">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-navy mb-1">{t('auth.newPassword')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder={t('auth.minCharacters')}/>
        </div>
        <div>
          <label className="block text-sm font-bold text-navy mb-1">{t('auth.confirmPassword')}</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors"/>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors disabled:opacity-50">
          {loading ? t('auth.updating') : t('auth.updatePassword')}
        </button>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  const { t } = useLanguage()
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Suspense fallback={<div className="text-navy/40">{t('common.loading')}</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}
