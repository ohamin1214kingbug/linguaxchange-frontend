'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'

const LANGS = {
  KO: { flag: '🇰🇷', name: 'Korean' },
  ES: { flag: '🇪🇸', name: 'Spanish' },
  DE: { flag: '🇩🇪', name: 'German' },
  EN: { flag: '🇬🇧', name: 'English' },
  PT: { flag: '🇧🇷', name: 'Portuguese' },
}

function Stars({ rating }) {
  return (
    <span className="text-yellow-400 text-lg">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={rating >= i ? 'text-yellow-400' : 'text-gray-300'}>★</span>
      ))}
    </span>
  )
}

export default function TeacherProfile() {
  const { id } = useParams()
  const [teacher, setTeacher] = useState(null)
  const [classes, setClasses] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`${API}/api/users/${id}`).then(r => r.json()),
      fetch(`${API}/api/classes?teacher_id=${id}`).then(r => r.json()),
      fetch(`${API}/api/reviews/teacher/${id}`).then(r => r.json()),
    ]).then(([user, cls, rev]) => {
      setTeacher(user)
      setClasses(Array.isArray(cls) ? cls : [])
      setReviews(Array.isArray(rev) ? rev : [])
      setLoading(false)
    })
  }, [id])

  const joinClass = async (cls) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const token = localStorage.getItem('token')
    if (!user || !token) {
      window.location.href = '/auth/login'
      return
    }
    setJoining(cls.id)
    setMessage('')
    try {
      const res = await fetch(`${API}/api/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ class_id: cls.id })
      })
      const data = await res.json()
      setMessage(res.ok ? 'Successfully joined! Check your dashboard.' : (data.error || 'Could not join class'))
    } catch (e) {
      setMessage('Could not connect to server')
    }
    setJoining(null)
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  )

  if (!teacher || teacher.error) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Teacher not found</div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white">
        <a href="/" className="text-xl font-semibold text-indigo-600">LinguaXchange</a>
        <div className="flex gap-4 items-center">
          <a href="/classes" className="text-gray-500">Explore classes</a>
          <a href="/dashboard" className="text-gray-500">Dashboard</a>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Header card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-start gap-6">
            {teacher.photo_url ? (
              <img src={teacher.photo_url} alt={teacher.first_name}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-100 flex-shrink-0"/>
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-4xl text-indigo-600 font-bold flex-shrink-0">
                {teacher.first_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {teacher.first_name} {teacher.last_name}
              </h1>
              {teacher.nationality && (
                <p className="text-gray-500 text-sm mt-0.5">{teacher.nationality}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {teacher.teach_language && LANGS[teacher.teach_language] && (
                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                    {LANGS[teacher.teach_language].flag} Teaches {LANGS[teacher.teach_language].name}
                    {teacher.teach_level ? ` · ${teacher.teach_level}` : ''}
                  </span>
                )}
                {teacher.has_certificate && (
                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    ✅ Certified
                  </span>
                )}
                {avgRating && (
                  <span className="flex items-center gap-1">
                    <Stars rating={parseFloat(avgRating)} />
                    <span className="text-gray-600 text-sm font-medium">{avgRating}</span>
                    <span className="text-gray-400 text-sm">({reviews.length} reviews)</span>
                  </span>
                )}
              </div>
              {teacher.bio && (
                <p className="text-gray-600 mt-4 leading-relaxed">{teacher.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming classes */}
        {classes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Upcoming classes</h2>

            {message && (
              <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${message.includes('Successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {message}
              </div>
            )}

            <div className="space-y-3">
              {classes.map(cls => (
                <div key={cls.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{LANGS[cls.language_code]?.flag}</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">{cls.level}</span>
                      <span className="text-gray-400 text-xs">{cls.duration_minutes} min</span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{cls.title}</p>
                    {cls.description && <p className="text-gray-400 text-xs mt-0.5">{cls.description}</p>}
                    {cls.class_sessions?.[0]?.session_date && (
                      <p className="text-indigo-600 text-xs font-medium mt-1">
                        🗓️ {new Date(cls.class_sessions[0].session_date).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button onClick={() => joinClass(cls)}
                    disabled={joining === cls.id}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0 ml-4">
                    {joining === cls.id ? 'Joining...' : 'Join'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Student reviews</h2>
            <div className="space-y-4">
              {reviews.slice(0, 10).map((rev, i) => (
                <div key={i} className="py-3 border-b border-gray-50 last:border-0">
                  <Stars rating={rev.rating} />
                  {rev.comment && <p className="text-gray-600 text-sm mt-1">{rev.comment}</p>}
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {classes.length === 0 && reviews.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>This teacher hasn't posted any classes yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}
