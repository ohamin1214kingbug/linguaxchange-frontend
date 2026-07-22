'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirmPassword) return setError('Passwords do not match')
    setLoading(true)
    try {
      const response = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/auth/login'), 2000)
      }
    } catch (err) {
      setError('Could not connect to server')
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid link</h1>
        <p className="text-gray-500 mb-6">This password reset link is missing its token.</p>
        <a href="/auth/forgot-password" className="text-indigo-600 font-medium">Request a new link</a>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h1>
        <p className="text-gray-500">Redirecting you to login...</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
      <a href="/" className="text-indigo-600 font-semibold text-lg">🌐 LinguaXchange</a>
      <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Set a new password</h1>
      <p className="text-gray-500 mb-8">Choose a new password for your account</p>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Min. 8 characters"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"/>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}
