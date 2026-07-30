'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { syncTimezone } from '../../../lib/timezone'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function Callback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Exchange the OAuth `?code=...` returned by Supabase (PKCE flow) for a session.
        const params = new URLSearchParams(window.location.search)
        if (params.get('error')) {
          router.replace('/auth/login')
          return
        }

        let session = null
        if (params.get('code')) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (error) {
            router.replace('/auth/login')
            return
          }
          session = data.session
        } else {
          // Fall back to any session Supabase already detected in the URL.
          const { data } = await supabase.auth.getSession()
          session = data.session
        }

        if (!session?.user) {
          router.replace('/auth/login')
          return
        }

        const intent = sessionStorage.getItem('oauth_intent')
        sessionStorage.removeItem('oauth_intent')

        const loginRes = await fetch(`${API}/api/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token
          })
        })
        const data = await loginRes.json()
        if (loginRes.ok) {
          if (intent === 'register' && !data.isNewUser) {
            // They already have an account — send them to log in instead of silently signing in from the register page.
            router.replace('/auth/login?notice=already_registered')
            return
          }
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          syncTimezone(data.user.id, data.token)
          router.replace('/dashboard')
        } else {
          router.replace('/auth/register')
        }
      } catch (e) {
        router.replace('/auth/register')
      }
    }
    handleCallback()
  }, [])

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🌐</div>
        <p className="text-navy/60 font-medium">Logging you in with Google...</p>
      </div>
    </main>
  )
}
