// Members are grouped by region on the admin page; a country in the wrong
// group, or in two, puts a member where the admin will not look for them.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { REGIONS, regionOfCode } from '../lib/regions.js'

test('the countries members actually come from land in the right region', () => {
  const expected = { ES: 'Europe', DE: 'Europe', FR: 'Europe', IT: 'Europe', PT: 'Europe', GB: 'Europe', KR: 'Asia', JP: 'Asia', CN: 'Asia', BR: 'Americas', US: 'Americas', MX: 'Americas', AR: 'Americas', MA: 'Africa', AU: 'Oceania' }
  for (const [code, region] of Object.entries(expected)) assert.equal(regionOfCode(code), region, code)
})

test('an unknown or missing code is Other, and Other is listed last', () => {
  assert.equal(regionOfCode(undefined), 'Other')
  assert.equal(regionOfCode('ZZ'), 'Other')
  assert.equal(REGIONS.at(-1), 'Other')
})

test('no country is listed under two regions', () => {
  const source = readFileSync(new URL('../lib/regions.js', import.meta.url), 'utf8')
  const codes = [...source.matchAll(/^\s+\w+: '([A-Z ]+)',$/gm)].flatMap(m => m[1].split(' '))
  assert.ok(codes.length > 200)
  assert.equal(new Set(codes).size, codes.length)
})
