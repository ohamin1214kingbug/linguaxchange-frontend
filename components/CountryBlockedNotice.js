'use client'
import { useEffect, useRef } from 'react'
import { parsePhoneNumber } from 'react-phone-number-input'
import { useLanguage } from '../lib/i18n/LanguageContext'

// The country a number belongs to (ISO code), or undefined. Sent with
// /api/auth/send-otp so the admin email can name it.
export function phoneCountry(phone) {
  try { return parsePhoneNumber(phone || '')?.country } catch { return undefined }
}

// Shown when /api/auth/send-otp answers auth.otpCountryBlocked: Twilio
// doesn't send codes to that country yet, and the backend has already told
// the admin (owner-approved sample, 2026-11-24). Used by both phone steps.
export default function CountryBlockedNotice({ phone, email }) {
  const { t, language } = useLanguage()
  const code = phoneCountry(phone)
  // The box sits above the phone field, off-screen on a phone after tapping
  // the send button, so bring it into view when it appears.
  const box = useRef(null)
  useEffect(() => { box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [])
  let country = t('auth.otpCountryBlockedThis')
  try { if (code) country = new Intl.DisplayNames([language.toLowerCase()], { type: 'region' }).of(code) } catch {}
  return (
    <div ref={box} role="alert" className="bg-[#fff8e6] border-2 border-navy rounded-xl px-4 py-3 mb-4 text-sm text-navy">
      <p className="font-bold">📵 {t('auth.otpCountryBlockedTitle', { country })}</p>
      <p className="mt-0.5">{t('auth.otpCountryBlockedBody')}</p>
      <p className="mt-2 bg-brand-green/30 border-2 border-navy rounded-lg px-2.5 py-1.5 font-bold text-xs">
        ✓ {email ? t('auth.otpCountryBlockedSent', { email }) : t('auth.otpCountryBlockedSentNoEmail')}
      </p>
      <p className="mt-2 text-navy/65 text-xs">{t('auth.otpCountryBlockedOther')}</p>
    </div>
  )
}
