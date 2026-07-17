'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const LANGUAGES = [
  { code: 'KO', flag: '🇰🇷', name: 'Korean' },
  { code: 'ES', flag: '🇪🇸', name: 'Spanish' },
  { code: 'DE', flag: '🇩🇪', name: 'German' },
  { code: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'PT', flag: '🇧🇷', name: 'Portuguese' },
]

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const TOPICS = [
  'Free conversation / Open talk',
  'Pronunciation & accent reduction',
  'Grammar fundamentals',
  'Verb tenses deep dive',
  'Slang, idioms & informal speech',
  'Business & professional communication',
  'Travel & survival phrases',
  'Culture, traditions & lifestyle',
  'Movies, music & pop culture',
  'Exam preparation (TOPIK, DELE, Goethe, IELTS)',
  'Vocabulary building & word games',
  'Writing skills (emails, essays)',
]

export default function CreateClass() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    title: '',
    language_code: '',
    level: '',
    topic: '',
    custom_topic: '',
    description: '',
    format: 'one-time',
    recurrence_type: '',
    max_students: 6,
    duration_minutes: 60,
    materials: '',
    scheduled_at: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.language_code) return setError('Please select a language')
    if (!form.level) return setError('Please select a level')
    if (!form.topic && !form.custom_topic) return setError('Please select or write a topic')
    if (!form.title) return setError('Please write a class title')
    if (!form.scheduled_at) return setError('Please select a date and time')
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      const token = localStorage.getItem('token')
      const response = await fetch('https://linguaxchange-backend-production.up.railway.app/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          topic: form.custom_topic || form.topic,
          teacher_id: user.id,
          scheduled_at: new Date(form.scheduled_at).toISOString(),
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('Could not connect to server')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Class submitted!</h1>
          <p className="text-gray-500 mb-6">Your class is now waiting for admin approval.</p>
          <div className="flex gap-3 justify-center">
            <a href="/classes" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium">Browse classes</a>
            <a href="/dashboard" className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium">Dashboard</a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white">
        <a href="/" className="text-xl font-semibold text-indigo-600">LinguaXchange</a>
        <a href="/dashboard" className="text-gray-500">← Back to dashboard</a>
      </nav>

      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a class</h1>
        <p className="text-gray-500 mb-8">Fill in the details and submit for admin approval</p>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Language you will teach</label>
            <div className="grid grid-cols-5 gap-2">
              {LANGUAGES.map(lang => (
                <button key={lang.code} onClick={() => setForm({ ...form, language_code: lang.code })}
                  className={`flex flex-col items-center p-3 rounded-xl border text-sm
                    ${form.language_code === lang.code
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="text-2xl mb-1">{lang.flag}</span>
                  <span className="text-xs">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Student level</label>
            <div className="flex gap-2">
              {LEVELS.map(level => (
                <button key={level} onClick={() => setForm({ ...form, level })}
                  className={`px-4 py-2 rounded-lg border font-medium text-sm
                    ${form.level === level
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Topic</label>
            <select name="topic" onChange={handleChange} value={form.topic}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3">
              <option value="">Select a topic...</option>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="custom">Other (write your own)</option>
            </select>
            {form.topic === 'custom' && (
              <input name="custom_topic" type="text" onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Write your custom topic..."/>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class title</label>
            <input name="title" type="text" onChange={handleChange} value={form.title}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g. Korean pronunciation for absolute beginners"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" onChange={handleChange} value={form.description} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
              placeholder="What will students learn in this class?"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date & time <span className="text-gray-400 font-normal">(when does the class start?)</span>
            </label>
            <input name="scheduled_at" type="datetime-local" onChange={handleChange}
              value={form.scheduled_at}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <select name="duration_minutes" onChange={handleChange} value={form.duration_minutes}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max students</label>
              <select name="max_students" onChange={handleChange} value={form.max_students}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                {[3,4,5,6,7,8,9,10].map(n => (
                  <option key={n} value={n}>{n} students</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <div className="flex gap-3">
              <button onClick={() => setForm({ ...form, format: 'one-time' })}
                className={`flex-1 py-3 rounded-lg border font-medium text-sm
                  ${form.format === 'one-time'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200'}`}>
                One-time class
              </button>
              <button onClick={() => setForm({ ...form, format: 'recurring' })}
                className={`flex-1 py-3 rounded-lg border font-medium text-sm
                  ${form.format === 'recurring'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200'}`}>
                Recurring class
              </button>
            </div>
          </div>

          {form.format === 'recurring' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select name="recurrence_type" onChange={handleChange} value={form.recurrence_type}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">Select frequency...</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Materials <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea name="materials" onChange={handleChange} value={form.materials} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
              placeholder="e.g. Please bring a pen and paper..."/>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit class for approval →'}
          </button>

        </div>
      </div>
    </main>
  )
}