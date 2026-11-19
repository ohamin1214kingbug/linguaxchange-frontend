'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../../components/Navbar'
import { useLanguage } from '../../../../lib/i18n/LanguageContext'
import { languageOptions } from '../../../../lib/languages'
import { formatInTimezone } from '../../../../lib/timezone'

const POLL_MS = 8000
const EARLY_MS = 10 * 60 * 1000
const PRIMARY = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors disabled:opacity-40'

// A tandem group's page (backend routes/tandemGroups.js): who's coming on
// each side, the group chat (open until 1 day after the call ends, like a
// class chat) and the video call (/classroom/tandem?group=<id>), which opens
// 10 minutes before. Members can leave; the host can cancel.
// ponytail: polling like the other chats; Realtime if chats get busy.
export default function TandemGroupPage() {
  const { id } = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
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
        const res = await fetch(`/api/tandem-groups/${id}/chat${lastId.current ? `?after=${lastId.current}` : ''}`, {
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
      <p className="max-w-2xl mx-auto px-4 py-10 text-navy/65">{t('tandem.groupNotMember')} <Link href="/tandem?tab=groups" className="font-bold underline">{t('tandem.tabGroups')} →</Link></p>
    </main>
  )

  // Only reached in the browser, after the first load.
  const me = JSON.parse(localStorage.getItem('user') || 'null')
  const when = iso => formatInTimezone(iso, me?.timezone, me?.time_format)
  const g = data.group
  const langs = Object.fromEntries(languageOptions(t).map(l => [l.code, l]))
  const lang = code => (langs[code] ? `${langs[code].flag} ${langs[code].name}` : code)
  const start = new Date(g.starts_at).getTime()
  const ended = now > start + (g.duration_minutes + 30) * 60 * 1000
  const videoOpen = !g.cancelled_at && !ended && now >= start - EARLY_MS

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
    const d = await call(`/api/tandem-groups/${id}/chat`, { body })
    if (!d) return
    lastId.current = Math.max(lastId.current, d.id)
    setMessages(m => [...m, d]); setDraft('')
  }
  const leaveOrCancel = async () => {
    if (await call(`/api/tandem-groups/${id}/${g.is_host ? 'cancel' : 'leave'}`)) router.push('/tandem?tab=groups')
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Link href="/tandem?tab=groups" className="text-navy/65 text-sm font-bold hover:text-navy">← {t('tandem.tabGroups')}</Link>
        <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-navy/65">👥 {t('tandem.groupLabel')}</p>
          <h1 className="font-display font-extrabold text-2xl text-navy leading-tight mt-1">{lang(g.lang_a)} ⇄ {lang(g.lang_b)}</h1>
          <p className="text-navy/65 text-sm mt-1">🗓️ {when(g.starts_at)} · {g.duration_minutes} min · {t('tandem.hostedBy', { name: g.host_first_name })}</p>
          {g.topic && <p className="text-navy text-sm mt-1 break-words">{g.topic}</p>}
          <p className="text-navy/65 text-xs mt-2">{t('tandem.groupHowTo', { a: lang(g.lang_a), b: lang(g.lang_b) })}</p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[[g.side_a, g.lang_a], [g.side_b, g.lang_b]].map(([people, code]) => (
              <div key={code} className="border-2 border-navy/15 rounded-xl px-3 py-2">
                <p className="text-xs font-bold text-navy">{t('tandem.speakers', { lang: lang(code), n: people.length, max: g.half })}</p>
                <p className="text-sm text-navy mt-1">{people.map(p => p.first_name).join(', ') || '—'}</p>
              </div>
            ))}
          </div>
          {g.cancelled_at ? <p className="font-bold text-brand-red text-sm mt-3">{t('tandem.groupCancelled')}</p> : !ended && (
            <div className="mt-3">
              {videoOpen
                ? <a href={`/classroom/tandem?group=${id}`} className={PRIMARY}>🎥 {t('tandem.videoCall')}</a>
                : <span className={`${PRIMARY} opacity-40 cursor-not-allowed`} aria-disabled="true">🎥 {t('tandem.videoCall')}</span>}
              {!videoOpen && <p className="text-navy/65 text-xs mt-1.5">{t('tandem.videoOpensAt', { time: when(new Date(start - EARLY_MS).toISOString()) })}</p>}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5">
          <div ref={listRef} className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-navy/65 text-sm">{t('tandem.groupChatEmpty')}</p>}
            {messages.map(m => {
              const mine = m.user_id === me?.id
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && <span className="text-[11px] font-bold text-navy/65">{m.first_name}{m.user_id === g.host_id ? ` · ${t('tandem.hostTag')}` : ''}</span>}
                  <div className={`max-w-[85%] border-2 border-navy rounded-xl px-3 py-1.5 text-sm text-navy whitespace-pre-line break-words ${mine ? 'bg-brand-blue/15' : 'bg-white'}`}>{m.body}</div>
                </div>
              )
            })}
          </div>
          {data.open ? (
            <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); send() }}>
              <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} aria-label={t('chat.placeholder')}
                placeholder={t('chat.placeholder')}
                className="flex-1 min-w-0 border-2 border-navy/20 rounded-full px-4 py-2 text-sm text-navy bg-white focus:border-brand-red focus:outline-none"/>
              <button type="submit" disabled={!draft.trim() || busy}
                className="bg-brand-red text-white border-2 border-navy rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40">{t('chat.send')}</button>
            </form>
          ) : <p className="text-navy/65 text-sm mt-3">🔒 {t('tandem.groupChatClosed')}</p>}
          {error && <p className="text-brand-red text-xs font-bold mt-2">{t(error)}</p>}
          <p className="text-navy/55 text-xs mt-3">🔒 {t('tandem.groupChatPrivacy')} {t('chat.retention')}</p>
        </section>

        {!g.cancelled_at && start > now && (
          confirm ? (
            <p className="flex items-center gap-2 text-sm text-navy flex-wrap">
              {t(g.is_host ? 'tandem.cancelConfirm' : 'tandem.leaveConfirm')}
              <button onClick={leaveOrCancel} disabled={busy} className={PRIMARY}>{t('tandem.endYes')}</button>
              <button onClick={() => setConfirm(false)} className="text-navy/65 font-bold">{t('tandem.cancel')}</button>
            </p>
          ) : <button onClick={() => setConfirm(true)} className="text-navy/65 text-sm font-bold hover:text-brand-red">{t(g.is_host ? 'tandem.cancelGroup' : 'tandem.leaveGroup')}</button>
        )}
      </div>
    </main>
  )
}
