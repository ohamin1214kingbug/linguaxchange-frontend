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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 mb-6">If an account exists for {email}, we've sent a link to reset your password. It expires in 1 hour.</p>
          <a href="/auth/login" className="text-indigo-600 font-medium">← Back to login</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <a href="/" className="text-indigo-600 font-semibold text-lg">🌐 LinguaXchange</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Reset your password</h1>
        <p className="text-gray-500 mb-8">Enter your email and we'll send you a reset link</p>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="maria@email.com"/>
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </div>
        <p className="text-center text-gray-500 text-sm mt-6">
          <a href="/auth/login" className="text-indigo-600">← Back to login</a>
        </p>
      </div>
    </main>
  )
}
