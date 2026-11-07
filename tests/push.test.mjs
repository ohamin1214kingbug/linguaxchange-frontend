// The browser's subscribe() needs the server's VAPID key as raw bytes; it
// arrives base64url-encoded without padding. A wrong conversion makes every
// subscribe fail with an unhelpful DOMException.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { keyToBytes } from '../lib/push.js'

test('base64url without padding becomes the original bytes', () => {
  const bytes = Uint8Array.from([251, 255, 0, 1, 2, 62, 63])
  const base64url = Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  assert.deepEqual([...keyToBytes(base64url)], [...bytes])
})

test('a real-sized key (65 bytes) round-trips', () => {
  const bytes = Uint8Array.from({ length: 65 }, (_, i) => (i * 37) % 256)
  const base64url = Buffer.from(bytes).toString('base64url')
  assert.equal(keyToBytes(base64url).length, 65)
  assert.deepEqual([...keyToBytes(base64url)], [...bytes])
})
