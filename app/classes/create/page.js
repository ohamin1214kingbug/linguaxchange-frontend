'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import Navbar from '../../../components/Navbar'
import DateTimePicker, { toLocalValue } from '../../../components/DateTimePicker'
import { asUtcDate } from '../../../lib/timezone'
import { CLASS_SIZE_OPTIONS, DEFAULT_CLASS_SIZE } from '../../../lib/classSize'
import { languageOptions } from '../../../lib/languages'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function CreateClass() {
  const router = useRouter()
  const { t } = useLanguage()
  const [error, setError] = useState('')
  const [dateTimeError, setDateTimeError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [publishedImmediately, setPublishedImmediately] = useState(false)
  const [form, setForm] = useState({
    title: '',
    language_code: '',
    level: '',
    topic: '',
    custom_topic: '',
    description: '',
    format: 'one-time',
    recurrence_type: '',
    recurrence_end_date: '',
    max_students: DEFAULT_CLASS_SIZE,
    duration_minutes: 60,
    materials: '',
    scheduled_at: '',
  })

  const LANGUAGES = languageOptions(t)

  const TOPICS = [
    t('classes.topicFreeConversation'),
    t('classes.topicPronunciation'),
    t('classes.topicGrammar'),
    t('classes.topicVerbTenses'),
    t('classes.topicSlang'),
    t('classes.topicBusiness'),
    t('classes.topicTravel'),
    t('classes.topicCulture'),
    t('classes.topicMovies'),
    t('classes.topicExam'),
    t('classes.topicVocabulary'),
    t('classes.topicWriting'),
  ]

  // Arrived here from a student's request on the browse board — prefill what
  // they asked for so answering it is a couple of clicks. Read off
  // window.location rather than useSearchParams(), which would drag a
  // Suspense boundary into an otherwise plain client page. Nothing is
  // locked: the teacher can change any of it, which is what "the time is
  // negotiable" means in practice.
  const [requestId, setRequestId] = useState(null)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.get('request')) return
    setRequestId(params.get('request'))
    const preferred = params.get('preferred_time')
    setForm(f => ({
      ...f,
      language_code: params.get('language_code') || f.language_code,
      level: params.get('level') || f.level,
      custom_topic: params.get('topic') || f.custom_topic,
      title: params.get('topic') || f.title,
      max_students: parseInt(params.get('max_students')) || f.max_students,
      scheduled_at: preferred ? toLocalValue(asUtcDate(preferred)) : f.scheduled_at
    }))
  }, [])

  // Prefills from the teacher's own saved defaults (Settings → Teaching
  // defaults), if they've set any — a starting point, not a lock, so every
  // field here stays editable same as everything else in the form.
  useEffect(() => {
    const token = localStorage.getItem('token')
    const stored = localStorage.getItem('user')
    if (!token || !stored) return
    const { id } = JSON.parse(stored)
    fetch(`https://linguaxchange-backend-production.up.railway.app/api/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        // A request-answer link (above) already specifies its own
        // max_students for that specific ask — that beats the teacher's
        // general-purpose default.
        const params = new URLSearchParams(window.location.search)
        setForm(f => ({
          ...f,
          duration_minutes: data.default_class_duration_minutes || f.duration_minutes,
          max_students: (!params.get('max_students') && data.default_max_students) || f.max_students
        }))
      })
      .catch(() => {})
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setError('')
    setDateTimeError('')
    if (!form.language_code) return setError('classes.errorSelectLanguage')
    if (!form.level) return setError('classes.errorSelectLevel')
    if (!form.topic && !form.custom_topic) return setError('classes.errorSelectTopic')
    if (!form.title) return setError('classes.errorClassTitle')
    if (!form.scheduled_at) return setDateTimeError('classes.errorDateTime')
    // Re-check on submit, not just at picker-selection time — the tab may
    // have been left open long enough for a previously-valid pick to lapse.
    if (new Date(form.scheduled_at).getTime() <= Date.now()) return setDateTimeError('classes.errorDateTimePast')
    if (form.format === 'recurring' && !form.recurrence_type) return setError('classes.errorFrequency')
    if (form.format === 'recurring' && !form.recurrence_end_date) return setError('classes.errorRecursUntil')
    setLoading(true)
    try {
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
          scheduled_at: new Date(form.scheduled_at).toISOString(),
        })
      })
      const data = await response.json()
      if (!response.ok) {
        if (data.field === 'scheduled_at') setDateTimeError(data.error)
        else setError(data.error || 'auth.errorSomethingWrong')
      } else {
        // Close the request this class answers and notify everyone who asked
        // for it. Best-effort: the class exists either way, and a failed
        // link-up isn't worth blocking the success screen over.
        if (requestId) {
          await fetch(`https://linguaxchange-backend-production.up.railway.app/api/class-requests/${requestId}/fulfill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ class_id: data.id })
          }).catch(() => {})
        }
        setPublishedImmediately(data.status === 'approved')
        setSuccess(true)
      }
    } catch (err) {
      setError('common.connectionError')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="font-display font-extrabold text-navy text-2xl mb-2">{publishedImmediately ? t('classes.classPublished') : t('classes.classSubmitted')}</h1>
          <p className="text-navy/60 mb-6">{publishedImmediately ? t('classes.publishedText') : t('classes.pendingApprovalText')}</p>
          <div className="flex gap-3 justify-center">
            <a href="/classes" className="bg-brand-red text-white px-6 py-3 rounded-full font-bold border-2 border-navy">{t('classes.browseClasses')}</a>
            <a href="/dashboard" className="border-2 border-navy text-navy px-6 py-3 rounded-full font-bold hover:bg-navy hover:text-white transition-colors">{t('common.dashboard')}</a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">{t('classes.createClass')}</h1>
        <p className="text-navy/60 mb-8">{t('classes.fillDetails')}</p>

        {error && (
          <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 rounded-xl px-4 py-3 mb-6 text-sm font-medium">{t(error)}</div>
        )}

        <div className="bg-white rounded-2xl p-6 border-2 border-navy space-y-6">

          {requestId ? (
            // Language, level, and class size are what the student actually
            // asked for — changing them here would fulfill their request
            // with a different class than the one they signed up for
            // (routes/classRequests.js's /fulfill has no check that catches
            // that mismatch, so the only guard is not offering the option).
            <div className="bg-cream rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-navy/50">{t('classes.answeringRequest')}</span>
              <span className="font-bold text-navy">
                {LANGUAGES.find(l => l.code === form.language_code)?.flag} {LANGUAGES.find(l => l.code === form.language_code)?.name} · {form.level} · {t('classes.studentsCount', { n: form.max_students })}
              </span>
            </div>
          ) : (
          <>
          <div>
            <label className="block text-sm font-bold text-navy mb-3">{t('classes.languageTeach')}</label>
            <div className="grid grid-cols-5 gap-2">
              {LANGUAGES.map(lang => (
                <button key={lang.code} onClick={() => setForm({ ...form, language_code: lang.code })}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 text-sm transition-colors
                    ${form.language_code === lang.code
                      ? 'border-navy bg-brand-red/10 text-navy'
                      : 'border-navy/15 hover:border-navy/40'}`}>
                  <span className="text-2xl mb-1">{lang.flag}</span>
                  <span className="text-xs font-bold">{lang.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-navy mb-3">{t('classes.studentLevel')}</label>
            <div className="flex gap-2">
              {LEVELS.map(level => (
                <button key={level} onClick={() => setForm({ ...form, level })}
                  className={`px-4 py-2 rounded-full border-2 font-bold text-sm transition-colors
                    ${form.level === level
                      ? 'border-navy bg-brand-red text-white'
                      : 'border-navy/15 text-navy hover:border-navy/40'}`}>
                  {level}
                </button>
              ))}
            </div>
          </div>
          </>
          )}

          <div>
            <label className="block text-sm font-bold text-navy mb-3">{t('classes.topic')}</label>
            <select name="topic" onChange={handleChange} value={form.topic}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 mb-3 focus:border-brand-red focus:outline-none transition-colors">
              <option value="">{t('classes.selectTopic')}</option>
              {TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}
              <option value="custom">{t('classes.topicOther')}</option>
            </select>
            {form.topic === 'custom' && (
              <input name="custom_topic" type="text" onChange={handleChange}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors"
                placeholder={t('classes.customTopicPlaceholder')}/>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-navy mb-1">{t('classes.classTitle')}</label>
            {requestId ? (
              <p className="w-full border-2 border-navy/10 bg-cream rounded-xl px-4 py-2.5 text-navy">{form.title}</p>
            ) : (
              <input name="title" type="text" onChange={handleChange} value={form.title}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors"
                placeholder={t('classes.classTitlePlaceholder')}/>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-navy mb-1">{t('classes.description')}</label>
            <textarea name="description" onChange={handleChange} value={form.description} rows={3}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 resize-none focus:border-brand-red focus:outline-none transition-colors"
              placeholder={t('classes.descriptionPlaceholder')}/>
          </div>

          <div>
            <label className="block text-sm font-bold text-navy mb-1">
              {t('classes.dateTime')} <span className="text-navy/40 font-normal">{t('classes.dateTimeHint')}</span>
            </label>
            <DateTimePicker value={form.scheduled_at} onChange={val => { setDateTimeError(''); setForm({ ...form, scheduled_at: val }) }} t={t} />
            {dateTimeError && <p className="text-brand-red text-sm font-medium mt-1.5">{t(dateTimeError)}</p>}
          </div>

          <div className={requestId ? '' : 'grid grid-cols-2 gap-4'}>
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('classes.duration')}</label>
              <select name="duration_minutes" onChange={handleChange} value={form.duration_minutes}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors">
                <option value={30}>{t('classes.minutes30')}</option>
                <option value={45}>{t('classes.minutes45')}</option>
                <option value={60}>{t('classes.minutes60')}</option>
                <option value={90}>{t('classes.minutes90')}</option>
              </select>
            </div>
            {!requestId && (
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('classes.maxStudentsLabel')}</label>
              <select name="max_students" onChange={handleChange} value={form.max_students}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors">
                {CLASS_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n}>{t('classes.studentsCount', { n })}</option>
                ))}
              </select>
            </div>
            )}
          </div>

          {!requestId && (
          <div>
            <label className="block text-sm font-bold text-navy mb-1">{t('classes.format')}</label>
            <div className="flex gap-3">
              <button onClick={() => setForm({ ...form, format: 'one-time' })}
                className={`flex-1 py-3 rounded-full border-2 font-bold text-sm transition-colors
                  ${form.format === 'one-time'
                    ? 'border-navy bg-brand-red text-white'
                    : 'border-navy/15 text-navy'}`}>
                {t('classes.oneTimeClass')}
              </button>
              <button onClick={() => setForm({ ...form, format: 'recurring' })}
                className={`flex-1 py-3 rounded-full border-2 font-bold text-sm transition-colors
                  ${form.format === 'recurring'
                    ? 'border-navy bg-brand-red text-white'
                    : 'border-navy/15 text-navy'}`}>
                {t('classes.recurringClass')}
              </button>
            </div>
          </div>
          )}

          {form.format === 'recurring' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-navy mb-1">{t('classes.frequency')}</label>
                <select name="recurrence_type" onChange={handleChange} value={form.recurrence_type}
                  className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors">
                  <option value="">{t('classes.selectFrequency')}</option>
                  <option value="weekly">{t('classes.weekly')}</option>
                  <option value="biweekly">{t('classes.biweekly')}</option>
                  <option value="monthly">{t('classes.monthly')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-navy mb-1">
                  {t('classes.recursUntil')} <span className="text-navy/40 font-normal">{t('classes.recursUntilHint')}</span>
                </label>
                <input name="recurrence_end_date" type="date" onChange={handleChange}
                  value={form.recurrence_end_date}
                  className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors"/>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-navy mb-1">
              {t('classes.materials')} <span className="text-navy/40 font-normal">{t('classes.optional')}</span>
            </label>
            <textarea name="materials" onChange={handleChange} value={form.materials} rows={2}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 resize-none focus:border-brand-red focus:outline-none transition-colors"
              placeholder={t('classes.materialsPlaceholder')}/>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
            {loading ? t('classes.submitting') : t('classes.submitForApproval')}
          </button>

        </div>
      </div>
    </main>
  )
}
