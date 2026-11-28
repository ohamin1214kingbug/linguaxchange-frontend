'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { InterestPicker } from './Interests'
import { interestEmoji } from '../lib/interests'

// Dashboard card for members who have no interest tags yet (owner,
// 2026-11-28): tags only match people once members have picked some, and
// everyone who signed up before the welcome step had none. Picks and saves
// right here. ✕ hides it on this device for a week.
const HIDE_KEY = 'gl-interests-hide-until'
const WEEK = 7 * 24 * 60 * 60 * 1000

export default function InterestsCard({ profile }) {
  const { t } = useLanguage()
  const [hidden, setHidden] = useState(true)
  const [picked, setPicked] = useState([])
  const [saved, setSaved] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let hide = false
    try { hide = Number(localStorage.getItem(HIDE_KEY)) > Date.now() } catch {}
    setHidden(hide)
  }, [])

  if (!profile?.id || (profile.interests || []).length > 0 && !saved) return null
  if (hidden && !saved) return null

  const dismiss = () => {
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + WEEK)) } catch {}
    setHidden(true)
  }
  const save = async () => {
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ interests: picked }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) setSaved(d.interests || picked)
      else setError(d.error || 'common.connectionError')
    } catch { setError('common.connectionError') }
    setBusy(false)
  }

  if (saved) return (
    <section className="bg-white border-2 border-navy rounded-2xl shadow-[4px_4px_0_var(--color-navy)] p-4 mb-6">
      <p className="font-display font-extrabold text-navy text-lg">✅ {t('interests.savedTitle', { list: saved.map(k => `${interestEmoji(k)} ${t(`interests.${k}`)}`).join(' · ') })}</p>
      <p className="text-navy/65 text-sm mt-0.5">{t('interests.savedBody')} <Link href="/profile" className="underline">{t('interests.changeOnProfile')}</Link></p>
      <Link href="/people" className="inline-block mt-3 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream">🤝 {t('interests.seeWho')}</Link>
    </section>
  )

  return (
    <section className="relative bg-[#fff8e0] border-2 border-navy rounded-2xl shadow-[4px_4px_0_var(--color-navy)] p-4 mb-6">
      <button type="button" onClick={dismiss} aria-label={t('interests.hide')} className="absolute top-2 right-3 text-xl text-navy/50 hover:text-navy">✕</button>
      <p className="font-display font-extrabold text-navy text-lg pr-8">✨ {t('interests.title')}</p>
      <p className="text-navy/65 text-sm mt-0.5 mb-3">{t('interests.cardHelp')}</p>
      <InterestPicker value={picked} onChange={setPicked} />
      {error && <p className="text-brand-red text-sm font-bold mt-2">{t(error)}</p>}
      <button type="button" onClick={save} disabled={busy || picked.length === 0}
        className="mt-3 bg-brand-red text-white border-2 border-navy rounded-full px-5 py-2 text-sm font-bold disabled:opacity-40">{t('interests.save')}</button>
    </section>
  )
}
