'use client'
import { useState, useEffect } from 'react'
import { userCode } from '../lib/userCode'

const API = ''

// A member's invite link and how it has done. The stats line is left out if
// it can't be loaded; the link works either way.
export default function InviteCard({ userId, t }) {
  const [stats, setStats] = useState(null)
  const [copied, setCopied] = useState(false)
  const link = `https://gongbuleng.com/?invite=${userCode(userId)}`

  useEffect(() => {
    fetch(`${API}/api/referrals`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {})
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {}
  }

  return (
    // No frame or title of its own: the dashboard shows it inside a foldable
    // panel that carries both.
    <div>
      <p className="text-navy/65 text-sm mb-4">{t('dashboard.inviteBody')}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input readOnly value={link} aria-label={t('dashboard.inviteTitle')} onFocus={e => e.target.select()}
          className="flex-1 min-w-0 border-2 border-navy/20 rounded-full px-4 py-2 text-sm text-navy bg-cream"/>
        <button type="button" onClick={copy}
          className="bg-navy text-white px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap hover:bg-navy/90 transition-colors">
          {copied ? t('dashboard.inviteCopied') : t('dashboard.inviteCopy')}
        </button>
      </div>
      {stats && stats.joined > 0 && (
        <p className="text-navy text-sm font-medium mt-3">
          {t('dashboard.inviteStats', { joined: stats.joined, rewarded: stats.rewarded })}
        </p>
      )}
    </div>
  )
}
