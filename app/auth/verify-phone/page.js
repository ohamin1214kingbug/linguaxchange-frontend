'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import PhoneNumberField, { isValidPhoneNumber } from '../../../components/PhoneNumberField'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function VerifyPhone() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [token, setToken] = useState(null)
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [finishLoading, setFinishLoading] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [verifiedToken, setVerifiedToken] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) {
      router.replace('/auth/login')
      return
    }
    setToken(stored)
  }, [])

  const sendOtp = async () => {
    setError('')
    setOtpLoading(true)
    try {
      const response = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'auth.errorSendCode')
      } else {
        setOtpSent(true)
      }
    } catch (err) {
      setError('common.connectionError')
    }
    setOtpLoading(false)
  }

  const verifyOtp = async () => {
    setError('')
    setVerifyLoading(true)
    try {
      const response = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, code: otpCode })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'auth.errorInvalidCode')
      } else {
        setPhoneVerified(true)
        setVerifiedToken(data.verified_token)
      }
    } catch (err) {
      setError('common.connectionError')
    }
    setVerifyLoading(false)
  }

  const finishSetup = async () => {
    setError('')
    setFinishLoading(true)
    try {
      const response = await fetch(`${API}/api/auth/add-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone_number: phone, verified_token: verifiedToken })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'auth.errorSomethingWrong')
      } else {
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({ ...stored, ...data.user }))
        router.push('/dashboard')
      }
    } catch (err) {
      setError('common.connectionError')
    }
    setFinishLoading(false)
  }

  if (!token) return null

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <h1 className="font-display font-extrabold text-navy text-3xl mt-4 mb-2">{t('auth.verifyPhoneRequiredTitle')}</h1>
        <p className="text-navy/60 mb-6">{t('auth.verifyPhoneRequiredSubtitle')}</p>

        {error && (
          <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 rounded-xl px-4 py-3 mb-4 text-sm font-medium">{t(error)}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-navy mb-1">{t('auth.phoneNumber')}</label>
            <PhoneNumberField value={phone} language={language}
              onChange={value => { setPhone(value || ''); setOtpSent(false); setPhoneVerified(false) }}
              disabled={phoneVerified}/>
          </div>

          {phoneVerified ? (
            <>
              <div className="bg-brand-teal/10 text-brand-teal border-2 border-brand-teal/30 rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-between">
                {t('auth.phoneVerifiedMsg')}
                <button onClick={() => { setPhoneVerified(false); setOtpSent(false); setOtpCode(''); setVerifiedToken('') }}
                  className="text-navy/50 font-medium underline text-xs">
                  {t('auth.changeNumber')}
                </button>
              </div>
              <button onClick={finishSetup} disabled={finishLoading}
                className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors disabled:opacity-50">
                {finishLoading ? t('auth.creating') : t('auth.finishSetup')}
              </button>
            </>
          ) : !otpSent ? (
            <button onClick={sendOtp} disabled={otpLoading || !isValidPhoneNumber(phone || '')}
              className="w-full bg-navy text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-navy/90 transition-colors disabled:opacity-50">
              {otpLoading ? t('auth.sendingCode') : t('auth.sendCode')}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-navy/60 text-sm">{t('auth.codeSentTo', { phone })}</p>
              <div>
                <label className="block text-sm font-bold text-navy mb-1">{t('auth.verificationCode')}</label>
                <input type="text" inputMode="numeric" value={otpCode} onChange={e => setOtpCode(e.target.value)}
                  className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder="123456"/>
              </div>
              <button onClick={sendOtp} disabled={otpLoading} className="text-navy/60 font-bold text-sm underline">
                {t('auth.resendCode')}
              </button>
              <button onClick={verifyOtp} disabled={verifyLoading || !otpCode}
                className="w-full bg-navy text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-navy/90 transition-colors disabled:opacity-50">
                {verifyLoading ? t('auth.verifyingCode') : t('auth.verifyCode')}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
