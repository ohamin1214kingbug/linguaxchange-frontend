'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { languageOptions, levelLabel } from '../lib/languages'
import { userCode } from '../lib/userCode'
import { setTandemOpen } from './TandemSwitch'
import { InterestChips } from './Interests'

// People page: members who switched on "Find me a partner", by the language
// they teach (backend GET /api/tandems/people; owner, 2026-11-27). Saying
// hello is the Tandem hello, so the chat is the same temporary one. Any
// signed-in member sees the list; saying hello also lists them, because the
// backend only accepts a hello from someone who is listed too.
const CARD = 'bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-4'
const PRIMARY = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors disabled:opacity-40'
const BUTTON = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors disabled:opacity-40'
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

export default function TandemByLanguage() {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [pick, setPick] = useState(null)
  const [asking, setAsking] = useState(null)
  const [hello, setHello] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(new Set())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    fetch('/api/tandems/people', { headers: headers() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return
        setData(d)
        // Start on a language I learn that has someone, else the busiest one.
        const me = JSON.parse(localStorage.getItem('user') || 'null')
        const has = c => d.people.some(p => p.teach_language === c)
        const mine = (me?.learn_languages || []).find(has)
        setPick(mine || d.people[0]?.teach_language || null)
      })
      .catch(() => {})
  }, [])

  if (!data) return null
  const langs = languageOptions(t)
  const name = c => { const l = langs.find(x => x.code === c); return l ? `${l.flag} ${l.name}` : c }
  const count = c => data.people.filter(p => p.teach_language === c).length
  const shown = data.people.filter(p => p.teach_language === pick)
  const learnList = u => (u.learn_languages || []).filter(Boolean)

  const sendHello = async () => {
    setBusy(true); setError('')
    if (!data.open) {
      const r = await setTandemOpen(true)
      if (!r.ok) { setError(r.error); setBusy(false); return }
      setData(d => ({ ...d, open: true }))
    }
    try {
      const res = await fetch('/api/tandems', { method: 'POST', headers: headers(), body: JSON.stringify({ partner_id: asking.id, message: hello }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { setSent(s => new Set(s).add(asking.id)); setAsking(null) }
      else setError(d.error || 'tandem.failed')
    } catch { setError('tandem.failed') }
    setBusy(false)
  }

  const invite = async () => {
    const me = JSON.parse(localStorage.getItem('user') || 'null')
    try { await navigator.clipboard.writeText(`${t('tandem.inviteText')} https://gongbuleng.com/?invite=${userCode(me?.id)}`); setCopied(true) } catch {}
  }
  const switchOn = async () => {
    setBusy(true); setError('')
    const r = await setTandemOpen(true)
    if (r.ok) setData(d => ({ ...d, open: true })); else setError(r.error)
    setBusy(false)
  }

  return (
    <section className="mt-10">
      <h2 className="font-display font-extrabold text-xl text-navy">🤝 {t('people.tandemTitle')}</h2>
      <p className="text-navy/65 text-sm mt-1">{t('people.tandemSub')}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {langs.map(l => {
          const n = count(l.code)
          return (
            <button key={l.code} type="button" onClick={() => { setPick(l.code); setAsking(null); setError('') }} aria-pressed={pick === l.code}
              className={`border-2 rounded-full px-3 py-1 text-sm font-bold transition-colors ${pick === l.code ? 'bg-navy text-white border-navy' : n ? 'bg-white text-navy border-navy hover:bg-cream' : 'bg-white/60 text-navy/65 border-dashed border-navy/40'}`}>
              {l.flag} {l.name} <span className={pick === l.code ? 'text-white/75' : 'text-navy/55'}>{n}</span>
            </button>
          )
        })}
      </div>

      {error && <p className="text-brand-red text-sm font-bold mt-3">{t(error)}</p>}

      {pick && shown.length === 0 && (
        <div className="border-2 border-dashed border-navy/40 rounded-2xl p-4 bg-[#fff8e6] text-sm text-navy mt-4">
          <p className="font-display font-extrabold text-lg">{t('people.nobodyTitle', { lang: name(pick) })}</p>
          <p className="mt-1">{t('people.nobodyBody')}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={invite} className={BUTTON}>📨 {copied ? t('tandem.inviteCopied') : t('tandem.invite')}</button>
            {!data.open && <button onClick={switchOn} disabled={busy} className={BUTTON}>🔔 {t('people.findMe')}</button>}
          </div>
        </div>
      )}

      <div className="space-y-3 mt-4">
        {shown.map(m => (
          <div key={m.id} className={CARD}>
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-full border-2 border-navy bg-brand-yellow/30 overflow-hidden flex items-center justify-center font-display font-extrabold text-navy text-lg shrink-0">
                {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover"/> : (m.first_name || '?')[0]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`/teachers/${m.id}`} className="font-display font-extrabold text-navy text-lg hover:text-brand-red">{m.first_name}</a>
                  {m.forMe && (
                    <span className={`text-[11px] font-bold border-2 border-navy rounded-full px-2 ${m.perfect ? 'bg-brand-green/40' : 'bg-white'}`}>
                      {m.perfect ? `⇄ ${t('tandem.perfect')}` : t('tandem.oneWay')}
                    </span>
                  )}
                </div>
                <p className="text-navy/65 text-xs mt-0.5">
                  {t('tandem.teaches')} {name(m.teach_language)}
                  {learnList(m).length > 0 && <> · {t('tandem.learns')} {learnList(m).map(c => `${name(c)}${m.learn_details?.[c]?.level ? ` ${levelLabel(c, m.learn_details[c].level, t)}` : ''}`).join(', ')}</>}
                </p>
              </div>
            </div>
            <InterestChips interests={m.interests} mine={data.my_interests} />
            {m.live ? (
              <Link href="/tandem" className={`${BUTTON} mt-3`}>🤝 {t('people.inTandem')}</Link>
            ) : sent.has(m.id) ? (
              <p className="text-sm font-bold text-navy mt-3">✅ {t('people.sent')} <Link href="/tandem" className="underline">{t('people.openTandem')}</Link></p>
            ) : asking?.id === m.id ? (
              <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); sendHello() }}>
                <textarea value={hello} onChange={e => setHello(e.target.value)} maxLength={300} rows={3} autoFocus
                  aria-label={t('tandem.helloLabel')} placeholder={t('tandem.helloPlaceholder', { name: m.first_name })}
                  className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm text-navy bg-white focus:border-brand-red focus:outline-none"/>
                <p className="text-navy/65 text-xs">🔒 {t('tandem.helloPrivacy', { name: m.first_name })}</p>
                {!data.open && <p className="text-navy/65 text-xs">🔔 {t('people.listedNote')}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={!hello.trim() || busy} className={PRIMARY}>{t('tandem.send')}</button>
                  <button type="button" onClick={() => setAsking(null)} className={BUTTON}>{t('tandem.cancel')}</button>
                </div>
              </form>
            ) : (
              <button onClick={() => { setAsking(m); setHello(''); setError('') }} className={`${m.perfect ? PRIMARY : BUTTON} mt-3`}>👋 {t('people.sayHello')}</button>
            )}
          </div>
        ))}
      </div>
      <p className="text-navy/65 text-xs mt-3">👋 {t('people.chatNote')}</p>
    </section>
  )
}
