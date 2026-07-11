'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(null)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) {
      router.push('/auth/login')
      return
    }
    const parsedUser = JSON.parse(stored)
    setUser(parsedUser)

    fetch(`https://linguaxchange-backend-production.up.railway.app/api/credits?user_id=${parsedUser.id}`)
      .then(res => res.json())
      .then(data => setCredits(data?.balance ?? 0))

    fetch(`https://linguaxchange-backend-production.up.railway.app/api/credits/transactions?user_id=${parsedUser.id}`)
      .then(res => res.json())
      .then(data => setTransactions(Array.isArray(data) ? data : []))
  }, [])

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white">
        <a href="/" className="text-xl font-semibold text-indigo-600">LinguaXchange</a>
        <div className="flex gap-6 items-center">
          <a href="/classes" className="text-gray-500">Explore</a>
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
            ⚡ {credits ?? '...'} credits
          </span>
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
            {user.first_name?.[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user.first_name}!
        </h1>
        <p className="text-gray-500 mb-8">Here's your account overview</p>

        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Credit balance</p>
            <p className="text-5xl font-bold text-indigo-600">{credits ?? '...'}</p>
            <p className="text-gray-400 text-sm mt-1">credits available</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Total transactions</p>
            <p className="text-5xl font-bold text-green-600">{transactions.length}</p>
            <p className="text-gray-400 text-sm mt-1">credit movements</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Credit history</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                  <div>
                    <p className="text-gray-900 text-sm">{tx.description}</p>
                    <p className="text-gray-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={tx.amount > 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
          <div className="flex gap-4">
            <a href="/classes" className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium">
              Browse classes
            </a>
            <a href="/classes/create" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-sm font-medium">
              Create a class
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}