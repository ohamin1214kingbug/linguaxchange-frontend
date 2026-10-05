// A logged-out visitor who fills in "what I want to learn" and presses Post
// is sent to register first. The draft rides along in sessionStorage so the
// form reopens filled in when they come back, instead of blank.

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { saveRequestDraft, takeRequestDraft } from '../lib/requestDraft.js'

beforeEach(() => {
  const store = new Map()
  globalThis.sessionStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  }
})

const form = {
  language_code: 'DE', level: 'A1', topic: 'Basic conversation', details: 'Ordering food',
  max_students: 4, preferred_time: '', time_flexible: true,
}

test('a saved draft comes back once, with only the form fields', () => {
  saveRequestDraft({ ...form, somethingElse: 'x' })
  assert.deepEqual(takeRequestDraft(), form)
  assert.equal(takeRequestDraft(), null)
})

test('a draft without a topic is not worth keeping', () => {
  saveRequestDraft({ ...form, topic: '   ' })
  assert.equal(takeRequestDraft(), null)
})

test('a malformed stored draft is discarded, not thrown', () => {
  sessionStorage.setItem('classRequestDraft', '{not json')
  assert.equal(takeRequestDraft(), null)
  assert.equal(sessionStorage.getItem('classRequestDraft'), null)
})

test('no storage at all is quietly ignored', () => {
  delete globalThis.sessionStorage
  saveRequestDraft(form)
  assert.equal(takeRequestDraft(), null)
})
