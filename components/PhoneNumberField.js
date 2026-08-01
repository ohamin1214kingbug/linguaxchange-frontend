'use client'
import { useState } from 'react'
import PhoneInput, { isValidPhoneNumber, parsePhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { getExampleNumber } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'
import { useLanguage } from '../lib/i18n/LanguageContext'
import countryNamesEn from 'react-phone-number-input/locale/en'
import countryNamesKo from 'react-phone-number-input/locale/ko'
import countryNamesEs from 'react-phone-number-input/locale/es'
import countryNamesDe from 'react-phone-number-input/locale/de'
import countryNamesPt from 'react-phone-number-input/locale/pt'

// Maps the site's UI language to a sensible default country in the picker
// (matches the flags already used for these languages elsewhere in the
// app) so most users don't have to hunt for their own country first.
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

// The hint below the field carries the whole explanation of what to type,
// so both callers get it identically. Three states, because "enter your
// number" alone left people guessing:
//   empty   -> a real example for the country they picked
//   invalid -> say so, with the leading-zero gotcha spelled out
//   valid   -> echo the exact number we'll text, so there's no ambiguity
function PhoneHint({ value, country, t }) {
  if (value) {
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

export default function PhoneNumberField({ value, onChange, language, disabled, placeholder }) {
  const { t } = useLanguage()
  const defaultCountry = DEFAULT_COUNTRY_BY_LANGUAGE[language] || 'US'
  const [country, setCountry] = useState(defaultCountry)

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
