import { getCountries } from 'react-phone-number-input/input'
import countryNamesEn from 'react-phone-number-input/locale/en'
import countryNamesKo from 'react-phone-number-input/locale/ko'
import countryNamesEs from 'react-phone-number-input/locale/es'
import countryNamesDe from 'react-phone-number-input/locale/de'
import countryNamesPt from 'react-phone-number-input/locale/pt'

// Lifted out of the signup form once /profile needed the same dropdown.
// Two copies would mean the excluded list below could be updated in one
// place and quietly not the other.

// Comprehensively-sanctioned countries excluded from signup — named
// explicitly here so the list is easy to see and adjust, rather than a
// magic filter buried in the render.
const EXCLUDED_NATIONALITIES = new Set(['KP', 'IR', 'SY', 'CU'])

const COUNTRY_NAMES_BY_LANG = { EN: countryNamesEn, KO: countryNamesKo, ES: countryNamesEs, DE: countryNamesDe, PT: countryNamesPt }

export const COUNTRY_CODES = getCountries()
  .filter(code => countryNamesEn[code] && !EXCLUDED_NATIONALITIES.has(code))

// The stored value is the ENGLISH country name, not the code and not the
// localized name — that's the format signup has always written, and it's what
// the teacher profile and saved-teacher cards render straight out of the
// database. Only the label changes with the reader's language.
//
// Sorted by that label, since alphabetical order differs per language.
export function countryOptions(language) {
  const names = COUNTRY_NAMES_BY_LANG[language] || countryNamesEn
  return COUNTRY_CODES
    .map(code => ({ value: countryNamesEn[code], label: names[code] || countryNamesEn[code] }))
    .sort((a, b) => a.label.localeCompare(b.label, (language || 'EN').toLowerCase()))
}
