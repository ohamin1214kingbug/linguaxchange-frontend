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

export default function Register() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', nationality: '', bio: '',
    teach_language: '', teach_level: '',
    learn_languages: [], has_certificate: null,
    certificate_explanation: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const toggleLearnLanguage = (code) => {
    const current = form.learn_languages
    if (current.includes(code)) {
      setForm({ ...form, learn_languages: current.filter(l => l !== code) })
    } else {
      setForm({ ...form, learn_languages: [...current, code] })
    }
  }

  const validateStep1 = () => {
    if (!form.first_name || !form.last_name || !form.email || !form.nationality) {
      setError('Please fill in all fields')
      return false
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!photo) {
      setError('Please upload a real photo of yourself')
      return false
    }
    if (!form.bio || form.bio.length < 20) {
      setError('Please write a short bio (at least 20 characters)')
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (!form.teach_language) {
      setError('Please select a language you want to teach')
      return false
    }
    if (!form.teach_level) {
      setError('Please select your level for that language')
      return false
    }
    if (form.learn_languages.length === 0) {
      setError('Please select at least one language to learn')
      return false
    }
    return true
  }

  const validateStep4 = () => {
    if (form.has_certificate === null) {
      setError('Please indicate if you have a certificate')
      return false
    }
    if (!form.has_certificate && !form.certificate_explanation) {
      setError('Please explain your language level')
      return false
    }
    return true
  }

  const nextStep = () => {
    setError('')
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3 && !validateStep3()) return
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    setError('')
    if (!validateStep4()) return
    setLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          nationality: form.nationality,
          bio: form.bio,
        })
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Could not connect to server')
    }
    setLoading(false)
  }

  const StepIndicator = () => (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
      <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${(step / 4) * 100}%` }}/>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <a href="/" className="text-indigo-600 font-semibold text-lg">🌐 LinguaXchange</a>
        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Create your account</h1>
        <p className="text-gray-500 mb-6">Step {step} of 4</p>

        <StepIndicator />

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {/* STEP 1 - Basic info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input name="first_name" type="text" onChange={handleChange} value={form.first_name}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Maria"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input name="last_name" type="text" onChange={handleChange} value={form.last_name}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Garcia"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input name="email" type="email" onChange={handleChange} value={form.email}
                className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="maria@email.com"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input name="password" type="password" onChange={handleChange} value={form.password}
                className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Min. 8 characters"/>
              {form.password.length > 0 && (
                <p className={`text-xs mt-1 ${form.password.length >= 8 ? 'text-green-600' : 'text-red-500'}`}>
                  {form.password.length >= 8 ? '✓ Strong enough' : `${8 - form.password.length} more characters needed`}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <input name="nationality" type="text" onChange={handleChange} value={form.nationality}
                className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="Spanish"/>
            </div>
            <button onClick={nextStep}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">
              Continue →
            </button>
          </div>
        )}

        {/* STEP 2 - Photo + Bio */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your real photo</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="preview"
                    className="w-24 h-24 rounded-full object-cover mx-auto mb-3"/>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center text-3xl">👤</div>
                )}
                <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100">
                  {photoPreview ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" onChange={handlePhoto} className="hidden"/>
                </label>
                <p className="text-gray-400 text-xs mt-2">Must be a real photo of you</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short bio <span className="text-gray-400">({form.bio.length}/300)</span>
              </label>
              <textarea name="bio" onChange={handleChange} value={form.bio} maxLength={300} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                placeholder="e.g. Korean native, learning Spanish. I love cooking and travel!"/>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium">
                ← Back
              </button>
              <button onClick={nextStep}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 - Languages */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Which language will you teach?</label>
              <div className="grid grid-cols-1 gap-2">
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => setForm({ ...form, teach_language: lang.code })}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left
                      ${form.teach_language === lang.code
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300'}`}>
                    <span className="text-xl">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {form.teach_language && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your level in that language</label>
                <div className="flex gap-2 flex-wrap">
                  {[...LEVELS, 'Native'].map(level => (
                    <button key={level} onClick={() => setForm({ ...form, teach_level: level })}
                      className={`px-4 py-2 rounded-lg border font-medium text-sm
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Languages you want to learn</label>
              <div className="flex gap-2 flex-wrap">
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
            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium">
                ← Back
              </button>
              <button onClick={nextStep}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 - Certificate */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Do you have a language certificate for {form.teach_language}?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setForm({ ...form, has_certificate: true })}
                  className={`py-3 rounded-lg border font-medium text-sm
                    ${form.has_certificate === true
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                  ✅ Yes I do
                </button>
                <button onClick={() => setForm({ ...form, has_certificate: false })}
                  className={`py-3 rounded-lg border font-medium text-sm
                    ${form.has_certificate === false
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300'}`}>
                  📝 No certificate
                </button>
              </div>
            </div>

            {form.has_certificate === true && (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <div className="text-3xl mb-2">📄</div>
                <label className="cursor-pointer bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium">
                  Upload certificate
                  <input type="file" accept=".pdf,.jpg,.png" className="hidden"/>
                </label>
                <p className="text-gray-400 text-xs mt-2">TOPIK, DELE, Goethe, IELTS, etc.</p>
              </div>
            )}

            {form.has_certificate === false && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Explain your level
                </label>
                <textarea name="certificate_explanation" onChange={handleChange}
                  value={form.certificate_explanation} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                  placeholder="e.g. I'm a native Korean speaker, grew up in Seoul..."/>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium">
                ← Back
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Creating...' : '🎉 Create account'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account? <a href="/auth/login" className="text-indigo-600">Login</a>
        </p>
      </div>
    </main>
  )
}
