'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '../lib/i18n/LanguageContext'

// Dashboard nudge for tandems (app/tandem): a waiting hello first, else how
// many possible partners there are. Shows nothing when there's neither.
export default function TandemCard() {
  const { t } = useLanguage()
  const [d, setD] = useState(null)

  useEffect(() => {
    fetch('/api/tandems', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null)).then(setD).catch(() => {})
  }, [])

  const incoming = (d?.tandems || []).filter(x => x.status === 'pending' && x.incoming).length
  const matches = d?.matches?.length || 0
  if (!incoming && !matches) return null
  const best = d.matches[0]

  return (
    <Link href="/tandem" className="flex items-center gap-3 flex-wrap bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-4 mb-6 hover:bg-cream transition-colors">
      <span className="text-3xl" aria-hidden="true">{incoming ? '👋' : '🤝'}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-display font-extrabold text-navy text-lg">
          {incoming ? t('tandem.cardIncoming', { n: incoming }) : t('tandem.cardMatches', { n: matches })}
        </span>
        {!incoming && best && <span className="block text-navy/65 text-sm">{t(best.perfect ? 'tandem.cardPerfect' : 'tandem.cardOneWay', { name: best.first_name })}</span>}
      </span>
      <span className="inline-flex items-center border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white">{t('tandem.cardCta')} →</span>
    </Link>
  )
}

// Explore page strip: tandem groups coming up, so people browsing classes
// see them too. Signed-in only (the list needs an account); nothing when
// there are none.
export function TandemGroupsStrip() {
  const { t } = useLanguage()
  const [n, setN] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch('/api/tandem-groups', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : [])).then(list => setN(Array.isArray(list) ? list.length : 0)).catch(() => {})
  }, [])

  if (!n) return null
  return (
    <Link href="/tandem?tab=groups" className="flex items-center gap-2 flex-wrap bg-brand-green/15 border-2 border-navy rounded-2xl px-4 py-2.5 mb-4 text-sm text-navy hover:bg-brand-green/25 transition-colors">
      <span aria-hidden="true">👥</span>
      <span className="font-bold">{t('tandem.stripGroups', { n })}</span>
      <span className="text-navy/70">{t('tandem.stripNote')}</span>
      <span className="ml-auto font-bold">→</span>
    </Link>
  )
}
