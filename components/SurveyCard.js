'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'

// The member survey (backend routes/survey.js): five questions, one per
// screen, 1 bonus banana at the end. Answers save on every Next, so closing
// halfway keeps them. "Not now" hides the card for 7 days on this device.
const HIDE_KEY = 'surveyHiddenUntil'
const HIDE_MS = 7 * 24 * 60 * 60 * 1000
const FACULTIES = ['Filología', 'Comercio y Turismo', 'Ciencias de la Información', 'Derecho', 'Económicas y Empresariales', 'Educación', 'Geografía e Historia', 'Filosofía', 'Psicología', 'Bellas Artes', 'Informática', 'Medicina', 'Ciencias Políticas y Sociología', 'Otra']
const Q = {
  heard_from: [['instagram', '📸'], ['tiktok', '🎵'], ['youtube', '▶️'], ['poster', '📄'], ['friend', '🧑‍🤝‍🧑'], ['faculty', '🏫'], ['google', '🔎'], ['other', '✏️']],
  who: [['ucm', '🎓'], ['erasmus', '🌍'], ['other_uni', '🏛️'], ['not_student', '💼']],
  goals: [['speaking', '🗣️'], ['exam', '📝'], ['travel', '✈️'], ['career', '💼'], ['people', '🤝']],
  times: [['weekday_morning', '🌅'], ['weekday_afternoon', '☀️'], ['weekday_evening', '🌙'], ['weekend', '🗓️']],
}
const OPT = 'w-full text-left border-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors'
const SELECT = 'w-full mt-2 border-2 border-navy rounded-xl px-3 py-2 text-sm bg-white text-navy'

export default function SurveyCard() {
  const { t } = useLanguage()
  const [a, setA] = useState(null)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null) // 'granted' | 'pending'
  const [error, setError] = useState('')
  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

  useEffect(() => {
    try { if (Number(localStorage.getItem(HIDE_KEY)) > Date.now()) return } catch {}
    fetch('/api/survey/me', { headers: auth() }).then(r => (r.ok ? r.json() : null)).then(d => {
      if (d && !d.completed_at) setA({ goals: [], times: [], ...d })
    }).catch(() => {})
  }, [])

  if (done) return (
    <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5 mb-6 text-center">
      <p className="font-display font-extrabold text-4xl text-navy">{done === 'granted' ? '+1 🍌' : '🍌'}</p>
      <p className="font-display font-extrabold text-navy text-lg">{t(done === 'granted' ? 'survey.thanksGranted' : 'survey.thanksPending')}</p>
    </section>
  )
  if (!a) return null

  const save = async (complete) => {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/survey/me', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({ heard_from: a.heard_from, heard_detail: a.heard_detail, who: a.who, who_detail: a.who_detail, goals: a.goals, times: a.times, ideas: a.ideas, complete }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'survey.saveFailed'); return false }
      if (complete) {
        setDone(d.banana === 'granted' ? 'granted' : 'pending')
        window.dispatchEvent(new Event('credits-changed'))
      }
      return true
    } catch { setError('survey.saveFailed'); return false } finally { setBusy(false) }
  }
  const next = async () => { if (await save(false)) setStep(s => s + 1) }
  const hide = () => { try { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_MS)) } catch {} setA(null) }
  const pick = (key, value) => setA(x => ({ ...x, [key]: value }))
  const toggle = (key, value, max) => setA(x => {
    const list = x[key] || []
    if (list.includes(value)) return { ...x, [key]: list.filter(v => v !== value) }
    return list.length >= max ? x : { ...x, [key]: [...list, value] }
  })
  const option = (key, [value, icon], multi, max) => {
    const on = multi ? (a[key] || []).includes(value) : a[key] === value
    return (
      <button key={value} type="button" aria-pressed={on} onClick={() => (multi ? toggle(key, value, max) : pick(key, value))}
        className={`${OPT} ${on ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-navy/20 hover:border-navy/50'}`}>
        {icon} {t(`survey.${key}_${value}`)}
      </button>
    )
  }
  const ready = { 1: a.heard_from, 2: a.who, 3: (a.goals || []).length, 4: (a.times || []).length, 5: true }[step]

  return (
    <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5 mb-6">
      <div className="flex gap-1.5 mb-2">{[1, 2, 3, 4, 5].map(n => <span key={n} className={`flex-1 h-1.5 rounded-full ${n <= step ? 'bg-brand-red' : 'bg-navy/15'}`}/>)}</div>
      <p className="text-xs font-bold text-navy/55">{t('survey.progress', { n: step })}</p>
      <h2 className="font-display font-extrabold text-navy text-xl leading-tight mt-1 mb-3">{t(`survey.q${step}`)}</h2>
      {step === 3 && <p className="text-navy/55 text-xs -mt-2 mb-2">{t('survey.pickTwo')}</p>}
      {step === 4 && <p className="text-navy/55 text-xs -mt-2 mb-2">{t('survey.pickAll')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {step === 1 && Q.heard_from.map(o => option('heard_from', o, false))}
        {step === 2 && Q.who.map(o => option('who', o, false))}
        {step === 3 && Q.goals.map(o => option('goals', o, true, 2))}
        {step === 4 && Q.times.map(o => option('times', o, true, 4))}
      </div>
      {step === 1 && a.heard_from === 'poster' && (
        <select value={a.heard_detail || ''} onChange={e => pick('heard_detail', e.target.value)} aria-label={t('survey.whichFaculty')} className={SELECT}>
          <option value="">{t('survey.whichFaculty')}</option>
          {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      )}
      {step === 1 && a.heard_from === 'other' && (
        <input value={a.heard_detail || ''} onChange={e => pick('heard_detail', e.target.value)} maxLength={80} placeholder={t('survey.otherPlaceholder')} className={SELECT}/>
      )}
      {step === 2 && a.who === 'ucm' && (
        <select value={a.who_detail || ''} onChange={e => pick('who_detail', e.target.value)} aria-label={t('survey.yourFaculty')} className={SELECT}>
          <option value="">{t('survey.yourFaculty')}</option>
          {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      )}
      {step === 5 && (<>
        <p className="text-navy/55 text-xs -mt-2 mb-2">{t('survey.optional')}</p>
        <textarea value={a.ideas || ''} onChange={e => pick('ideas', e.target.value)} maxLength={500} rows={3}
          className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm bg-white focus:border-brand-red focus:outline-none"/>
      </>)}
      {error && <p className="text-brand-red text-sm font-bold mt-2">{t(error)}</p>}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {step < 5
          ? <button type="button" onClick={next} disabled={!ready || busy} className="bg-brand-red text-white px-5 py-2 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40">{t('survey.next')}</button>
          : <button type="button" onClick={() => save(true)} disabled={busy} className="bg-brand-red text-white px-5 py-2 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40">{t('survey.getBanana')}</button>}
        {step > 1 && <button type="button" onClick={() => setStep(s => s - 1)} className="text-navy/65 text-sm font-bold underline">{t('survey.back')}</button>}
        <button type="button" onClick={hide} className="ml-auto text-navy/55 text-xs underline">{t('survey.notNow')}</button>
      </div>
    </section>
  )
}
