'use client'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
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

export default function PhoneNumberField({ value, onChange, language, disabled, placeholder }) {
  return (
    <div className="phone-field">
      <PhoneInput
        international
        defaultCountry={DEFAULT_COUNTRY_BY_LANGUAGE[language] || 'US'}
        labels={COUNTRY_LABELS_BY_LANGUAGE[language] || countryNamesEn}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  )
}
