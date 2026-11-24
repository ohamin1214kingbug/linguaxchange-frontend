'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import PhoneNumberField, { isValidPhoneNumber } from '../../../components/PhoneNumberField'
import CountryBlockedNotice, { phoneCountry } from '../../../components/CountryBlockedNotice'
import { takeReturnPath } from '../../../lib/auth'

const API = ''

export default function VerifyPhone() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [token, setToken] = useState(null)
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  // null until done; then the number of bananas the server added (0 if the
  // member already had a banana account).
  const [granted, setGranted] = useState(null)
  const [error, setError] = useState('')
  const [blockedEmail, setBlockedEmail] = useState('')

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
        // The token only lets the backend name this member in the admin email
        // if their country turns out to be blocked; sending a code needs none.
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone_number: phone, country: phoneCountry(phone) })
      })
      const data = await response.json()
      if (!response.ok) {
        setBlockedEmail(data.email || '')
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
        // A correct code saves the number and adds the bananas straight
        // away. It used to stop at "verified" and wait for a separate
        // "Finish setup" press, and closing the page there lost the bananas.
        await savePhone(data.verified_token)
      }
    } catch (err) {
      setError('common.connectionError')
    }
    setVerifyLoading(false)
  }

  const savePhone = async (verifiedToken) => {
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
      return
    }
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    localStorage.setItem('user', JSON.stringify({ ...stored, ...data.user }))
    setGranted(data.granted || 0)
  }

  if (!token) return null

  if (granted !== null) return (
    <main className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md text-center">
        <h1 className="font-display font-extrabold text-navy text-3xl mb-2">
          {granted > 0 ? t('auth.phoneDoneBananas', { n: granted }) : t('auth.phoneDoneVerified')}
        </h1>
        <p className="text-navy/65 mb-6">{t('auth.phoneDoneNext')}</p>
        <button onClick={() => router.push(takeReturnPath())}
          className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
          {t('auth.phoneDoneContinue')}
        </button>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center py-12 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md">
        <a href="/" className="font-display font-bold text-lg text-navy">Gongbu<span className="text-brand-red">Leng</span></a>
        {/* Where you are in signing up (owner request, 2026-11-19): about
            half of the members who sign up with Google stop at this page. */}
        <ol className="flex gap-1.5 mt-4" aria-label={t('auth.phoneMinute')}>
          {[['stepAccount', 'done'], ['stepPhone', 'now'], ['stepLanguages', '']].map(([key, state]) => (
            <li key={key} className="flex-1 text-center text-[11px] font-bold text-navy" aria-current={state === 'now' ? 'step' : undefined}>
              <span className={`block h-1.5 rounded-full mb-1 ${state === 'done' ? 'bg-brand-teal-dark' : state === 'now' ? 'bg-brand-red' : 'bg-navy/15'}`}/>
              {t(`auth.${key}`)}{state === 'done' ? ' ✓' : ''}
            </li>
          ))}
        </ol>
        <h1 className="font-display font-extrabold text-navy text-3xl mt-3 mb-1">{t('auth.phoneTitleLast')} 🍌</h1>
        <p className="text-navy/65 text-sm mb-3">{t('auth.phoneMinute')}</p>

        {error === 'auth.otpCountryBlocked' ? <CountryBlockedNotice phone={phone} email={blockedEmail} /> : error && (
          <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 rounded-xl px-4 py-3 mb-4 text-sm font-medium">{t(error)}</div>
        )}

        {!otpSent ? (
          <div className="space-y-4">
            <ul className="bg-brand-yellow/10 border-2 border-navy rounded-xl px-4 py-3 text-sm text-navy space-y-1">
              <li>🍌 {t('auth.phonePerkBananas')}</li>
              <li>📱 {t('auth.phonePerkFair')}</li>
              <li>🔒 {t('auth.phonePerkPrivate')}</li>
            </ul>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('auth.phoneNumber')}</label>
              <PhoneNumberField value={phone} language={language}
                onChange={value => { setPhone(value || ''); setOtpSent(false) }}/>
            </div>
            <button onClick={sendOtp} disabled={otpLoading || !isValidPhoneNumber(phone || '')}
              className="w-full bg-navy text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-navy/90 transition-colors disabled:opacity-50">
              {otpLoading ? t('auth.sendingCode') : t('auth.phoneSendCode')}
            </button>
            <p className="text-center text-xs text-navy/65">
              <button type="button" onClick={() => router.push(takeReturnPath())} className="underline font-bold">{t('auth.phoneLater')}</button>
              {' · '}{t('auth.phoneLaterNote')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-navy/65 text-sm">
              {t('auth.codeSentTo', { phone })}{' '}
              <button type="button" onClick={() => { setOtpSent(false); setOtpCode('') }} className="underline font-bold">{t('auth.changeNumber')}</button>
            </p>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('auth.verificationCode')}</label>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" value={otpCode} onChange={e => setOtpCode(e.target.value)}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 tracking-widest font-bold focus:border-brand-red focus:outline-none transition-colors" placeholder="123456"/>
            </div>
            <button onClick={verifyOtp} disabled={verifyLoading || !otpCode}
              className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors disabled:opacity-50">
              {verifyLoading ? t('auth.verifyingCode') : t('auth.phoneConfirm')}
            </button>
            {/* When the SMS never comes, the member can tell us instead of
                quietly giving up (owner request, 2026-11-19). */}
            <div className="border-2 border-dashed border-navy rounded-xl px-3 py-2.5 text-xs text-navy space-y-1">
              <p className="font-bold text-sm">{t('auth.noCodeTitle')}</p>
              <p>① {t('auth.noCodeCountry')}</p>
              <p>② <button onClick={sendOtp} disabled={otpLoading} className="underline font-bold">{t('auth.resendCode')}</button>{' · '}{t('auth.phoneResendHint')}</p>
              <p>③ {t('auth.noCodeStill')}{' '}
                <a href={`mailto:gongbuleng.team@gmail.com?subject=${encodeURIComponent('No SMS code')}&body=${encodeURIComponent(`${t('auth.noCodeMailBody')} ${phone}`)}`} className="underline font-bold">{t('auth.noCodeTell')}</a>
                {' '}{t('auth.noCodeTail')}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
