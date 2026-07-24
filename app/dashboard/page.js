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
    <p className="text-brand-teal text-sm mt-2 bg-brand-teal/10 px-3 py-2 rounded-xl font-medium">
      ✅ Review submitted! Thank you!
    </p>
  )

  return (
    <div className="mt-3 bg-cream rounded-xl p-4 border-2 border-navy/10">
      <p className="text-sm font-bold text-navy mb-2">Rate this class</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(star => (
          <button key={star} onClick={() => setRating(star)}
            className={`text-2xl transition-colors ${rating >= star ? 'text-brand-yellow' : 'text-navy/20'}`}>
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
        placeholder="Write a short review (optional)..."
        className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm resize-none mb-2 focus:border-brand-red focus:outline-none transition-colors"/>
      <button onClick={submitRating} disabled={rating === 0}
        className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40 disabled:border-navy/20">
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
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">Loading...</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <div className="flex gap-6 items-center">
          <a href="/classes" className="text-navy/70 font-medium hover:text-navy">Explore</a>
          <a href="/profile" className="text-navy/70 font-medium hover:text-navy">Profile</a>
          <span className="bg-brand-yellow/15 text-navy px-3 py-1 rounded-full text-sm font-bold border-2 border-brand-yellow">
            ⚡ {credits ?? '...'} credits
          </span>
          <div className="w-8 h-8 bg-brand-red rounded-full flex items-center justify-center text-white font-display font-bold text-sm border-2 border-navy">
            {user.first_name?.[0]?.toUpperCase()}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-display font-extrabold text-2xl md:text-3xl text-navy mb-2">
          Welcome back, {user.first_name}!
        </h1>
        <p className="text-navy/60 mb-8">Here's your account overview</p>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${
            message.includes('confirmed') || message.includes('🎉')
              ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
              : 'bg-brand-red/10 text-brand-red border-brand-red/30'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
          <div className="bg-white rounded-2xl p-6 border-2 border-navy">
            <p className="text-navy/60 text-sm mb-1 font-medium">Credit balance</p>
            <p className="font-display font-extrabold text-5xl text-brand-red">{credits ?? '...'}</p>
            <p className="text-navy/40 text-sm mt-1">credits available</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-navy">
            <p className="text-navy/60 text-sm mb-1 font-medium">Classes joined</p>
            <p className="font-display font-extrabold text-5xl text-brand-teal">{enrollments.length}</p>
            <p className="text-navy/40 text-sm mt-1">total enrollments</p>
          </div>
        </div>

        {/* My enrolled classes */}
        {enrollments.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
            <h2 className="font-display font-bold text-navy mb-4">My classes</h2>
            <div className="space-y-1">
              {enrollments.map(enrollment => {
                const session = enrollment.class_sessions
                const cls = session?.classes
                const scheduledAt = session?.session_date ? new Date(session.session_date) : null
                const durationMs = (cls?.duration_minutes || 60) * 60 * 1000
                const classEndTime = scheduledAt ? new Date(scheduledAt.getTime() + durationMs) : null
                const isClassOver = classEndTime ? new Date() > classEndTime : true

                return (
                  <div key={enrollment.id} className="py-4 border-b border-navy/10 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-navy text-sm font-bold">
                          {cls?.title || 'Class'}
                        </p>
                        <p className="text-navy/40 text-xs mt-0.5">
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
                            className="text-brand-red text-xs font-bold hover:underline">
                            🔗 Join meeting
                          </a>
                        )}
                      </div>
                      <div>
                        {enrollment.status !== 'attended' && isClassOver && (
                          <button
                            onClick={() => confirmAttendance(enrollment.id)}
                            disabled={confirming === enrollment.id}
                            className="bg-brand-teal text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:opacity-90 disabled:opacity-50 transition-opacity">
                            {confirming === enrollment.id ? 'Confirming...' : '✓ Confirm attendance'}
                          </button>
                        )}
                        {enrollment.status !== 'attended' && !isClassOver && (
                          <span className="text-navy/40 text-sm">Not started yet</span>
                        )}
                        {enrollment.status === 'attended' && (
                          <span className="bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full text-xs font-bold border-2 border-brand-teal/30">
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
          <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
            <h2 className="font-display font-bold text-navy mb-4">Classes I'm teaching</h2>
            <div className="space-y-1">
              {teachingClasses.map(cls => {
                const session = cls.class_sessions?.[0]
                const scheduledAt = session?.session_date ? new Date(session.session_date) : null
                const durationMs = (cls.duration_minutes || 60) * 60 * 1000
                const classEndTime = scheduledAt ? new Date(scheduledAt.getTime() + durationMs) : null
                const isClassOver = classEndTime ? new Date() > classEndTime : true

                return (
                  <div key={cls.id} className="py-4 border-b border-navy/10 last:border-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-navy text-sm font-bold">{cls.title}</p>
                        <p className="text-navy/40 text-xs mt-0.5">
                          {scheduledAt ? scheduledAt.toLocaleString() : 'No time set'}
                        </p>
                        {session && !isClassOver && (
                          <a href={`/classroom/${session.id}`}
                            className="text-brand-red text-xs font-bold hover:underline">
                            🔗 Start class
                          </a>
                        )}
                      </div>
                      {isClassOver && (
                        <span className="text-navy/40 text-sm">Ended</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Credit history */}
        <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
          <h2 className="font-display font-bold text-navy mb-4">Credit history</h2>
          {transactions.length === 0 ? (
            <p className="text-navy/40 text-sm">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-navy/10 last:border-0">
                  <div>
                    <p className="text-navy text-sm font-medium">{tx.description}</p>
                    <p className="text-navy/40 text-xs">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={tx.amount > 0
                    ? 'text-brand-teal font-bold'
                    : 'text-brand-red font-bold'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl p-6 border-2 border-navy">
          <h2 className="font-display font-bold text-navy mb-4">Quick actions</h2>
          <div className="flex gap-4">
            <a href="/classes"
              className="bg-brand-red text-white px-6 py-3 rounded-full text-sm font-bold border-2 border-navy">
              Browse classes
            </a>
            <a href="/classes/create"
              className="border-2 border-navy text-navy px-6 py-3 rounded-full text-sm font-bold hover:bg-navy hover:text-white transition-colors">
              Create a class
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
