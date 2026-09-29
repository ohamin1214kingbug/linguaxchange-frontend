// Guards the five UI languages against drifting apart. Run with `npm test`
// (Node's built-in runner; no test dependency added).
//
// What each check prevents on screen:
// - a key missing from one language: t() falls back to English, so a Korean
//   page silently shows an English sentence;
// - a key no language defines: t() returns the key itself, so the page shows
//   "dashboard.enrollCancelledRefunded" to the user;
// - a {placeholder} missing from one translation: that language drops the
//   name or number the sentence was built around.
//
// All five languages had 655 matching keys when this was written.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { translations } from '../lib/i18n/translations.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]])

const placeholders = s => (String(s).match(/\{\w+\}/g) || []).sort()

const english = new Map(flatten(translations.EN))
const others = Object.keys(translations).filter(code => code !== 'EN')

for (const code of others) {
  const lang = new Map(flatten(translations[code]))

  test(`${code} has exactly the English keys`, () => {
    const missing = [...english.keys()].filter(k => !lang.has(k))
    const extra = [...lang.keys()].filter(k => !english.has(k))
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] })
  })

  test(`${code} keeps every {placeholder} its English sentence has`, () => {
    const mismatched = [...english]
      .filter(([k, v]) => lang.has(k) && placeholders(v).join() !== placeholders(lang.get(k)).join())
      .map(([k]) => k)
    assert.deepEqual(mismatched, [])
  })
}

test('no translation is an empty string', () => {
  const empty = Object.keys(translations).flatMap(code =>
    flatten(translations[code]).filter(([, v]) => v === '').map(([k]) => `${code}.${k}`))
  assert.deepEqual(empty, [])
})

test('every literal t("…") key used in the code exists in English', () => {
  const walk = dir => readdirSync(dir).flatMap(f => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []
  })
  const undefinedKeys = []
  for (const file of ['app', 'components', 'lib'].flatMap(d => walk(join(ROOT, d)))) {
    // Dotted string literals only; keys built at runtime can't be checked here.
    for (const [, key] of readFileSync(file, 'utf8').matchAll(/\bt\(\s*['"]([\w]+(?:\.[\w]+)+)['"]/g)) {
      if (!english.has(key) && !flatten(translations.EN).some(([k]) => k.startsWith(`${key}.`))) {
        undefinedKeys.push(`${key}  (${file.slice(ROOT.length + 1)})`)
      }
    }
  }
  assert.deepEqual(undefinedKeys, [])
})
