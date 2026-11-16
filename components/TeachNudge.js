'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { languageOptions } from '../lib/languages'

const HIDE_KEY = 'teachNudgeHiddenUntil'
const HIDE_MS = 14 * 24 * 60 * 60 * 1000
const PILL = 'inline-flex items-center border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors'
const PRIMARY = 'inline-flex items-center border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors'

// "People want to learn your language", on the Teaching tab, for a member
// who teaches nothing coming up while others are learning their language
// (GET /api/classes/teach-demand). "Not now" hides it for 14 days on this
// device.
export default function TeachNudge() {
  const { t } = useLanguage()
  const [demand, setDemand] = useState(null)

  useEffect(() => {
    try { if (Number(localStorage.getItem(HIDE_KEY)) > Date.now()) return } catch {}
    fetch('/api/classes/teach-demand', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null)).then(setDemand).catch(() => {})
  }, [])

  if (!demand?.language_code || demand.own_upcoming > 0 || demand.learners < 1) return null
  const lang = languageOptions(t).find(l => l.code === demand.language_code)
  const name = lang?.name || demand.language_code
  const n = demand.learners
  const hide = () => {
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_MS)) } catch {}
    setDemand(null)
  }

  return (
    <section className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] mb-4 p-4 flex gap-4">
      <div className="text-center shrink-0 w-16">
        <p className="font-display font-extrabold text-4xl text-navy leading-none">{n}</p>
        <p className="text-navy/65 text-[11px] mt-1">{t('teachNudge.learning', { lang: name })}</p>
      </div>
      <div className="min-w-0">
        <p className="font-display font-extrabold text-navy text-lg leading-tight">
          {demand.upcoming === 0 ? t('teachNudge.titleNone', { n, lang: name }) : t('teachNudge.titleSome', { n, lang: name })}
        </p>
        <p className="text-navy/65 text-sm mt-1">
          {demand.upcoming === 0 ? t('teachNudge.noteNone', { n, lang: name }) : t('teachNudge.noteSome', { u: demand.upcoming, lang: name })}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Link href={`/classes/create?language_code=${demand.language_code}`} className={PRIMARY}>{t('teachNudge.post', { lang: name })}</Link>
          <button type="button" onClick={hide} className={PILL}>{t('teachNudge.notNow')}</button>
        </div>
      </div>
    </section>
  )
}
