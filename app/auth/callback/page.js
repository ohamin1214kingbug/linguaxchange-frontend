'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function Callback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const googleUser = session.user
        try {
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
            router.push('/dashboard')
          } else {
            router.push('/auth/register')
          }
        } catch (e) {
          router.push('/auth/register')
        }
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
