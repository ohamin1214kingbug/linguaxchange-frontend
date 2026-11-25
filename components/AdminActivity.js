'use client'
import { useState, useEffect } from 'react'
import { getLocale } from '../lib/i18n/locale'

// The admin Activity tab (GET /api/admin/actions): every admin action that
// changed something or opened a private file. Read-only: the log can't be
// edited or deleted from the site. English only, like the admin page.
const LABELS = {
  approve_member: ['approved member', 'bg-brand-green/40'],
  reject_member: ['rejected member', 'bg-brand-red/15'],
  approve_class: ['approved class', 'bg-brand-green/40'],
  reject_class: ['rejected class', 'bg-brand-red/15'],
  give_bananas: ['gave bananas', 'bg-brand-yellow/40'],
  suspend: ['suspended', 'bg-brand-red/20'],
  unsuspend: ['lifted suspension', 'bg-brand-green/40'],
  delete_member: ['deleted member', 'bg-brand-red/30'],
  lift_no_show: ['lifted no-show limits', 'bg-brand-green/40'],
  remove_certificate: ['removed certificate', 'bg-purple-200'],
  open_certificate: ['opened certificate', 'bg-purple-200'],
  open_evidence: ['opened report evidence', 'bg-purple-200'],
  update_report: ['updated report', 'bg-brand-blue/20'],
}
const GROUPS = [['', 'All'], ['bananas', 'Bananas'], ['safety', 'Suspensions & deletions'], ['private', 'Private files opened']]

function details(a) {
  const d = a.detail || {}
  if (a.action === 'give_bananas') return `+${d.amount}`
  if (a.action === 'suspend') return [d.until && `until ${new Date(d.until).toLocaleDateString(getLocale())}`, d.reason && `"${d.reason}"`].filter(Boolean).join(' · ')
  if (a.action === 'update_report' && d.status) return `status: ${d.status}`
  if (a.action === 'open_evidence') return `file ${Number(d.file) + 1}`
  return ''
}

export default function AdminActivity() {
  const [group, setGroup] = useState('')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/actions${group ? `?group=${group}` : ''}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setRows(d); setError('') })
      .catch(e => setError(e.message || 'Could not load the activity log'))
  }, [group])

  return (
    <section className="bg-white rounded-2xl border-2 border-navy p-5 overflow-x-auto">
      <div className="flex flex-wrap gap-2 mb-4">
        {GROUPS.map(([key, label]) => (
          <button key={key} onClick={() => { setRows(null); setGroup(key) }}
            className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${group === key ? 'border-navy bg-brand-yellow/20' : 'border-navy/20 bg-white'} text-navy`}>{label}</button>
        ))}
      </div>
      {error && <p className="text-brand-red font-bold text-sm">{error}</p>}
      {!rows && !error && <p className="text-navy/65 text-sm">Loading...</p>}
      {rows?.length === 0 && <p className="text-navy/65 text-sm">Nothing logged yet.</p>}
      {rows?.length > 0 && (
        <table className="w-full text-sm text-navy">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-navy/55">
            <th className="py-1.5 pr-3">When</th><th className="py-1.5 pr-3">Admin</th><th className="py-1.5 pr-3">Action</th><th className="py-1.5 pr-3">Member / item</th><th className="py-1.5">Details</th>
          </tr></thead>
          <tbody>
            {rows.map(a => {
              const [label, tone] = LABELS[a.action] || [a.action, 'bg-cream']
              const target = a.target_type === 'user' ? `#${a.target_id} ${a.target_name}` : a.target_type ? `${a.target_type[0].toUpperCase()}${a.target_type.slice(1)} #${a.target_id}` : ''
              return (
                <tr key={a.id} className="border-t border-navy/10 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{new Date(a.created_at).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="py-2 pr-3">{a.admin_name || '—'}</td>
                  <td className="py-2 pr-3"><span className={`inline-block border border-navy rounded-full px-2 text-[11px] font-bold whitespace-nowrap ${tone}`}>{label}</span></td>
                  <td className="py-2 pr-3">{target}</td>
                  <td className="py-2 text-navy/75">{details(a)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}
