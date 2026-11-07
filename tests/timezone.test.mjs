// The navbar asks a member to confirm their time zone when the device and
// the saved zone differ. Two spellings of one zone must not count as a
// difference, or members in those zones would be asked on every page.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sameTimezone } from '../lib/timezone.js'

test('the same zone matches, a different one does not', () => {
  assert.equal(sameTimezone('Europe/Madrid', 'Europe/Madrid'), true)
  assert.equal(sameTimezone('Europe/Madrid', 'Asia/Seoul'), false)
})

test('an old alias matches its current name', () => {
  assert.equal(sameTimezone('Asia/Calcutta', 'Asia/Kolkata'), true)
  assert.equal(sameTimezone('Europe/Kiev', 'Europe/Kyiv'), true)
})

test('a missing zone never matches', () => {
  assert.equal(sameTimezone(null, 'Europe/Madrid'), false)
  assert.equal(sameTimezone('Europe/Madrid', ''), false)
})
