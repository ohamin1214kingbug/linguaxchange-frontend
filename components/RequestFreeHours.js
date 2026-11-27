'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { getLocale } from '../lib/i18n/locale'
import { detectTimezone, formatInTimezone } from '../lib/timezone'
import FreeHoursGrid from './FreeHoursGrid'

// The free-hours panel on one request card (owner, 2026-11-27). Students
// mark their own hours; teachers of the language (sees_names from the
// backend) see the colour map instead and open a class at the best hour.
export default function RequestFreeHours({ req, currentUser, teachHref }) {
  const { t } = useLanguage()
  const [data, setData] = useState(null)
  const [mine, setMine] = useState(new Set())
  const [picked, setPicked] = useState(null)
  const [state, setState] = useState('')
  const tz = currentUser?.timezone || detectTimezone() || 'UTC'
  const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })

  useEffect(() => {
    fetch(`/api/class-requests/${req.id}/availability`, { headers: auth() })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setData(d); setMine(new Set(d.mine)) } })
      .catch(() => {})
  }, [req.id])

  if (!data) return <p className="text-navy/65 text-sm">…</p>

  const save = async () => {
    setState('saving')
    const res = await fetch(`/api/class-requests/${req.id}/availability`, { method: 'PUT', headers: auth(), body: JSON.stringify({ slots: [...mine] }) }).catch(() => null)
    setState(res?.ok ? 'saved' : 'failed')
  }

  if (data.sees_names) {
    const cell = data.cells.find(c => c.slot === picked)
    return (
      <div>
        <p className="text-navy/65 text-sm mb-2">{data.people ? t('requests.freeHeatHelp', { n: data.people, tz }) : t('requests.freeNone')}</p>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <FreeHoursGrid tz={tz} locale={getLocale()} mode="heat" cells={data.cells} picked={picked} onPick={setPicked} />
          </div>
          {cell && (
            <div className="md:w-56 shrink-0 self-start bg-white border-2 border-navy rounded-2xl shadow-[3px_3px_0_var(--color-navy)] p-4">
              <p className="font-display font-extrabold text-navy text-lg">{formatInTimezone(cell.slot, tz, currentUser?.time_format)}</p>
              <p className="font-bold text-navy text-sm">{t('requests.freePick', { n: cell.count, total: data.people })}</p>
              {cell.names?.length > 0 && <p className="text-navy/65 text-sm mt-1">{cell.names.join(', ')}</p>}
              <a href={teachHref(req, cell.slot)} className="block text-center mt-3 bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy">{t('requests.freeOpen')}</a>
              <p className="text-navy/65 text-xs mt-2">{t('requests.freeOpenNote')}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="font-display font-extrabold text-navy">{t('requests.freeTitle')}</p>
      <p className="text-navy/65 text-sm mb-2">{t('requests.freeHelp', { tz })}</p>
      <FreeHoursGrid tz={tz} locale={getLocale()} value={mine} onChange={v => { setMine(v); setState('') }} />
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button type="button" onClick={save} disabled={state === 'saving'}
          className="bg-brand-red text-white px-5 py-2 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-50">{t('requests.freeSave')}</button>
        <span className="text-sm font-bold text-navy">
          {state === 'saved' ? `✅ ${t('requests.freeSaved')}` : state === 'failed' ? t('common.connectionError') : t('requests.freeMarked', { n: mine.size })}
        </span>
      </div>
      {data.people > 0 && <p className="text-navy/65 text-xs mt-2">{t('requests.freeOthers', { n: data.people })}</p>}
    </div>
  )
}
