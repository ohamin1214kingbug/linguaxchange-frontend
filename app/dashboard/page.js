'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'

function RatingForm({ classSessionId }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submitRating = async () => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          class_session_id: classSessionId,
          rating,
          comment
        })
      })
      setSubmitted(true)
    } catch (e) {
      console.error(e)
    }
  }

  if (submitted) return (
    <p className="text-green-600 text-sm mt-2 bg-green-50 px-3 py-2 rounded-lg">
      ✅ Review submitted! Thank you!
    </p>
  )

  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-700 mb-2">Rate this class</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(star => (
          <button key={star} onClick={() => setRating(star)}
            className={`text-2xl transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}>
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
        placeholder="Write a short review (optional)..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none mb-2"/>
      <button onClick={submitRating} disabled={rating === 0}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
        Submit review
      </button>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [teachingClasses, setTeachingClasses] = useState([])
  const [confirming, setConfirming] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const parsedUser = JSON.parse(stored)
    setUser(parsedUser)
    fetchCredits()
    fetchTransactions()
    fetchEnrollments()
    fetchTeachingClasses(parsedUser.id)
  }, [])

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

  const fetchCredits = () => {
    fetch(`${API}/api/credits`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setCredits(data?.balance ?? 0))
  }

  const fetchTransactions = () => {
    fetch(`${API}/api/credits/transactions`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setTransactions(Array.isArray(data) ? data : []))
  }

  const fetchEnrollments = () => {
    fetch(`${API}/api/enrollments`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setEnrollments(Array.isArray(data) ? data : []))
  }

  const fetchTeachingClasses = (teacherId) => {
    fetch(`${API}/api/classes?teacher_id=${teacherId}`)
      .then(res => res.json())
      .then(data => setTeachingClasses(Array.isArray(data) ? data : []))
  }

  const confirmAttendance = async (enrollmentId) => {
    setConfirming(enrollmentId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/enrollments/${enrollmentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      if (res.ok) {
        setMessage('Attendance confirmed! Teacher received +1 credit. 🎉')
        fetchEnrollments()
        fetchCredits()
        fetchTransactions()
      } else {
        const data = await res.json()
        setMessage(data.error || 'Could not confirm attendance')
      }
    } catch (e) {
      setMessage('Could not connect to server')
    }
    setConfirming(null)
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-100 bg-white">
        <a href="/" className="text-xl font-semibold text-indigo-600">LinguaXchange</a>
        <div className="flex gap-6 items-center">
          <a href="/classes" className="text-gray-500">Explore</a>
          <a href="/profile" className="text-gray-500">Profile</a>
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
            ⚡ {credits ?? '...'} credits
          </span>
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
            {user.first_name?.[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user.first_name}!
        </h1>
        <p className="text-gray-500 mb-8">Here's your account overview</p>

        {message && (
          <div className={`px-4 py-3 rounded-lg mb-6 text-sm ${
            message.includes('confirmed') || message.includes('🎉')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Credit balance</p>
            <p className="text-5xl font-bold text-indigo-600">{credits ?? '...'}</p>
            <p className="text-gray-400 text-sm mt-1">credits available</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Classes joined</p>
            <p className="text-5xl font-bold text-green-600">{enrollments.length}</p>
            <p className="text-gray-400 text-sm mt-1">total enrollments</p>
          </div>
        </div>

        {/* My enrolled classes */}
        {enrollments.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">My classes</h2>
            <div className="space-y-1">
              {enrollments.map(enrollment => {
                const session = enrollment.class_sessions
                const cls = session?.classes
                const scheduledAt = session?.session_date ? new Date(session.session_date) : null
                const durationMs = (cls?.duration_minutes || 60) * 60 * 1000
                const classEndTime = scheduledAt ? new Date(scheduledAt.getTime() + durationMs) : null
                const isClassOver = classEndTime ? new Date() > classEndTime : true

                return (
                  <div key={enrollment.id} className="py-4 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-900 text-sm font-medium">
                          {cls?.title || 'Class'}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {scheduledAt
                            ? scheduledAt.toLocaleString()
                            : 'No time set'}
                          {' · '}
                          {enrollment.status === 'attended'
                            ? '✅ Attended'
                            : isClassOver
                              ? '🔔 Class ended — please confirm!'
                              : '⏳ Upcoming'}
                        </p>
                        {!isClassOver && (
                          <a href={`/classroom/${enrollment.class_session_id}`}
                            className="text-indigo-600 text-xs font-medium hover:underline">
                            🔗 Join meeting
                          </a>
                        )}
                      </div>
                      <div>
                        {enrollment.status !== 'attended' && isClassOver && (
                          <button
                            onClick={() => confirmAttendance(enrollment.id)}
                            disabled={confirming === enrollment.id}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                            {confirming === enrollment.id ? 'Confirming...' : '✓ Confirm attendance'}
                          </button>
                        )}
                        {enrollment.status !== 'attended' && !isClassOver && (
                          <span className="text-gray-400 text-sm">Not started yet</span>
                        )}
                        {enrollment.status === 'attended' && (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                            ✅ Confirmed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating form - shows after confirming attendance */}
                    {enrollment.status === 'attended' && (
                      <RatingForm classSessionId={enrollment.class_session_id} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Classes I'm teaching */}
        {teachingClasses.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Classes I'm teaching</h2>
            <div className="space-y-1">
              {teachingClasses.map(cls => {
                const session = cls.class_sessions?.[0]
                const scheduledAt = session?.session_date ? new Date(session.session_date) : null
                const durationMs = (cls.duration_minutes || 60) * 60 * 1000
                const classEndTime = scheduledAt ? new Date(scheduledAt.getTime() + durationMs) : null
                const isClassOver = classEndTime ? new Date() > classEndTime : true

                return (
                  <div key={cls.id} className="py-4 border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-900 text-sm font-medium">{cls.title}</p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {scheduledAt ? scheduledAt.toLocaleString() : 'No time set'}
                        </p>
                        {session && !isClassOver && (
                          <a href={`/classroom/${session.id}`}
                            className="text-indigo-600 text-xs font-medium hover:underline">
                            🔗 Start class
                          </a>
                        )}
                      </div>
                      {isClassOver && (
                        <span className="text-gray-400 text-sm">Ended</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Credit history */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Credit history</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-gray-900 text-sm">{tx.description}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={tx.amount > 0
                    ? 'text-green-600 font-semibold'
                    : 'text-red-500 font-semibold'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Quick actions</h2>
          <div className="flex gap-4">
            <a href="/classes"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium">
              Browse classes
            </a>
            <a href="/classes/create"
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-sm font-medium">
              Create a class
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}