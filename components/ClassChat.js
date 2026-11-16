'use client'
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { formatInTimezone } from '../lib/timezone'

const API = ''
const POLL_MS = 8000
const MAX = 500

// A class session's chat: the teacher and booked students, from booking
// until 24 hours after the class (the backend decides; utils/chatAccess.js).
// Pass `sessionId`, or `classId` to show the member's own open session of
// that class. Renders nothing for someone who is not part of the class.
//
// Polls every few seconds while the tab is visible.
// ponytail: polling; move to Supabase Realtime if chats get busy.
export default function ClassChat({ sessionId: givenSession, classId, compact = false, user }) {
  const { t } = useLanguage()
  const [sessionId, setSessionId] = useState(givenSession || null)
  const [thread, setThread] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const lastId = useRef(0)

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

  // From a class page: which of this member's sessions has an open chat.
  useEffect(() => {
    if (givenSession || !classId || !localStorage.getItem('token')) return
    fetch(`${API}/api/chat/class/${classId}`, { headers: auth() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.session_id && setSessionId(d.session_id))
      .catch(() => {})
  }, [classId, givenSession])

  useEffect(() => {
    if (!sessionId) return
    let stopped = false
    const load = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await fetch(`${API}/api/chat/session/${sessionId}${lastId.current ? `?after=${lastId.current}` : ''}`, { headers: auth() })
        if (!res.ok) { if (!stopped && !lastId.current) setThread({ denied: true }); return }
        const data = await res.json()
        if (stopped) return
        setThread(data)
        if (data.messages.length) {
          lastId.current = data.messages.at(-1).id
          setMessages(m => [...m, ...data.messages.filter(n => !m.some(x => x.id === n.id))])
        }
      } catch {}
    }
    load()
    const timer = setInterval(load, POLL_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [sessionId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  if (!sessionId || !thread || thread.denied) return null

  const send = async () => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`${API}/api/chat/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({ body })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'chat.sendFailed'); return }
      lastId.current = Math.max(lastId.current, data.id)
      setMessages(m => [...m, data])
      setDraft('')
    } catch {
      setError('chat.sendFailed')
    } finally {
      setSending(false)
    }
  }

  const remove = async (id) => {
    const res = await fetch(`${API}/api/chat/messages/${id}`, { method: 'DELETE', headers: auth() })
    if (res.ok) setMessages(m => m.filter(x => x.id !== id))
  }

  // Only reached once the thread has loaded, so this runs in the browser.
  const viewer = user || JSON.parse(localStorage.getItem('user') || 'null')
  const me = viewer?.id
  return (
    <section id="chat" className={compact ? '' : 'bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5 mb-6 scroll-mt-24'}>
      {!compact && (
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <h2 className="font-display font-extrabold text-lg text-navy">💬 {t('chat.title')}</h2>
          {thread.open && (
            <span className="text-xs font-bold border-2 border-navy rounded-full px-2 py-0.5 bg-brand-yellow/40">
              {t('chat.closesAt', { date: formatInTimezone(thread.closes_at, viewer?.timezone, viewer?.time_format) })}
            </span>
          )}
        </div>
      )}
      <p className="text-navy/65 text-xs mb-3">{t('chat.privacy')}</p>
      <div ref={listRef} className={`space-y-2 overflow-y-auto pr-1 ${compact ? 'max-h-[45vh]' : 'max-h-96'}`}>
        {messages.length === 0 && <p className="text-navy/65 text-sm">{t('chat.empty')}</p>}
        {messages.map(m => {
          const mine = m.user_id === me
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {!mine && (
                <span className="text-[11px] font-bold text-navy/65">
                  {m.first_name}{m.is_teacher ? ` · ${t('chat.teacherTag')}` : ''}
                </span>
              )}
              <div className={`max-w-[85%] border-2 border-navy rounded-xl px-3 py-1.5 text-sm text-navy whitespace-pre-line break-words ${mine ? 'bg-brand-blue/15' : 'bg-white'}`}>
                {m.body}
              </div>
              {(mine || thread.is_teacher) && (
                <button type="button" onClick={() => remove(m.id)} className="text-[11px] text-navy/50 hover:text-brand-red">{t('chat.delete')}</button>
              )}
            </div>
          )
        })}
      </div>
      {thread.open ? (
        <form className="flex gap-2 mt-3" onSubmit={e => { e.preventDefault(); send() }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={MAX} aria-label={t('chat.placeholder')}
            placeholder={t('chat.placeholder')}
            className="flex-1 min-w-0 border-2 border-navy/20 rounded-full px-4 py-2 text-sm text-navy bg-white focus:border-brand-red focus:outline-none"/>
          <button type="submit" disabled={!draft.trim() || sending}
            className="bg-brand-red text-white border-2 border-navy rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40">
            {t('chat.send')}
          </button>
        </form>
      ) : <p className="text-navy/65 text-sm mt-3">{t('chat.closed')}</p>}
      {error && <p className="text-brand-red text-xs font-bold mt-2">{t(error)}</p>}
    </section>
  )
}
