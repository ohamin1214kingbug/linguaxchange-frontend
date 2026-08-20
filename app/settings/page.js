'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { detectTimezone } from '../../lib/timezone'
import Navbar from '../../components/Navbar'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// Native IANA list — no library, no hardcoded table to go stale when a
// country changes its zones. A plain <select> is type-to-jump searchable,
// so it covers the "searchable dropdown" need without a combobox widget.
// ponytail: falls back to the stored zone alone on browsers without
// supportedValuesOf; swap in a combobox if 400 options proves unwieldy.
const TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch (e) {
    return []
  }
})()

const field = 'w-full border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy focus:border-brand-red focus:outline-none transition-colors'
const card = 'bg-white rounded-2xl p-6 border-2 border-navy mb-6'

// Reuses each section's own title as its tab label — one less place for
// copy to drift out of sync.
const TABS = [
  { key: 'prefs', label: 'settings.displayPrefs' },
  { key: 'password', label: 'settings.changePassword' },
  { key: 'data', label: 'settings.yourData' },
  { key: 'danger', label: 'settings.deleteAccount' }
]

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('prefs')
  const [prefs, setPrefs] = useState({ timezone: '', timezone_source: 'auto', time_format: '', low_credit_nudge: true })
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefsMessage, setPrefsMessage] = useState('')
  const [prefsOk, setPrefsOk] = useState(false)

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [changingPw, setChangingPw] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [pwOk, setPwOk] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [del, setDel] = useState({ password: '', confirm: '' })
  const [deleting, setDeleting] = useState(false)
  const [delMessage, setDelMessage] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const u = JSON.parse(stored)
    setUser(u)
    fetch(`${API}/api/users/${u.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setPrefs({
        timezone: data.timezone || detectTimezone() || '',
        timezone_source: data.timezone_source || 'auto',
        time_format: data.time_format || '',
        // Opt-out, not opt-in: absent/undefined (rows from before this
        // preference existed) reads as enabled, matching the column's own
        // DEFAULT and the backend's nudgeEnabledFromPrefs.
        low_credit_nudge: data.notification_preferences?.low_credit_nudge !== false
      }))
  }, [])

  const savePrefs = async () => {
    setSavingPrefs(true)
    setPrefsMessage('')
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        // time_format '' means "no preference"; the column is nullable and
        // NULL is what the formatters read as "follow the locale".
        body: JSON.stringify({
          timezone: prefs.timezone,
          timezone_source: prefs.timezone_source,
          time_format: prefs.time_format || null,
          notification_preferences: { low_credit_nudge: prefs.low_credit_nudge }
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setPrefsMessage(data.error || 'settings.prefsSaveFailed')
        setPrefsOk(false)
      } else {
        // The formatters read these from the cached user object, so times
        // would keep rendering the old way until the next login otherwise.
        localStorage.setItem('user', JSON.stringify({
          ...user,
          timezone: data.timezone,
          timezone_source: data.timezone_source,
          time_format: data.time_format,
          notification_preferences: data.notification_preferences
        }))
        setPrefs({
          timezone: data.timezone || '',
          timezone_source: data.timezone_source || 'auto',
          time_format: data.time_format || '',
          low_credit_nudge: data.notification_preferences?.low_credit_nudge !== false
        })
        setPrefsMessage('settings.prefsSaved')
        setPrefsOk(true)
      }
    } catch (e) {
      setPrefsMessage('common.connectionError')
      setPrefsOk(false)
    }
    setSavingPrefs(false)
  }

  const changePassword = async () => {
    setPwMessage('')
    if (pw.next !== pw.confirm) { setPwMessage('settings.passwordsDontMatch'); setPwOk(false); return }
    if (pw.next.length < 8) { setPwMessage('settings.passwordTooShort'); setPwOk(false); return }
    setChangingPw(true)
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ current_password: pw.current, new_password: pw.next })
      })
      const data = await res.json()
      if (!res.ok) {
        setPwMessage(data.error || 'settings.passwordChangeFailed')
        setPwOk(false)
      } else {
        // The old token died with the password change; the server hands back
        // a replacement so this device stays signed in.
        if (data.token) localStorage.setItem('token', data.token)
        setPw({ current: '', next: '', confirm: '' })
        setPwMessage('settings.passwordChanged')
        setPwOk(true)
      }
    } catch (e) {
      setPwMessage('common.connectionError')
      setPwOk(false)
    }
    setChangingPw(false)
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${API}/api/account/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!res.ok) throw new Error('export failed')
      // Blob + object URL rather than pointing the browser at the endpoint:
      // the download needs an Authorization header, which a plain link can't
      // send.
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `linguaxchange-data-${user.id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setDelMessage('settings.exportFailed')
    }
    setExporting(false)
  }

  const deleteAccount = async () => {
    setDelMessage('')
    if (!window.confirm(t('settings.deleteFinalWarning'))) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/account/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ password: del.password, confirm: del.confirm })
      })
      const data = await res.json()
      if (!res.ok) {
        setDelMessage(data.error || 'settings.deleteFailed')
        setDeleting(false)
        return
      }
      localStorage.clear()
      router.push('/')
    } catch (e) {
      setDelMessage('common.connectionError')
      setDeleting(false)
    }
  }

  if (!user) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('common.loading')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-6">{t('settings.title')}</h1>

        <div className="flex gap-2 mb-8 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          {TABS.map(tb => (
            <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap border-2 transition-colors ${
                tab === tb.key
                  ? tb.key === 'danger' ? 'bg-brand-red text-white border-navy' : 'bg-navy text-white border-navy'
                  : 'bg-white text-navy/60 border-navy/20 hover:border-navy hover:text-navy'
              }`}>
              {t(tb.label)}
            </button>
          ))}
        </div>

        {/* Display preferences */}
        {tab === 'prefs' && (
        <div className={card}>
          <h2 className="font-display font-bold text-navy mb-4">{t('settings.displayPrefs')}</h2>

          {prefsMessage && (
            <div className={`px-4 py-3 rounded-xl mb-4 text-sm font-medium border-2 ${prefsOk
              ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
              : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>{t(prefsMessage)}</div>
          )}

          <label className="block text-sm font-bold text-navy mb-1.5">{t('settings.timezoneLabel')}</label>
          <select value={prefs.timezone} className={field}
            onChange={e => setPrefs(p => ({ ...p, timezone: e.target.value, timezone_source: 'manual' }))}>
            {prefs.timezone && !TIMEZONES.includes(prefs.timezone) && (
              <option value={prefs.timezone}>{prefs.timezone}</option>
            )}
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>

          {prefs.timezone_source === 'manual' ? (
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-navy/50 text-xs">{t('settings.timezoneManualNote')}</p>
              <button type="button"
                onClick={() => setPrefs(p => ({ ...p, timezone: detectTimezone() || p.timezone, timezone_source: 'auto' }))}
                className="text-brand-red text-xs font-bold hover:underline whitespace-nowrap">
                {t('settings.timezoneReset')}
              </button>
            </div>
          ) : (
            <p className="text-navy/50 text-xs mt-2">{t('settings.timezoneAutoNote')}</p>
          )}

          <label className="block text-sm font-bold text-navy mb-1.5 mt-5">{t('settings.timeFormatLabel')}</label>
          <select value={prefs.time_format} className={field}
            onChange={e => setPrefs(p => ({ ...p, time_format: e.target.value }))}>
            <option value="">{t('settings.timeFormatAuto')}</option>
            <option value="12h">{t('settings.timeFormat12h')}</option>
            <option value="24h">{t('settings.timeFormat24h')}</option>
          </select>

          <label className="flex items-center gap-2.5 mt-5 cursor-pointer select-none">
            <input type="checkbox" checked={prefs.low_credit_nudge}
              onChange={e => setPrefs(p => ({ ...p, low_credit_nudge: e.target.checked }))}
              className="w-4 h-4 accent-brand-red"/>
            <span className="text-sm font-bold text-navy">{t('settings.lowCreditNudgeLabel')}</span>
          </label>
          <p className="text-navy/50 text-xs mt-1">{t('settings.lowCreditNudgeNote')}</p>

          <button onClick={savePrefs} disabled={savingPrefs}
            className="w-full mt-5 bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
            {savingPrefs ? t('settings.saving') : t('settings.savePrefs')}
          </button>
        </div>
        )}

        {/* Password */}
        {tab === 'password' && (
        <div className={card}>
          <h2 className="font-display font-bold text-navy mb-1">{t('settings.changePassword')}</h2>
          <p className="text-navy/50 text-xs mb-4">{t('settings.changePasswordNote')}</p>

          {pwMessage && (
            <div className={`px-4 py-3 rounded-xl mb-4 text-sm font-medium border-2 ${pwOk
              ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
              : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>{t(pwMessage)}</div>
          )}

          <div className="space-y-3">
            <input type="password" value={pw.current} autoComplete="current-password" className={field}
              onChange={e => setPw(p => ({ ...p, current: e.target.value }))} placeholder={t('settings.currentPassword')}/>
            <input type="password" value={pw.next} autoComplete="new-password" className={field}
              onChange={e => setPw(p => ({ ...p, next: e.target.value }))} placeholder={t('settings.newPassword')}/>
            <input type="password" value={pw.confirm} autoComplete="new-password" className={field}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} placeholder={t('settings.confirmPassword')}/>
          </div>

          <button onClick={changePassword} disabled={changingPw}
            className="w-full mt-4 bg-navy text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-navy/90 disabled:opacity-50 transition-colors">
            {changingPw ? t('settings.changingPassword') : t('settings.changePassword')}
          </button>
        </div>
        )}

        {/* Your data */}
        {tab === 'data' && (
        <div className={card}>
          <h2 className="font-display font-bold text-navy mb-1">{t('settings.yourData')}</h2>
          <p className="text-navy/50 text-xs mb-4">{t('settings.exportNote')}</p>
          <button onClick={exportData} disabled={exporting}
            className="w-full bg-white text-navy py-3 rounded-full font-bold border-2 border-navy hover:bg-cream disabled:opacity-50 transition-colors">
            {exporting ? t('settings.exporting') : t('settings.exportData')}
          </button>
        </div>
        )}

        {/* Danger zone */}
        {tab === 'danger' && (
        <div className="bg-white rounded-2xl p-6 border-2 border-brand-red">
          <h2 className="font-display font-bold text-brand-red mb-1">{t('settings.deleteAccount')}</h2>
          <p className="text-navy/60 text-xs mb-4 whitespace-pre-line">{t('settings.deleteExplain')}</p>

          {delMessage && (
            <div className="bg-brand-red/10 text-brand-red border-2 border-brand-red/30 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
              {t(delMessage)}
            </div>
          )}

          <div className="space-y-3">
            <input type="password" value={del.password} autoComplete="current-password" className={field}
              onChange={e => setDel(d => ({ ...d, password: e.target.value }))}
              placeholder={t('settings.deletePasswordPlaceholder')}/>
            <input type="text" value={del.confirm} className={field}
              onChange={e => setDel(d => ({ ...d, confirm: e.target.value }))}
              placeholder={t('settings.deleteConfirmPlaceholder')}/>
          </div>

          <button onClick={deleteAccount} disabled={deleting || del.confirm !== 'DELETE'}
            className="w-full mt-4 bg-brand-red text-white py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-40 transition-colors">
            {deleting ? t('settings.deleting') : t('settings.deleteAccount')}
          </button>
        </div>
        )}
      </div>
    </main>
  )
}
