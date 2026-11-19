'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '../lib/i18n/LanguageContext'

// The "Find me a partner" switch (backend PUT /api/tandems/open). Switching
// on tells members who learn your language (plan A, rate-limited there).
export function SwitchButton({ checked, onClick, disabled, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onClick} disabled={disabled}
      className={`relative w-14 h-8 shrink-0 rounded-full border-2 border-navy transition-colors disabled:opacity-50 ${checked ? 'bg-brand-green' : 'bg-navy/15'}`}>
      <span className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white border-2 border-navy transition-all ${checked ? 'right-[3px]' : 'left-[3px]'}`}/>
    </button>
  )
}

// { ok, error }: error is a translation key (common.phoneRequired when the
// phone isn't verified yet), so callers can show it with t().
export async function setTandemOpen(open) {
  try {
    const res = await fetch('/api/tandems/open', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ open }),
    })
    const d = await res.json().catch(() => ({}))
    return res.ok ? { ok: true } : { ok: false, error: d.error || 'tandem.failed' }
  } catch { return { ok: false, error: 'tandem.failed' } }
}

// Profile page card (plan B): the same switch for members who never visit
// the Tandem page.
export default function TandemSwitch() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null)).then(me => me && setOpen(Boolean(me.tandem_open))).catch(() => {})
  }, [])

  if (open === null) return null
  const toggle = async () => {
    setBusy(true); setError('')
    const r = await setTandemOpen(!open)
    if (r.ok) setOpen(!open)
    else setError(r.error)
    setBusy(false)
  }
  return (
    <div className="bg-white rounded-2xl p-5 border-2 border-navy mb-8 flex items-center justify-between gap-4">
      <div>
        <p className="font-bold text-navy">🤝 {t('tandem.switchLabel')}</p>
        <p className="text-navy/65 text-sm mt-0.5">{t(open ? 'tandem.profileOn' : 'tandem.profileOff')} <Link href="/tandem" className="font-bold underline">{t('tandem.title')} →</Link></p>
        {error && <p className="text-brand-red text-xs font-bold mt-1">{t(error)}</p>}
      </div>
      <SwitchButton checked={open} onClick={toggle} disabled={busy} label={t('tandem.switchLabel')}/>
    </div>
  )
}
