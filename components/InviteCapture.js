'use client'
import { useEffect } from 'react'
import { captureInvite } from '../lib/invite'

export default function InviteCapture() {
  useEffect(() => {
    let signedIn = false
    try { signedIn = !!localStorage.getItem('token') } catch (e) {}
    captureInvite(window.location.search, signedIn)
  }, [])
  return null
}
