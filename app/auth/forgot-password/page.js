'use client'
import { useState } from 'react'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email) return setError('Please enter your email')
    setLoading(true)
    try {
      const response = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (response.ok) {
        setSubmitted(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Something went wrong')
      }
    } catch (err) {
      setError('Could not connect to server')
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="font-display font-extrabold text-navy text-2xl mb-2">Check your email</h1>
          <p className="text-navy/60 mb-6">If an account exists for {email}, we've sent a link to reset your password. It expires in 1 hour.</p>
          <a href="/auth/login" className="text-brand-red font-bold hover:underline">← Back to login</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <h1 className="font-display font-extrabold text-navy text-3xl mt-4 mb-2">Reset your password</h1>
        <p className="text-navy/60 mb-8">Enter your email and we'll send you a reset link</p>

        {error && (
          <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 rounded-xl px-4 py-3 mb-4 text-sm font-medium">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-navy mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors" placeholder="maria@email.com"/>
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors disabled:opacity-50">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </div>
        <p className="text-center text-navy/60 text-sm mt-6">
          <a href="/auth/login" className="text-brand-red font-bold hover:underline">← Back to login</a>
        </p>
      </div>
    </main>
  )
}
