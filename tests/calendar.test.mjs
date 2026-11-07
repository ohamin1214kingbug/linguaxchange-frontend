// The "Add to calendar" file must open in Apple, Google and Outlook. They
// reject a malformed event silently, so the shape is pinned here.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildClassIcs } from '../lib/calendar.js'

const ics = buildClassIcs({
  sessionId: 42,
  title: 'Korean A2; verbs, tenses',
  start: new Date('2026-11-10T18:00:00Z'),
  durationMinutes: 90,
  now: new Date('2026-11-07T12:00:00Z'),
})

test('times are UTC and the end follows the duration', () => {
  assert.match(ics, /\r\nDTSTART:20261110T180000Z\r\n/)
  assert.match(ics, /\r\nDTEND:20261110T193000Z\r\n/)
})

test('commas and semicolons in the title are escaped', () => {
  assert.match(ics, /SUMMARY:Korean A2\; verbs\\, tenses · GongbuLeng/)
})

test('one event per session, so re-adding replaces instead of duplicating', () => {
  assert.match(ics, /UID:session-42@gongbuleng.com/)
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
})
