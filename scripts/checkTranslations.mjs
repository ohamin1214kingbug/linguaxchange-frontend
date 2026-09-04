// Every locale must define the same keys as English.
//
// This exists because a missing key does not fail anything on its own:
// LanguageContext falls through to `?? key`, so the screen renders the
// literal string "dashboard.reportCodePlaceholder" and looks like a typo
// rather than a bug. `next build` is perfectly happy. Twice in one session a
// key was added to English and to some of the other four, and the gap was
// only found by opening the page in that language.
//
// Reads the file as text and evaluates the object literal rather than
// importing it: translations.js is ESM inside a CommonJS package, and this
// check should not need a bundler to run.

import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const SOURCE = 'lib/i18n/translations.js'
const REFERENCE = 'EN'

const src = readFileSync(new URL(`../${SOURCE}`, import.meta.url), 'utf8')
const start = src.indexOf('export const translations = ')
if (start === -1) {
  console.error(`${SOURCE}: could not find "export const translations ="`)
  process.exit(1)
}
const translations = runInNewContext(
  `(${src.slice(start + 'export const translations = '.length)})`
)

// "dashboard.reportCodeLabel" for every leaf, so a key nested one level
// deeper in one locale than another is a difference, not a match.
function leafKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? leafKeys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  )
}

const reference = new Set(leafKeys(translations[REFERENCE]))
const locales = Object.keys(translations).filter(l => l !== REFERENCE)
let failed = false

for (const locale of locales) {
  const keys = new Set(leafKeys(translations[locale]))
  const missing = [...reference].filter(k => !keys.has(k))
  const extra = [...keys].filter(k => !reference.has(k))

  if (missing.length || extra.length) {
    failed = true
    console.error(`\n${locale}:`)
    missing.forEach(k => console.error(`  missing (in ${REFERENCE}, not here): ${k}`))
    extra.forEach(k => console.error(`  extra   (here, not in ${REFERENCE}): ${k}`))
  }
}

if (failed) {
  console.error(`\nEvery locale must define the same keys as ${REFERENCE}.`)
  process.exit(1)
}

console.log(`${REFERENCE} defines ${reference.size} keys; ${locales.join(', ')} all match.`)
