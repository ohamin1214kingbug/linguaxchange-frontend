'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import DateTimePicker from './DateTimePicker'
import { formatInTimezone, asUtcDate } from '../lib/timezone'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// Mirrors utils/classRequests.js hoursLeft on the backend — the badge needs
// it per-render, and asking the server for a countdown would be silly.
function hoursLeft(expiresAt) {
  const ms = asUtcDate(expiresAt).getTime() - Date.now()
  return ms <= 0 ? 0 : Math.floor(ms / 3600000)
}

// The demand side of the board: students post what they want to learn,
// teachers browse it. Shares the parent page's language/level filters
// instead of growing a second set of its own.
export default function ClassRequests({ language, level, currentUser, langs }) {
  const { t } = useLanguage()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [posted, setPosted] = useState(false)
  const [form, setForm] = useState({
    language_code: '', level: '', topic: '', details: '',
    max_students: 4, preferred_time: '', time_flexible: true
  })

  const load = () => {
    const params = new URLSearchParams()
    if (language && language !== 'all') params.set('language_code', language)
    if (level && level !== 'all') params.set('level', level)
    fetch(`${API}/api/class-requests?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        setRequests(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [language, level])

  const authed = (path, options) => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/auth/login'
      return null
    }
    return fetch(`${API}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options?.headers || {}) }
    })
  }

  const submit = async () => {
    setError('')
    setBusy('form')
    try {
      const res = await authed('/api/class-requests', {
        method: 'POST',
        body: JSON.stringify({ ...form, level: form.level || null, preferred_time: form.preferred_time ? new Date(form.preferred_time).toISOString() : '' })
      })
      if (!res) return
      const data = await res.json()
      if (!res.ok) setError(data.error || 'common.connectionError')
      else {
        setShowForm(false)
        setPosted(true)
        setForm({ language_code: '', level: '', topic: '', details: '', max_students: 4, preferred_time: '', time_flexible: true })
        load()
      }
    } catch (e) {
      setError('common.connectionError')
    }
    setBusy(null)
  }

  const toggleInterest = async (req) => {
    setBusy(req.id)
    const res = await authed(`/api/class-requests/${req.id}/interest`, { method: 'POST' })
    if (res) {
      const data = await res.json()
      if (!res.ok) setError(data.error)
      else load()
    }
    setBusy(null)
  }

  const withdraw = async (req) => {
    if (!window.confirm(t('requests.confirmWithdraw'))) return
    setBusy(req.id)
    const res = await authed(`/api/class-requests/${req.id}`, { method: 'DELETE' })
    if (res) load()
    setBusy(null)
  }

  // Hands the request over to the class form, which posts back to
  // /fulfill once the class exists so everyone who asked gets told.
  const teachHref = (req) => '/classes/create?' + new URLSearchParams({
    request: req.id,
    language_code: req.language_code,
    level: req.level || '',
    topic: req.topic,
    max_students: req.max_students,
    preferred_time: req.preferred_time
  }).toString()

  const field = 'w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy focus:border-brand-red focus:outline-none transition-colors'
  const label = 'block text-sm font-bold text-navy mb-1.5'

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-navy/60 text-sm">{t('requests.subtitle')}</p>
          <p className="text-navy/40 text-xs mt-1">⏳ {t('requests.ttlNote')}</p>
        </div>
        <button onClick={() => { setShowForm(o => !o); setPosted(false); setError('') }}
          className="bg-navy text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-navy/90 whitespace-nowrap transition-colors">
          {showForm ? t('requests.cancel') : `+ ${t('requests.post')}`}
        </button>
      </div>

      {posted && !showForm && (
        <div className="bg-brand-teal/10 text-brand-teal border-2 border-brand-teal/30 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
          {t('requests.posted')}
        </div>
      )}

      {showForm && (
        <div className="bg-white border-2 border-navy rounded-2xl p-5 md:p-6 mb-8 space-y-4">
          {error && (
            <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 px-4 py-3 rounded-xl text-sm font-medium">{t(error)}</div>
          )}

          <div>
            <label className={label}>{t('requests.whatLabel')}</label>
            <input value={form.topic} maxLength={80}
              onChange={e => setForm({ ...form, topic: e.target.value })}
              placeholder={t('requests.whatPlaceholder')} className={field}/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>{t('requests.languageLabel')}</label>
              <select value={form.language_code} onChange={e => setForm({ ...form, language_code: e.target.value })} className={field}>
                <option value="">—</option>
                {Object.entries(langs).map(([code, l]) => (
                  <option key={code} value={code}>{l.flag} {l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>{t('requests.levelLabel')}</label>
              <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} className={field}>
                <option value="">{t('requests.anyLevel')}</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>{t('requests.detailsLabel')} <span className="text-navy/40 font-normal">{t('classes.optional')}</span></label>
            <textarea value={form.details} rows={3} maxLength={400}
              onChange={e => setForm({ ...form, details: e.target.value })}
              placeholder={t('requests.detailsPlaceholder')} className={field}/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>{t('requests.sizeLabel')}</label>
              <select value={form.max_students} onChange={e => setForm({ ...form, max_students: parseInt(e.target.value) })} className={field}>
                {[1, 2, 3, 4, 6, 8, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{t('classes.studentsCount', { n })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>{t('requests.timeLabel')}</label>
              <DateTimePicker value={form.preferred_time} onChange={v => setForm({ ...form, preferred_time: v })} t={t}/>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer bg-cream border-2 border-navy/10 rounded-xl px-4 py-3">
            <input type="checkbox" checked={form.time_flexible}
              onChange={e => setForm({ ...form, time_flexible: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-brand-red"/>
            <span className="text-sm text-navy font-medium">{t('requests.flexibleLabel')}</span>
          </label>

          <button onClick={submit} disabled={busy === 'form'}
            className="w-full bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
            {busy === 'form' ? t('requests.posting') : t('requests.submit')}
          </button>
        </div>
      )}

      {loading && <p className="text-navy/40">{t('requests.loading')}</p>}

      <div className="space-y-4">
        {requests.map(req => {
          const interested = (req.class_request_interest || []).map(i => i.user_id)
          const mine = req.student_id === currentUser?.id
          const iWantThis = currentUser && interested.includes(currentUser.id)
          const hours = hoursLeft(req.expires_at)

          return (
            <div key={req.id} className="bg-white rounded-2xl p-4 md:p-6 border-2 border-navy">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-lg">{langs[req.language_code]?.flag}</span>
                {req.level ? (
                  <span className="bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">{req.level}</span>
                ) : (
                  <span className="bg-navy/5 text-navy/50 px-2 py-0.5 rounded-full text-xs font-bold">{t('requests.anyLevel')}</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                  hours < 3 ? 'bg-brand-red/10 text-brand-red border-brand-red/30' : 'bg-navy/5 text-navy/50 border-navy/10'}`}>
                  ⏳ {hours < 1 ? t('requests.expiresSoon') : t('requests.expiresIn', { n: hours })}
                </span>
                {req.time_flexible && (
                  <span className="bg-brand-yellow/20 text-navy px-2 py-0.5 rounded-full text-xs font-bold border border-brand-yellow">
                    🤝 {t('requests.flexibleBadge')}
                  </span>
                )}
              </div>

              <h3 className="font-display font-bold text-navy text-lg mb-1">{req.topic}</h3>
              {req.details && <p className="text-navy/60 text-sm mb-2 whitespace-pre-line">{req.details}</p>}

              <p className="text-brand-red text-xs font-bold mb-1">
                🗓️ {formatInTimezone(req.preferred_time, currentUser?.timezone, currentUser?.time_format)}
              </p>
              <p className="text-navy/40 text-xs mb-4">
                👥 {t('requests.studentsWanted', { n: req.max_students })}
                {req.student && ` · ${req.student.first_name} ${req.student.last_name}`}
                {interested.length > 0 && ` · 🙋 ${t('requests.interestedCount', { n: interested.length })}`}
              </p>

              <div className="flex flex-wrap gap-2">
                {mine ? (
                  <>
                    <span className="bg-navy/5 text-navy/60 px-4 py-2 rounded-full text-sm font-bold">{t('requests.yourRequest')}</span>
                    <button onClick={() => withdraw(req)} disabled={busy === req.id}
                      className="px-4 py-2 rounded-full text-sm font-bold border-2 border-navy/20 text-navy/60 hover:border-brand-red hover:text-brand-red disabled:opacity-50 transition-colors">
                      {t('requests.withdraw')}
                    </button>
                  </>
                ) : (
                  <>
                    <a href={teachHref(req)}
                      className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
                      {t('requests.teachThis')}
                    </a>
                    <button onClick={() => toggleInterest(req)} disabled={busy === req.id}
                      className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors disabled:opacity-50 ${
                        iWantThis ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/40' : 'bg-white text-navy border-navy/20 hover:border-navy'}`}>
                      {iWantThis ? `✓ ${t('requests.wantingThis')}` : `+1 ${t('requests.wantThis')}`}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {!loading && requests.length === 0 && (
          <div className="text-center py-12">
            <p className="text-navy/40">{t('requests.empty')}</p>
            <p className="text-navy/30 text-sm mt-1">{t('requests.emptyHint')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
