'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import { languageOptions } from '../../../lib/languages'
import { formatInTimezone } from '../../../lib/timezone'

const POLL_MS = 8000
const BUTTON = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors'
const PRIMARY = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors'

// One tandem's private chat (backend routes/tandems.js): either partner can
// suggest a time, the other taps "Accept time" (sent as a reply), and the
// video call uses the classroom page with ?tandem=<id>. Ending it closes
// the chat; it stays readable until deleted 90 days later.
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
        if (!res.ok) { if (!stopped && !lastId.current) setData({ denied: true }); return }
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
  const langs = Object.fromEntries(languageOptions(t).map(l => [l.code, l]))
  const flag = code => langs[code]?.flag || code || ''

  const post = async (body, proposed) => {
    if (!body || busy) return false
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/tandems/${id}/chat`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ body, proposed_time: proposed ? new Date(proposed).toISOString() : undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'chat.sendFailed'); return false }
      lastId.current = Math.max(lastId.current, d.id)
      setMessages(m => [...m, d])
      return true
    } catch { setError('chat.sendFailed'); return false } finally { setBusy(false) }
  }
  const send = async () => { if (await post(draft.trim(), proposal)) { setDraft(''); setProposal('') } }

  const end = async () => {
    const res = await fetch(`/api/tandems/${id}/end`, { method: 'POST', headers: auth() })
    if (res.ok) router.push('/tandem')
    else setError('tandem.failed')
  }

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

        <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5">
          <div ref={listRef} className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-navy/65 text-sm">{t('tandem.chatEmpty')}</p>}
            {messages.map(m => {
              const mine = m.user_id === me?.id
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && <span className="text-[11px] font-bold text-navy/65">{m.first_name}</span>}
                  <div className={`max-w-[85%] border-2 border-navy rounded-xl px-3 py-1.5 text-sm text-navy whitespace-pre-line break-words ${mine ? 'bg-brand-blue/15' : 'bg-white'}`}>
                    {m.body}
                    {m.proposed_time && (
                      <div className="mt-1.5 pt-1.5 border-t border-navy/15">
                        <span className="text-xs font-bold">🗓️ {t('reqchat.proposed')}: {when(m.proposed_time)}</span>
                        {data.open && !mine && (
                          <button type="button" disabled={busy} onClick={() => post(`✓ ${t('tandem.timeWorks', { time: when(m.proposed_time) })}`)}
                            className={`${PRIMARY} mt-1.5 text-xs`}>{t('reqchat.accept')}</button>
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
            </form>
          ) : <p className="text-navy/65 text-sm mt-3">{t('tandem.ended')}</p>}
          {error && <p className="text-brand-red text-xs font-bold mt-2">{t(error)}</p>}
          <p className="text-navy/55 text-xs mt-3">🔒 {t('tandem.chatPrivacy')} {t('chat.retention')}</p>
        </section>

        {data.open && (
          <div className="flex flex-wrap gap-2 items-center">
            <a href={`/classroom/tandem?tandem=${id}`} className={PRIMARY}>🎥 {t('tandem.videoCall')}</a>
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
