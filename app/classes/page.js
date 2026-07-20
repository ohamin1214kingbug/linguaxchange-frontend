'use client'
import { useState, useEffect } from 'react'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function Classes() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [joining, setJoining] = useState(null)
  const [message, setMessage] = useState('')
  const [credits, setCredits] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/classes`)
      .then(res => res.json())
      .then(data => {
        setClasses(Array.isArray(data) ? data : [])
        setLoading(false)
      })

    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (stored && token) {
      const u = JSON.parse(stored)
      setCurrentUser(u)
      fetch(`${API}/api/credits`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setCredits(d?.balance ?? null))
    }
  }, [])

  const joinClass = async (cls) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const token = localStorage.getItem('token')
    if (!user || !token) {
      window.location.href = '/auth/login'
      return
    }
    setJoining(cls.id)
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
      if (!res.ok) {
        setMessage(data.error || 'Could not join class')
      } else {
        setMessage('Successfully joined! Check your dashboard.')
        fetch(`${API}/api/credits`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => setCredits(d?.balance ?? null))
      }
    } catch (e) {
      setMessage('Could not connect to server')
    }
    setJoining(null)
  }

  const LANGS = {
    KO: { flag: '🇰🇷', name: 'Korean' },
    ES: { flag: '🇪🇸', name: 'Spanish' },
    DE: { flag: '🇩🇪', name: 'German' },
    EN: { flag: '🇬🇧', name: 'English' },
    PT: { flag: '🇧🇷', name: 'Portuguese' },
  }

  const filtered = filter === 'all' ? classes : classes.filter(c => c.language_code === filter)

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-100 bg-white">
        <a href="/" className="text-xl font-semibold text-indigo-600">LinguaXchange</a>
        <div className="flex gap-3 md:gap-4 items-center">
          <a href="/dashboard" className="hidden sm:block text-gray-500">Dashboard</a>
          {credits !== null && (
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium">
              ⚡ {credits} credits
            </span>
          )}
          <a href="/classes/create" className="bg-indigo-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm">+ Create class</a>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Browse classes</h1>

        {message && (
          <div className={`px-4 py-3 rounded-lg mb-6 text-sm ${message.includes('Successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {message}
          </div>
        )}

        <div className="flex gap-3 mb-8 flex-wrap">
          {['all', 'KO', 'ES', 'DE', 'EN', 'PT'].map(lang => (
            <button key={lang} onClick={() => setFilter(lang)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${filter === lang ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
              {lang === 'all' ? 'All' : `${LANGS[lang].flag} ${LANGS[lang].name}`}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-400">Loading classes...</p>}

        <div className="space-y-4">
          {filtered.map(cls => (
            <div key={cls.id} className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{LANGS[cls.language_code]?.flag}</span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">{cls.level}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{cls.duration_minutes} min</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">{cls.title}</h3>
                  {cls.description && <p className="text-gray-500 text-sm mb-2">{cls.description}</p>}
                  {cls.class_sessions?.[0]?.session_date && (
                    <p className="text-indigo-600 text-xs font-medium mb-1">
                      🗓️ {new Date(cls.class_sessions[0].session_date).toLocaleString()}
                    </p>
                  )}
                  <p className="text-gray-400 text-xs">
                    {cls.topic} · Max {cls.max_students} students
                    {cls.teacher && (
                      <>
                        {' · '}
                        <a href={`/teachers/${cls.teacher.id}`}
                          className="text-indigo-500 hover:text-indigo-700">
                          {cls.teacher.first_name} {cls.teacher.last_name}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <span className="text-amber-600 text-sm font-medium">⚡ 1 credit</span>
                  <button onClick={() => joinClass(cls)}
                    disabled={joining === cls.id}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {joining === cls.id ? 'Joining...' : 'Join class'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-gray-400 text-center py-12">No classes available yet</p>
          )}
        </div>
      </div>
    </main>
  )
}