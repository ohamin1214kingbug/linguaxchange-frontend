// An invite link must survive the friend browsing before signing up, and
// must not attach a signed-in member or a junk code to anyone.

import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { captureInvite, pendingInvite, clearInvite } from '../lib/invite.js'

beforeEach(() => {
  const store = new Map()
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  }
})

test('a visitor arriving with ?invite keeps the code until signup', () => {
  captureInvite('?invite=u000012&utm=x', false)
  assert.equal(pendingInvite(), 'U000012')
  captureInvite('', false) // later pages without the parameter keep it
  assert.equal(pendingInvite(), 'U000012')
  clearInvite()
  assert.equal(pendingInvite(), undefined)
})

test('signed-in visitors and junk codes are ignored', () => {
  captureInvite('?invite=U000012', true)
  assert.equal(pendingInvite(), undefined)
  captureInvite('?invite=<script>', false)
  assert.equal(pendingInvite(), undefined)
})
