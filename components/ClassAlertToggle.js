'use client'
import { useState, useEffect } from 'react'
import { rememberReturnPath } from '../lib/auth'

const API = ''

// "Email me when a new Korean A2 class is posted." Shown on the browse page
// once a language is picked. If the alerts endpoint fails (for example the
// table is not there yet) it renders nothing rather than a broken button.
export default function ClassAlertToggle({ language, level, label, t }) {
  const [state, setState] = useState('loading') // loading | off | on | hidden
  const [busy, setBusy] = useState(false)
  const alertLevel = level === 'all' ? '' : level

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setState('off'); return }
    let cancelled = false
    fetch(`${API}/api/class-alerts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(alerts => {
        if (cancelled) return
        setState(alerts.some(a => a.language_code === language && a.level === alertLevel) ? 'on' : 'off')
      })
      .catch(() => !cancelled && setState('hidden'))
    return () => { cancelled = true }
  }, [language, alertLevel])

  const toggle = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      const back = new URLSearchParams({ language, ...(alertLevel ? { level: alertLevel } : {}) })
      rememberReturnPath(`/classes?${back}`)
      window.location.href = '/auth/register'
      return
    }
    setBusy(true)
    const turningOn = state === 'off'
    const params = new URLSearchParams({ language_code: language, level: alertLevel })
    const res = await fetch(turningOn ? `${API}/api/class-alerts` : `${API}/api/class-alerts?${params}`, {
      method: turningOn ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: turningOn ? JSON.stringify({ language_code: language, level: alertLevel }) : undefined,
    }).catch(() => null)
    if (res?.ok) setState(turningOn ? 'on' : 'off')
    setBusy(false)
  }

  if (state === 'loading' || state === 'hidden') return null
  return (
    <div className="flex items-center gap-3 flex-wrap bg-white border-2 border-navy/15 rounded-2xl px-4 py-3 mb-6">
      <span className="text-navy text-sm font-medium flex-1 min-w-[200px]">
        🔔 {state === 'on' ? t('classes.alertOn', { what: label }) : t('classes.alertOff', { what: label })}
      </span>
      <button type="button" onClick={toggle} disabled={busy}
        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border-2 border-navy transition-colors disabled:opacity-50 ${
          state === 'on' ? 'text-navy hover:bg-navy/5' : 'bg-navy text-white hover:bg-navy/90'}`}>
        {state === 'on' ? t('classes.alertTurnOff') : t('classes.alertTurnOn')}
      </button>
    </div>
  )
}
