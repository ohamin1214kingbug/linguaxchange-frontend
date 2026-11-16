'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { formatInTimezone } from '../lib/timezone'
import { isUnread } from '../lib/chatSeen'

const POLL_MS = 60000
const PILL = 'shrink-0 inline-flex items-center border-2 border-navy rounded-full px-3 sm:px-4 py-1 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors'
const PRIMARY = 'shrink-0 inline-flex items-center border-2 border-navy rounded-full px-3 sm:px-4 py-1 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors'

// "5 min", "3 h", "2 d" in the site language.
function ago(iso, language) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  const rtf = new Intl.RelativeTimeFormat(language?.toLowerCase() || undefined, { numeric: 'auto', style: 'short' })
  if (mins < 60) return rtf.format(-Math.max(mins, 0), 'minute')
  if (mins < 24 * 60) return rtf.format(-Math.round(mins / 60), 'hour')
  return rtf.format(-Math.round(mins / 1440), 'day')
}

// Every chat the member can write in now (GET /api/chat/mine). The
// dashboard loads it once for both the Chats tab and its new-message badge.
// ponytail: polls once a minute; the chat pages poll every 8s themselves.
export function useChats() {
  const [chats, setChats] = useState(null)

  useEffect(() => {
    let stopped = false
    const load = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const res = await fetch('/api/chat/mine', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        if (!res.ok) return
        const d = await res.json()
        if (!stopped) setChats(d.chats || [])
      } catch {}
    }
    load()
    const timer = setInterval(load, POLL_MS)
    return () => { stopped = true; clearInterval(timer) }
  }, [])
  return chats
}

// The dashboard's Chats tab: the list, always open.
export default function ChatList({ chats, user }) {
  const { t, language } = useLanguage()
  if (!chats) return null
  const when = iso => formatInTimezone(iso, user?.timezone, user?.time_format)

  return (
    <section id="chats" className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] mb-4 px-3 sm:px-4 py-3">
      {chats.length === 0 ? <p className="text-navy/65 text-sm px-2 py-1">{t('chat.inboxEmpty')}</p> : (<>
        <p className="text-navy/65 text-xs font-semibold px-2 mb-1">{t('chat.inboxNote', { n: chats.length })}</p>
        <ul className="space-y-1">
          {chats.map(c => {
            const isNew = isUnread(c)
            return (
              <li key={`${c.type}-${c.id}`} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-cream">
                <span aria-hidden="true" className={`hidden sm:flex w-9 h-9 shrink-0 rounded-full border-2 border-navy items-center justify-center ${c.type === 'request' ? 'bg-brand-yellow/40' : 'bg-brand-blue/30'}`}>
                  {c.type === 'request' ? '🙋' : '🎥'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-bold text-navy text-sm">
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide border border-navy rounded-full px-1.5">
                      {t(c.type === 'request' ? 'chat.kindRequest' : 'chat.kindClass')}
                    </span>
                  </p>
                  {c.last && (
                    <p className="text-navy/65 text-sm truncate">
                      <span className="font-semibold text-navy">{c.last.mine ? t('chat.you') : c.last.first_name}:</span> {c.last.body}
                      {c.last.proposed_time ? ` · 🗓️ ${when(c.last.proposed_time)}` : ''}
                    </p>
                  )}
                  <p className="text-navy/65 text-xs">
                    {c.type === 'request' ? `⏳ ${t('reqchat.openUntil', { date: when(c.closes_at) })}` : t('chat.classAt', { date: when(c.session_date) })}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {c.last && (
                    <span className="flex items-center gap-1 text-[11px] text-navy/55 whitespace-nowrap">
                      {isNew && <span className="w-2.5 h-2.5 rounded-full bg-brand-red border border-navy" aria-label={t('chat.inboxNew', { n: 1 })}/>}
                      {ago(c.last.created_at, language)}
                    </span>
                  )}
                  <Link href={c.href} className={isNew ? PRIMARY : PILL}>{t('chat.openBtn')}</Link>
                </div>
              </li>
            )
          })}
        </ul>
      </>)}
    </section>
  )
}
