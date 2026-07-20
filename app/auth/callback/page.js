'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

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

        const googleUser = session.user
        const loginRes = await fetch(`${API}/api/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.user_metadata?.full_name,
            google_id: googleUser.id
          })
        })
        const data = await loginRes.json()
        if (loginRes.ok) {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🌐</div>
        <p className="text-gray-600">Logging you in with Google...</p>
      </div>
    </main>
  )
}
