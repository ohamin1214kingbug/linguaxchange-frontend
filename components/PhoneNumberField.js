'use client'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

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

export default function PhoneNumberField({ value, onChange, language, disabled, placeholder }) {
  return (
    <div className="phone-field">
      <PhoneInput
        international
        defaultCountry={DEFAULT_COUNTRY_BY_LANGUAGE[language] || 'US'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  )
}
