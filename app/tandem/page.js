'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions, levelLabel } from '../../lib/languages'

const CARD = 'bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-4'
const PRIMARY = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors disabled:opacity-40'
const BUTTON = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors'

function TandemAvatar({ user }) {
  return (
    <span className="w-14 h-14 rounded-full border-2 border-navy bg-brand-yellow/30 overflow-hidden flex items-center justify-center font-display font-extrabold text-navy text-xl shrink-0">
      {user?.photo_url ? <img src={user.photo_url} alt="" className="w-full h-full object-cover"/> : (user?.first_name || '?')[0]}
    </span>
  )
}

// Tandem partners (backend routes/tandems.js): members who opted in, perfect
// swaps first. A hello waits for Accept / Not now; accepted tandems open a
// private chat with a video call (/tandem/[id]). Free, no bananas.
export default function TandemPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [asking, setAsking] = useState(null)
  const [hello, setHello] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetch('/api/tandems', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setData({ failed: true }))
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/auth/login'); return }
    load()
  }, [load, router])

  const langs = Object.fromEntries(languageOptions(t).map(l => [l.code, l]))
  const lang = code => (langs[code] ? `${langs[code].flag} ${langs[code].name}` : code)
  const learnList = u => (u.learn_languages || []).filter(Boolean)

  const call = async (url, body, method = 'POST') => {
    setBusy(true); setError('')
    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body || {}),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'tandem.failed'); return null }
      return d
    } catch { setError('tandem.failed'); return null } finally { setBusy(false) }
  }

  const toggle = async () => { if (await call('/api/tandems/open', { open: !data.open }, 'PUT')) load() }
  const sendHello = async () => {
    if (await call('/api/tandems', { partner_id: asking.id, message: hello })) { setAsking(null); setHello(''); load() }
  }
  const respond = async (id, accept) => {
    if (!(await call(`/api/tandems/${id}/respond`, { accept }))) return
    if (accept) router.push(`/tandem/${id}`)
    else load()
  }
  const withdraw = async id => { if (await call(`/api/tandems/${id}/end`)) load() }

  if (!data) return <main className="min-h-screen bg-cream"><Navbar /></main>

  const tandems = data.tandems || []
  const incoming = tandems.filter(x => x.status === 'pending' && x.incoming)
  const waiting = tandems.filter(x => x.status === 'pending' && !x.incoming)
  const partners = tandems.filter(x => x.status === 'accepted')

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <header>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-navy">🤝 {t('tandem.title')}</h1>
          <p className="text-navy/65 text-sm md:text-base mt-1">{t('tandem.subtitle')}</p>
        </header>
        {data.failed && <p className="text-brand-red text-sm font-bold">{t('tandem.failed')}</p>}

        {!data.failed && (
          <label className={`${CARD} flex items-center justify-between gap-3 cursor-pointer`}>
            <span>
              <span className="block font-bold text-navy">{t('tandem.openToggle')}</span>
              <span className="block text-navy/65 text-xs mt-0.5">{t('tandem.openNote')}</span>
            </span>
            <input type="checkbox" checked={data.open} onChange={toggle} disabled={busy} className="w-6 h-6 accent-brand-red shrink-0"/>
          </label>
        )}
        {error && <p className="text-brand-red text-sm font-bold">{t(error)}</p>}

        {incoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display font-extrabold text-xl text-navy">👋 {t('tandem.incoming')}</h2>
            {incoming.map(x => (
              <div key={x.id} className={CARD}>
                <div className="flex items-center gap-3">
                  <TandemAvatar user={x.other}/>
                  <div className="min-w-0">
                    <a href={`/teachers/${x.other.id}`} className="font-display font-extrabold text-navy text-lg hover:text-brand-red">{t('tandem.wantsTandem', { name: x.other.first_name })}</a>
                    <p className="text-navy/65 text-xs">{lang(x.other.teach_language)} ⇄ {learnList(x.other).map(lang).join(', ')}</p>
                  </div>
                </div>
                <p className="mt-3 bg-cream border-2 border-navy/10 rounded-xl px-3 py-2 text-sm text-navy whitespace-pre-line break-words">{x.message}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => respond(x.id, true)} disabled={busy} className={PRIMARY}>✓ {t('tandem.accept')}</button>
                  <button onClick={() => respond(x.id, false)} disabled={busy} className={BUTTON}>{t('tandem.notNow')}</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {partners.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display font-extrabold text-xl text-navy">💬 {t('tandem.partners')}</h2>
            {partners.map(x => (
              <Link key={x.id} href={`/tandem/${x.id}`} className={`${CARD} flex items-center gap-3 hover:bg-cream transition-colors`}>
                <TandemAvatar user={x.other}/>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-extrabold text-navy text-lg">{x.other.first_name}</span>
                  <span className="block text-navy/65 text-xs">{lang(x.other.teach_language)} ⇄ {learnList(x.other).map(lang).join(', ')}</span>
                </span>
                <span className={BUTTON}>{t('tandem.openChat')} →</span>
              </Link>
            ))}
          </section>
        )}

        {waiting.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-display font-extrabold text-lg text-navy">⏳ {t('tandem.waiting')}</h2>
            {waiting.map(x => (
              <div key={x.id} className="flex items-center justify-between gap-3 bg-white border-2 border-navy/15 rounded-xl px-3 py-2">
                <span className="text-sm text-navy">{t('tandem.waitingFor', { name: x.other.first_name })}</span>
                <button onClick={() => withdraw(x.id)} disabled={busy} className="text-navy/65 text-xs font-bold hover:text-brand-red">{t('tandem.withdraw')}</button>
              </div>
            ))}
          </section>
        )}

        {!data.failed && (
          <section className="space-y-3">
            <h2 className="font-display font-extrabold text-xl text-navy">🔎 {t('tandem.matches')}</h2>
            {!data.has_languages ? (
              <div className="border-2 border-dashed border-navy rounded-2xl p-4 bg-[#fff8e6] text-sm text-navy">
                {t('tandem.needLanguages')} <a href="/profile" className="font-bold underline">{t('tandem.setLanguages')} →</a>
              </div>
            ) : data.matches.length === 0 ? (
              <div className="border-2 border-dashed border-navy rounded-2xl p-4 bg-[#fff8e6] text-sm text-navy">
                <b className="block mb-0.5">{t('tandem.noMatchesTitle')}</b>{t(data.open ? 'tandem.noMatchesOpen' : 'tandem.noMatchesClosed')}
              </div>
            ) : data.matches.map(m => (
              <div key={m.id} className={CARD}>
                <div className="flex items-center gap-3">
                  <TandemAvatar user={m}/>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`/teachers/${m.id}`} className="font-display font-extrabold text-navy text-lg hover:text-brand-red">{m.first_name}</a>
                      <span className={`text-[11px] font-bold border-2 border-navy rounded-full px-2 ${m.perfect ? 'bg-brand-green/40' : 'bg-white'}`}>
                        {m.perfect ? `⇄ ${t('tandem.perfect')}` : t('tandem.oneWay')}
                      </span>
                    </div>
                    <p className="text-navy/65 text-xs mt-0.5">
                      {t('tandem.teaches')} {lang(m.teach_language)}
                      {learnList(m).length > 0 && <> · {t('tandem.learns')} {learnList(m).map(c => `${lang(c)}${m.learn_details?.[c]?.level ? ` ${levelLabel(c, m.learn_details[c].level, t)}` : ''}`).join(', ')}</>}
                      {m.sharedTimes > 0 && <> · 🕒 {t('tandem.sharedTimes')}</>}
                    </p>
                  </div>
                </div>
                {asking?.id === m.id ? (
                  <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); sendHello() }}>
                    <textarea value={hello} onChange={e => setHello(e.target.value)} maxLength={300} rows={3} autoFocus
                      aria-label={t('tandem.helloLabel')} placeholder={t('tandem.helloPlaceholder', { name: m.first_name })}
                      className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm text-navy bg-white focus:border-brand-red focus:outline-none"/>
                    <p className="text-navy/65 text-xs">🔒 {t('tandem.helloPrivacy', { name: m.first_name })}</p>
                    <div className="flex gap-2">
                      <button type="submit" disabled={!hello.trim() || busy} className={PRIMARY}>{t('tandem.send')}</button>
                      <button type="button" onClick={() => setAsking(null)} className={BUTTON}>{t('tandem.cancel')}</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => { setAsking(m); setHello('') }} className={`${m.perfect ? PRIMARY : BUTTON} mt-3`}>
                    👋 {t(m.perfect ? 'tandem.ask' : 'tandem.askAnyway')}
                  </button>
                )}
              </div>
            ))}
            <p className="text-navy/55 text-xs">{t('tandem.footnote')}</p>
          </section>
        )}
      </div>
    </main>
  )
}
