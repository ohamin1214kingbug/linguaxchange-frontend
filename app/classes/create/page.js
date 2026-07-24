'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export default function CreateClass() {
  const router = useRouter()
  const { t } = useLanguage()
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
    recurrence_end_date: '',
    max_students: 6,
    duration_minutes: 60,
    materials: '',
    scheduled_at: '',
  })

  const LANGUAGES = [
    { code: 'KO', flag: '🇰🇷', name: t('home.langKorean') },
    { code: 'ES', flag: '🇪🇸', name: t('home.langSpanish') },
    { code: 'DE', flag: '🇩🇪', name: t('home.langGerman') },
    { code: 'EN', flag: '🇬🇧', name: t('home.langEnglish') },
    { code: 'PT', flag: '🇧🇷', name: t('home.langPortuguese') },
  ]

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.language_code) return setError(t('classes.errorSelectLanguage'))
    if (!form.level) return setError(t('classes.errorSelectLevel'))
    if (!form.topic && !form.custom_topic) return setError(t('classes.errorSelectTopic'))
    if (!form.title) return setError(t('classes.errorClassTitle'))
    if (!form.scheduled_at) return setError(t('classes.errorDateTime'))
    if (form.format === 'recurring' && !form.recurrence_type) return setError(t('classes.errorFrequency'))
    if (form.format === 'recurring' && !form.recurrence_end_date) return setError(t('classes.errorRecursUntil'))
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
        setError(data.error || t('auth.errorSomethingWrong'))
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(t('common.connectionError'))
    }
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl border-2 border-navy w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="font-display font-extrabold text-navy text-2xl mb-2">{t('classes.classSubmitted')}</h1>
          <p className="text-navy/60 mb-6">{t('classes.pendingApprovalText')}</p>
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
      <nav className="flex items-center justify-between px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <a href="/dashboard" className="text-navy/70 font-medium hover:text-navy">{t('common.backToDashboard')}</a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">{t('classes.createClass')}</h1>
        <p className="text-navy/60 mb-8">{t('classes.fillDetails')}</p>

        {error && (
          <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 rounded-xl px-4 py-3 mb-6 text-sm font-medium">{error}</div>
        )}

        <div className="bg-white rounded-2xl p-6 border-2 border-navy space-y-6">

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
            <input name="title" type="text" onChange={handleChange} value={form.title}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors"
              placeholder={t('classes.classTitlePlaceholder')}/>
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
            <input name="scheduled_at" type="datetime-local" onChange={handleChange}
              value={form.scheduled_at}
              className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors"/>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-bold text-navy mb-1">{t('classes.maxStudentsLabel')}</label>
              <select name="max_students" onChange={handleChange} value={form.max_students}
                className="w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 focus:border-brand-red focus:outline-none transition-colors">
                {[3,4,5,6,7,8,9,10].map(n => (
                  <option key={n} value={n}>{t('classes.studentsCount', { n })}</option>
                ))}
              </select>
            </div>
          </div>

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
