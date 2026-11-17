'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '../../../../components/Navbar'
import { useLanguage } from '../../../../lib/i18n/LanguageContext'
import { formatInTimezone } from '../../../../lib/timezone'
import { markSeen } from '../../../../lib/chatSeen'

const POLL_MS = 8000
const BUTTON = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors'
const PRIMARY = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors'

// The chat on a class request: the student who asked, the +1s and the
// teachers who offered agree a time. The student who asked and the teachers
// can attach a suggested time to a message; the other side accepts it (a
// teacher's time by the student, the student's by a teacher), and the
// agreed teacher then creates the class with the time filled in. The backend holds the request open while
// teachers talk (utils/requestChat.js).
// ponytail: polling like the class chat; Realtime if chats get busy.
export default function RequestChatPage() {
  const { id } = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [proposal, setProposal] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lastId = useRef(0)
  const listRef = useRef(null)

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.push('/auth/login'); return }
    let stopped = false
    const load = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await fetch(`/api/requests/${id}/chat${lastId.current ? `?after=${lastId.current}` : ''}`, { headers: auth() })
        if (!res.ok) { if (!stopped && !lastId.current) setData({ denied: true }); return }
        const d = await res.json()
        if (stopped) return
        setData(d)
        if (d.messages.length) {
          lastId.current = d.messages.at(-1).id
          markSeen('request', id, lastId.current)
          setMessages(m => [...m, ...d.messages.filter(n => !m.some(x => x.id === n.id))])
        }
      } catch {}
    }
    load()
    const timer = setInterval(load, POLL_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [id])

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }) }, [messages.length])

  if (!data) return <main className="min-h-screen bg-cream"><Navbar /></main>
  if (data.denied) return (
    <main className="min-h-screen bg-cream"><Navbar />
      <p className="max-w-2xl mx-auto px-4 py-10 text-navy/65">{t('reqchat.notMember')}</p>
    </main>
  )

  // Only reached in the browser, after the first load.
  const me = JSON.parse(localStorage.getItem('user') || 'null')
  const r = data.request
  const when = iso => formatInTimezone(iso, me?.timezone, me?.time_format)
  const agreedTeacher = data.teachers.find(x => x.id === r.agreed_teacher_id)
  const createHref = '/classes/create?' + new URLSearchParams({
    request: r.id, language_code: r.language_code, level: r.level || '', topic: r.topic,
    max_students: r.max_students, preferred_time: r.agreed_time || r.preferred_time,
  }).toString()

  const send = async () => {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/requests/${id}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() },
        body: JSON.stringify({ body, proposed_time: proposal ? new Date(proposal).toISOString() : undefined }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'chat.sendFailed'); return }
      lastId.current = Math.max(lastId.current, d.id)
      setMessages(m => [...m, d]); setDraft(''); setProposal('')
    } catch { setError('chat.sendFailed') } finally { setBusy(false) }
  }

  const accept = async (messageId) => {
    const res = await fetch(`/api/requests/${id}/accept`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...auth() }, body: JSON.stringify({ message_id: messageId }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || 'chat.sendFailed'); return }
    setData(x => ({ ...x, request: { ...x.request, agreed_time: d.agreed_time, agreed_teacher_id: d.agreed_teacher_id } }))
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-navy/65">{t('reqchat.title')}</p>
          <h1 className="font-display font-extrabold text-2xl text-navy leading-tight mt-1">🙋 {r.topic}</h1>
          <p className="text-navy/65 text-sm mt-1">
            {[r.level, t('reqchat.askedBy', { name: r.student_first_name }), `🗓️ ${when(r.preferred_time)}`].filter(Boolean).join(' · ')}
          </p>
          {data.teachers.length > 0 && <p className="text-navy text-sm mt-1">{t('reqchat.teachersOffered', { names: data.teachers.map(x => x.first_name).join(', ') })}</p>}
          {data.open && <p className="text-navy/65 text-xs mt-2">⏳ {t('reqchat.openUntil', { date: when(r.expires_at) })} · {t('reqchat.clockNote')}</p>}
        </section>

        {r.agreed_time && !r.fulfilled_class_id && (
          <section className="bg-brand-green/20 border-2 border-navy rounded-2xl p-4">
            <p className="font-bold text-navy">✅ {t('reqchat.agreed', { time: when(r.agreed_time) })}{agreedTeacher ? ` · ${agreedTeacher.first_name}` : ''}</p>
            {me?.id === r.agreed_teacher_id
              ? <a href={createHref} className={`${PRIMARY} mt-2`}>{t('reqchat.createClass')} →</a>
              : <p className="text-navy/80 text-sm mt-1">{t('reqchat.waitingTeacher', { name: agreedTeacher?.first_name || '' })}</p>}
          </section>
        )}

        <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5">
          <div ref={listRef} className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-navy/65 text-sm">{t('chat.empty')}</p>}
            {messages.map(m => {
              const mine = m.user_id === me?.id
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {!mine && <span className="text-[11px] font-bold text-navy/65">{m.first_name}{m.is_teacher ? ` · ${t('chat.teacherTag')}` : m.is_requester ? ` · ${t('reqchat.askedTag')}` : ''}</span>}
                  <div className={`max-w-[85%] border-2 border-navy rounded-xl px-3 py-1.5 text-sm text-navy whitespace-pre-line break-words ${mine ? 'bg-brand-blue/15' : 'bg-white'}`}>
                    {m.body}
                    {m.proposed_time && (
                      <div className="mt-1.5 pt-1.5 border-t border-navy/15">
                        <span className="text-xs font-bold">🗓️ {t('reqchat.proposed')}: {when(m.proposed_time)}</span>
                        {data.open && !mine && r.agreed_time !== m.proposed_time &&
                          ((data.is_requester && m.is_teacher) || (data.is_teacher && m.is_requester)) && (
                          <button type="button" onClick={() => accept(m.id)} className={`${PRIMARY} mt-1.5 text-xs`}>{t('reqchat.accept')}</button>
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
              {(data.is_teacher || data.is_requester) && (
                <label className="flex items-center gap-2 text-sm text-navy flex-wrap">
                  <span className="font-bold">🗓️ {t('reqchat.proposeTime')}</span>
                  <input type="datetime-local" value={proposal} onChange={e => setProposal(e.target.value)}
                    className="border-2 border-navy/20 rounded-xl px-3 py-1.5 bg-white"/>
                </label>
              )}
              <div className="flex gap-2">
                <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={500} aria-label={t('chat.placeholder')}
                  placeholder={t('chat.placeholder')}
                  className="flex-1 min-w-0 border-2 border-navy/20 rounded-full px-4 py-2 text-sm text-navy bg-white focus:border-brand-red focus:outline-none"/>
                <button type="submit" disabled={!draft.trim() || busy}
                  className="bg-brand-red text-white border-2 border-navy rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40">{t('chat.send')}</button>
              </div>
            </form>
          ) : r.fulfilled_class_id ? (
            <p className="text-navy text-sm mt-3">{t('reqchat.closedFulfilled')} <a href={`/classes/${r.fulfilled_class_id}`} className="font-bold underline">{t('reqchat.seeClass')} →</a></p>
          ) : <p className="text-navy/65 text-sm mt-3">{t('reqchat.closedExpired')}</p>}
          {error && <p className="text-brand-red text-xs font-bold mt-2">{t(error)}</p>}
          <p className="text-navy/55 text-xs mt-3">🔒 {t('reqchat.privacy')} {t('chat.retention')}</p>
        </section>
        {data.is_teacher && !r.agreed_time && data.open && <a href={createHref} className={BUTTON}>{t('reqchat.createClass')} →</a>}
      </div>
    </main>
  )
}
