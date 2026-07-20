'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const API = 'https://linguaxchange-backend-production.up.railway.app'

const LANGUAGES = [
  { code: 'KO', flag: '🇰🇷', name: 'Korean' },
  { code: 'ES', flag: '🇪🇸', name: 'Spanish' },
  { code: 'DE', flag: '🇩🇪', name: 'German' },
  { code: 'EN', flag: '🇬🇧', name: 'English' },
  { code: 'PT', flag: '🇧🇷', name: 'Portuguese' },
]

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native']

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    first_name: '', last_name: '', nationality: '', bio: '',
    photo_url: '', teach_language: '', teach_level: '',
    learn_languages: [], has_certificate: null, certificate_explanation: ''
  })

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const u = JSON.parse(stored)
    setUser(u)
    fetch(`${API}/api/users/${u.id}`)
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          nationality: data.nationality || '',
          bio: data.bio || '',
          photo_url: data.photo_url || '',
          teach_language: data.teach_language || '',
          teach_level: data.teach_level || '',
          learn_languages: data.learn_languages || [],
          has_certificate: data.has_certificate ?? null,
          certificate_explanation: data.certificate_explanation || ''
        })
      })
  }, [])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      setMessage('Photo upload failed: ' + error.message)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setForm(f => ({ ...f, photo_url: publicUrl }))
    setUploading(false)
  }

  const toggleLearnLanguage = (code) => {
    const current = form.learn_languages
    setForm(f => ({
      ...f,
      learn_languages: current.includes(code)
        ? current.filter(l => l !== code)
        : [...current, code]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Save failed')
      } else {
        localStorage.setItem('user', JSON.stringify({ ...user, first_name: data.first_name }))
        setMessage('Profile saved!')
      }
    } catch (e) {
      setMessage('Could not connect to server')
    }
    setSaving(false)
  }

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white">
        <a href="/" className="text-xl font-semibold text-indigo-600">LinguaXchange</a>
        <div className="flex gap-6 items-center">
          <a href="/classes" className="text-gray-500">Explore</a>
          <a href="/dashboard" className="text-gray-500">Dashboard</a>
          <a href="/profile" className="text-indigo-600 font-medium">Profile</a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your profile</h1>
        <p className="text-gray-500 mb-8">This is how teachers and students see you.</p>

        {message && (
          <div className={`px-4 py-3 rounded-lg mb-6 text-sm ${
            message === 'Profile saved!'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}>
            {message}
          </div>
        )}

        {/* Approval status */}
        {!profile.is_approved && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm">
            Your account is pending approval. You can still explore classes while we review your profile.
          </div>
        )}

        {/* Photo */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Profile photo</h2>
          <div className="flex items-center gap-6">
            {form.photo_url ? (
              <img src={form.photo_url} alt="avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-100"/>
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-3xl text-indigo-600 font-bold">
                {form.first_name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100">
                {uploading ? 'Uploading...' : 'Upload photo'}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading}/>
              </label>
              <p className="text-gray-400 text-xs mt-2">JPG or PNG. Must be a real photo of you.</p>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Basic info</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <input value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. Korean"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio <span className="text-gray-400">({form.bio.length}/300)</span>
              </label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                maxLength={300} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                placeholder="Tell others about yourself, your background, and what you love about language learning..."/>
            </div>
          </div>
        </div>

        {/* Teaching */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Teaching</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language you teach</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => setForm(f => ({ ...f, teach_language: lang.code }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                      ${form.teach_language === lang.code
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300'}`}>
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>
            {form.teach_language && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your level</label>
                <div className="flex gap-2 flex-wrap">
                  {LEVELS.map(level => (
                    <button key={level} onClick={() => setForm(f => ({ ...f, teach_level: level }))}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium
                        ${form.teach_level === level
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300'}`}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Certificate status</label>
              <div className="flex gap-3">
                <button onClick={() => setForm(f => ({ ...f, has_certificate: true }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium
                    ${form.has_certificate === true
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                  ✅ I have a certificate
                </button>
                <button onClick={() => setForm(f => ({ ...f, has_certificate: false }))}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium
                    ${form.has_certificate === false
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                  📝 No certificate
                </button>
              </div>
            </div>
            {form.has_certificate === false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Explain your level</label>
                <textarea value={form.certificate_explanation}
                  onChange={e => setForm(f => ({ ...f, certificate_explanation: e.target.value }))}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                  placeholder="e.g. Native Korean speaker, grew up in Seoul..."/>
              </div>
            )}
          </div>
        </div>

        {/* Learning */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Languages I want to learn</h2>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => (
              <button key={lang.code} onClick={() => toggleLearnLanguage(lang.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                  ${form.learn_languages.includes(lang.code)
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'}`}>
                {lang.flag} {lang.name}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </main>
  )
}
