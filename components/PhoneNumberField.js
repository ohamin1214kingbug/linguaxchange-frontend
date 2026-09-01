'use client'
import { useState, useEffect } from 'react'
import PhoneInput, { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { getExampleNumber, getCountryCallingCode } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'
import { useLanguage } from '../lib/i18n/LanguageContext'
import countryNamesEn from 'react-phone-number-input/locale/en'
import countryNamesKo from 'react-phone-number-input/locale/ko'
import countryNamesEs from 'react-phone-number-input/locale/es'
import countryNamesDe from 'react-phone-number-input/locale/de'
import countryNamesPt from 'react-phone-number-input/locale/pt'

// Fallback only. The UI language is NOT where someone's phone is: a Korean
// living in Madrid reading the site in English was shown +44. This map is
// used only when the browser reports no region at all, which happens for
// bare tags like 'en'.
const DEFAULT_COUNTRY_BY_LANGUAGE = {
  KO: 'KR',
  ES: 'ES',
  DE: 'DE',
  EN: 'GB',
  PT: 'BR',
}

// Same country-name locale files used for the nationality dropdown, so the
// country picker inside the phone field reads in the site's own language
// instead of always English.
const COUNTRY_LABELS_BY_LANGUAGE = { EN: countryNamesEn, KO: countryNamesKo, ES: countryNamesEs, DE: countryNamesDe, PT: countryNamesPt }

export { isValidPhoneNumber }

// Picking a country sets the value to that country's dial code alone
// ("+86"), before a single digit is typed. That is the picker reporting the
// selection, not user input — counting it as input flashed a red "invalid
// number" the instant someone switched country, which reads as the country
// being rejected outright.
function isDialCodeOnly(value, country) {
  try {
    return value === '+' + getCountryCallingCode(country)
  } catch {
    return false // no country selected, or one libphonenumber doesn't know
  }
}

// The hint below the field carries the whole explanation of what to type,
// so both callers get it identically. Three states, because "enter your
// number" alone left people guessing:
//   empty   -> a real example for the country they picked
//   invalid -> say so, with the leading-zero gotcha spelled out
//   valid   -> echo the exact number we'll text, so there's no ambiguity
function PhoneHint({ value, country, t }) {
  if (value && !isDialCodeOnly(value, country)) {
    if (!isValidPhoneNumber(value)) {
      return <p className="text-brand-red text-xs mt-1 font-medium">{t('auth.errorInvalidPhone')}</p>
    }
    let formatted = value
    try {
      formatted = parsePhoneNumber(value)?.formatInternational() || value
    } catch {}
    return <p className="text-brand-teal text-xs mt-1 font-medium">{t('auth.phoneWillUse', { n: formatted })}</p>
  }

  let example = ''
  try {
    example = getExampleNumber(country, examples)?.formatInternational() || ''
  } catch {}

  return (
    <p className="text-navy/40 text-xs mt-1">
      {example ? t('auth.phoneExampleHint', { n: example }) : t('auth.phoneNumberHint')}
    </p>
  )
}

// The browser's own region, from its locale tags — 'es-ES' gives ES. Uses
// Intl rather than a hand-rolled table, and walks every tag because the first
// one may carry no region.
function browserRegion() {
  if (typeof navigator === 'undefined') return null
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const tag of tags) {
    try {
      const region = new Intl.Locale(tag).region
      if (region) return region
    } catch (e) {
      // Malformed tag. Try the next one rather than giving up.
    }
  }
  return null
}

export default function PhoneNumberField({ value, onChange, language, disabled, placeholder }) {
  const { t } = useLanguage()
  const languageCountry = DEFAULT_COUNTRY_BY_LANGUAGE[language] || 'US'
  const [defaultCountry, setDefaultCountry] = useState(languageCountry)
  const [country, setCountry] = useState(languageCountry)

  // After mount, not during render: navigator does not exist on the server, so
  // reading it while rendering would make the server and client disagree and
  // break hydration.
  useEffect(() => {
    if (value) return  // never move the picker out from under a typed number
    const region = browserRegion()
    if (region && region !== languageCountry) {
      setDefaultCountry(region)
      setCountry(region)
    }
  }, [])

  return (
    <div className="phone-field">
      <PhoneInput
        international
        defaultCountry={defaultCountry}
        labels={COUNTRY_LABELS_BY_LANGUAGE[language] || countryNamesEn}
        value={value}
        onChange={onChange}
        onCountryChange={c => setCountry(c || defaultCountry)}
        disabled={disabled}
        placeholder={placeholder}
      />
      <PhoneHint value={value} country={country} t={t} />
    </div>
  )
}
