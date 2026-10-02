// A logged-out visitor who clicks "Request this class" is sent to register,
// and used to land on /dashboard afterwards — losing the language and level
// they came from a study guide for. The page they were on is remembered for
// the length of the tab and handed back by whichever page finishes sign-in.

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { isSafeReturnPath, rememberReturnPath, takeReturnPath } from '../lib/auth.js'

// Node has no sessionStorage; a Map-backed stand-in is all these need.
beforeEach(() => {
  const store = new Map()
  globalThis.sessionStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  }
})

test('only same-site paths outside /auth/ are accepted', () => {
  assert.equal(isSafeReturnPath('/classes?language=DE&level=A1&tab=requests'), true)
  for (const bad of ['https://evil.example/x', '//evil.example', '/\\evil.example', 'classes', '', null, '/auth/login', '/auth/register?x=1']) {
    assert.equal(isSafeReturnPath(bad), false, String(bad))
  }
})

test('a remembered path is returned once, then the fallback', () => {
  rememberReturnPath('/classes?language=DE&level=A1&tab=requests')
  assert.equal(takeReturnPath('/dashboard'), '/classes?language=DE&level=A1&tab=requests')
  assert.equal(takeReturnPath('/dashboard'), '/dashboard')
})

test('an unsafe path is never stored, and a tampered one is never returned', () => {
  rememberReturnPath('https://evil.example')
  assert.equal(takeReturnPath('/dashboard'), '/dashboard')
  sessionStorage.setItem('postAuthReturnPath', '//evil.example')
  assert.equal(takeReturnPath('/dashboard'), '/dashboard')
})

test('no storage at all falls back quietly', () => {
  delete globalThis.sessionStorage
  rememberReturnPath('/classes')
  assert.equal(takeReturnPath('/dashboard'), '/dashboard')
})
