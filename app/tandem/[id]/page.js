'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import { languageOptions } from '../../../lib/languages'
import { formatInTimezone } from '../../../lib/timezone'

const POLL_MS = 8000
const EARLY_MS = 10 * 60 * 1000
const BUTTON = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors'
const PRIMARY = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors disabled:opacity-40'

// One tandem's chat (backend routes/tandems.js). Temporary, like class
// chats: 2 days after Accept (or "Meet again") to agree a time, then until
// 1 day after the agreed call ends. Accepting the other partner's suggested
// time makes it the call; the video call (/classroom/tandem?tandem=<id>)
// opens 10 minutes before it.
// ponytail: polling like the request chat; Realtime if chats get busy.
export default function TandemChatPage() {
  const { id } = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [proposal, setProposal] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [now, setNow] = useState(0)
  const lastId = useRef(0)
  const listRef = useRef(null)

  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/auth/login'); return }
    let stopped = false
    const load = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await fetch(`/api/tandems/${id}/chat${lastId.current ? `?after=${lastId.current}` : ''}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
        if (stopped) return
        setNow(Date.now())
        if (!res.ok) { if (!lastId.current) setData({ denied: true }); return }
        const d = await res.json()
        if (stopped) return
        setData(d)
        if (d.messages.length) {
          lastId.current = d.messages.at(-1).id
          setMessages(m => [...m, ...d.messages.filter(n => !m.some(x => x.id === n.id))])
        }
      } catch {}
    }
    load()
    const timer = setInterval(load, POLL_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [id, router])

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages.length])

  if (!data) return <main className="min-h-screen bg-cream"><Navbar /></main>
  if (data.denied) return (
    <main className="min-h-screen bg-cream"><Navbar />
      <p className="max-w-2xl mx-auto px-4 py-10 text-navy/65">{t('tandem.notYours')} <Link href="/tandem" className="font-bold underline">{t('tandem.title')} →</Link></p>
    </main>
  )

  // Only reached in the browser, after the first load.
  const me = JSON.parse(localStorage.getItem('user') || 'null')
  const when = iso => formatInTimezone(iso, me?.timezone, me?.time_format)
  const other = data.other || {}
  const tandem = data.tandem
  const langs = Object.fromEntries(languageOptions(t).map(l => [l.code, l]))
  const flag = code => langs[code]?.flag || code || ''
  const accepted = tandem.status === 'accepted'
  const agreed = tandem.agreed_time ? new Date(tandem.agreed_time).getTime() : null
  const callUpcoming = agreed && agreed > now - 90 * 60 * 1000
  const videoOpen = callUpcoming && now >= agreed - EARLY_MS

  const call = async (url, body) => {
    setBusy(true); setError('')
    try {
      const res = await fetch(url, { method: 'POST', headers: auth(), body: JSON.stringify(body || {}) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'tandem.failed'); return null }
      return d
    } catch { setError('tandem.failed'); return null } finally { setBusy(false) }
  }

  const send = async () => {
    const body = draft.trim()
    if (!body) return
    const d = await call(`/api/tandems/${id}/chat`, { body, proposed_time: proposal ? new Date(proposal).toISOString() : undefined })
    if (!d) return
    lastId.current = Math.max(lastId.current, d.id)
    setMessages(m => [...m, d]); setDraft(''); setProposal('')
  }
  const agree = async messageId => {
    const d = await call(`/api/tandems/${id}/agree`, { message_id: messageId })
    if (d) setData(x => ({ ...x, tandem: { ...x.tandem, ...d } }))
  }
  const again = async () => {
    const d = await call(`/api/tandems/${id}/again`)
    if (d) setData(x => ({ ...x, open: true, tandem: { ...x.tandem, ...d } }))
  }
  const end = async () => { if (await call(`/api/tandems/${id}/end`)) router.push('/tandem') }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Link href="/tandem" className="text-navy/65 text-sm font-bold hover:text-navy">← {t('tandem.title')}</Link>
        <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5 flex items-center gap-3">
          <span className="w-14 h-14 rounded-full border-2 border-navy bg-brand-yellow/30 overflow-hidden flex items-center justify-center font-display font-extrabold text-navy text-xl shrink-0">
            {other.photo_url ? <img src={other.photo_url} alt="" className="w-full h-full object-cover"/> : (other.first_name || '?')[0]}
          </span>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-2xl text-navy leading-tight">{t('tandem.chatTitle', { name: other.first_name || '' })}</h1>
            <p className="text-navy/65 text-sm">{flag(me?.teach_language)} ⇄ {flag(other.teach_language)} · {t('tandem.free')}</p>
          </div>
        </section>

        {callUpcoming && (
          <section className="bg-brand-green/20 border-2 border-navy rounded-2xl p-4">
            <p className="font-bold text-navy">✅ {t('tandem.callAt', { time: when(tandem.agreed_time) })}</p>
            <p className="text-navy/80 text-sm mt-0.5">🎥 {videoOpen ? t('tandem.videoOpenNow') : t('tandem.videoOpensAt', { time: when(new Date(agreed - EARLY_MS).toISOString()) })}</p>
            {accepted && (videoOpen
              ? <a href={`/classroom/tandem?tandem=${id}`} className={`${PRIMARY} mt-2`}>🎥 {t('tandem.videoCall')}</a>
              : <span className={`${PRIMARY} mt-2 opacity-40 cursor-not-allowed`} aria-disabled="true">🎥 {t('tandem.videoCall')}</span>)}
          </section>
        )}

        <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5">
          <div ref={listRef} className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-navy/65 text-sm">{t('tandem.chatEmpty')}</p>}
            {messages.map(m => {
              const mine = m.user_id === me?.id
              const isAgreed = m.proposed_time && m.proposed_time === tandem.agreed_time
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && <span className="text-[11px] font-bold text-navy/65">{m.first_name}</span>}
                  <div className={`max-w-[85%] border-2 border-navy rounded-xl px-3 py-1.5 text-sm text-navy whitespace-pre-line break-words ${mine ? 'bg-brand-blue/15' : 'bg-white'}`}>
                    {m.body}
                    {m.proposed_time && (
                      <div className="mt-1.5 pt-1.5 border-t border-navy/15">
                        <span className="text-xs font-bold">🗓️ {t('reqchat.proposed')}: {when(m.proposed_time)}{isAgreed ? ` · ✅ ${t('tandem.agreedTag')}` : ''}</span>
                        {data.open && !mine && !isAgreed && new Date(m.proposed_time).getTime() > now && (
                          <button type="button" disabled={busy} onClick={() => agree(m.id)} className={`${PRIMARY} mt-1.5 text-xs`}>{t('reqchat.accept')}</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {data.open ? (
            <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); send() }}>
              <label className="flex items-center gap-2 text-sm text-navy flex-wrap">
                <span className="font-bold">🗓️ {t('reqchat.proposeTime')}</span>
                <input type="datetime-local" value={proposal} onChange={e => setProposal(e.target.value)}
                  className="border-2 border-navy/20 rounded-xl px-3 py-1.5 bg-white"/>
              </label>
              <div className="flex gap-2">
                <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} aria-label={t('chat.placeholder')}
                  placeholder={t('chat.placeholder')}
                  className="flex-1 min-w-0 border-2 border-navy/20 rounded-full px-4 py-2 text-sm text-navy bg-white focus:border-brand-red focus:outline-none"/>
                <button type="submit" disabled={!draft.trim() || busy}
                  className="bg-brand-red text-white border-2 border-navy rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40">{t('chat.send')}</button>
              </div>
              <p className="text-navy/55 text-xs">⏳ {t(tandem.agreed_time ? 'tandem.openUntilCall' : 'tandem.openUntilAgree', { time: when(tandem.chat_open_until) })}</p>
            </form>
          ) : accepted ? (
            <div className="mt-3 border-2 border-dashed border-navy rounded-xl p-3 bg-navy/5 text-sm text-navy">
              🔒 {t('tandem.closedNote')}
              <div className="mt-2"><button onClick={again} disabled={busy} className={PRIMARY}>🔁 {t('tandem.meetAgain')}</button></div>
              <p className="text-navy/65 text-xs mt-2">{t('tandem.meetAgainNote', { name: other.first_name || '' })}</p>
            </div>
          ) : <p className="text-navy/65 text-sm mt-3">{t('tandem.ended')}</p>}
          {error && <p className="text-brand-red text-xs font-bold mt-2">{t(error)}</p>}
          <p className="text-navy/55 text-xs mt-3">🔒 {t('tandem.chatPrivacy')} {t('chat.retention')}</p>
        </section>

        {accepted && (
          <div className="flex flex-wrap gap-2 items-center">
            <a href={`/teachers/${other.id}#report`} className={BUTTON}>🚩 {t('teacher.report')}</a>
            {confirmEnd ? (
              <span className="flex items-center gap-2 text-sm text-navy flex-wrap">
                {t('tandem.endConfirm', { name: other.first_name || '' })}
                <button onClick={end} className={PRIMARY}>{t('tandem.endYes')}</button>
                <button onClick={() => setConfirmEnd(false)} className="text-navy/65 font-bold">{t('tandem.cancel')}</button>
              </span>
            ) : <button onClick={() => setConfirmEnd(true)} className="text-navy/65 text-sm font-bold hover:text-brand-red px-2">{t('tandem.end')}</button>}
          </div>
        )}
      </div>
    </main>
  )
}
