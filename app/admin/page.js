'use client'
import AdminGrowth from '../../components/AdminGrowth'
import AdminActivity from '../../components/AdminActivity'
import AdminAttention from '../../components/AdminAttention'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { languageOptions, LEVELS, levelLabel } from '../../lib/languages'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { userCode } from '../../lib/userCode'
import { nextSessionDate, lastSessionDate } from '../../lib/classSchedule'
import { regionOf } from '../../lib/countries'
import { REGIONS } from '../../lib/regions'
import { getLocale } from '../../lib/i18n/locale'
import Tabs from '../../components/Tabs'

const DAY_MS = 24 * 60 * 60 * 1000
const startsWithinDays = (date, days) => date - new Date() < days * DAY_MS
const isSuspended = user => Boolean(user.suspended_until) && new Date(user.suspended_until) > new Date()
const FILTER = 'border-2 border-navy/20 rounded-full px-3 py-2 text-sm bg-white focus:border-brand-red focus:outline-none transition-colors'

// A user's DB id is already permanent and unique — no new column needed,
// just a friendlier alphabet-led format for admins to reference in reports.

// The class title, who teaches it, and who signed up — the three things an
// admin needs to judge a class.
//
// The class description is deliberately not shown. It is written to sell the
// class to a student, it runs to several lines, and it pushed the people out
// of view on a screen whose whole job is deciding about people. It is still
// on the public class page, where it belongs.
function ClassPeople({ cls, students, language }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-navy">{cls.title}</p>
      <p className="text-navy/65 text-sm">
        {language ? `${language} ` : ''}{cls.level} · {cls.duration_minutes} min ·{' '}
        {nextSessionDate(cls)
          ? nextSessionDate(cls).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' })
          : lastSessionDate(cls)
            ? `ended ${lastSessionDate(cls).toLocaleDateString(getLocale(), { dateStyle: 'medium' })}`
            : 'no session scheduled'}
      </p>
      <p className="text-navy/70 text-sm mt-2">
        <span className="text-navy/65">Teacher</span>{' '}
        {cls.teacher ? `${cls.teacher.first_name} ${cls.teacher.last_name}` : 'Unknown'}{' '}
        <span className="font-mono text-navy/65 text-xs">{userCode(cls.teacher_id)}</span>
      </p>
      <p className="text-navy/70 text-sm">
        <span className="text-navy/65">Students</span>{' '}
        {students.length === 0
          ? <span className="text-navy/65">nobody yet</span>
          : students.map(s => `${s.first_name} ${s.last_name}`).join(', ')}
        {' '}<span className="text-navy/65">({students.length}/{cls.max_students})</span>
      </p>
    </div>
  )
}

// Shared by both the pending and approved user cards below, so the same
// widget doesn't get written out twice.
function CreditControl({ amount, message, onAmountChange, onSubmit }) {
  return (
    <div className="mt-3 border-t border-navy/10 pt-3">
      <p className="font-display font-bold text-navy text-xs mb-1.5">💰 Add token</p>
      <div className="flex items-center gap-2">
        <input type="number" min="1" value={amount} onChange={onAmountChange}
          placeholder="Amount" onKeyDown={e => e.key === 'Enter' && onSubmit()}
          className="w-24 border-2 border-navy/20 rounded-full px-3 py-1.5 text-sm focus:border-brand-red focus:outline-none transition-colors"/>
        <button onClick={onSubmit}
          className="bg-brand-yellow/20 text-navy px-4 py-1.5 rounded-full text-sm font-bold border-2 border-navy/20 hover:border-navy transition-colors">
          Add
        </button>
        {message && <span className="text-navy/65 text-xs">{message}</span>}
      </div>
    </div>
  )
}

// Everything GET /api/admin/users already returns and the card was throwing
// away. No new endpoint — the fields were fetched, parsed and then ignored.
//
// Behind a toggle rather than always open: the list is a scan-for-one-person
// view first, and a dozen fields per card would bury the names.
function UserDetail({ user, t, onChanged }) {
  const langName = code => {
    const match = languageOptions(t).find(l => l.code === code)
    return match ? `${match.flag} ${match.name}` : code
  }

  const learning = Array.isArray(user.learn_languages)
    ? user.learn_languages
    : String(user.learn_languages || '').split(',').map(l => l.trim()).filter(Boolean)

  const rows = [
    ['Suspended', user.suspended_until && new Date(user.suspended_until) > new Date()
      ? `until ${new Date(user.suspended_until).toLocaleDateString(getLocale())} — ${user.suspension_reason || 'no reason recorded'}`
      : null],
    ['Teaches', user.teach_language
      ? `${langName(user.teach_language)}${user.teach_level ? ` · ${levelLabel(user.teach_language, user.teach_level, t)}` : ''}`
      : null],
    ['Learning', learning.length
      ? learning.map(code => {
          const detail = user.learn_details?.[code]
          const extra = [detail?.level, detail?.note && `“${detail.note}”`].filter(Boolean).join(' ')
          return extra ? `${langName(code)} (${extra})` : langName(code)
        }).join(', ')
      : null],
    ['Certificate', user.has_certificate ? user.certificate_explanation || 'Claimed, no explanation given' : 'Not claimed'],
    ['Phone', user.phone_number
      ? `${user.phone_number} ${user.phone_verified ? '✅ verified' : '⚠️ unverified'}`
      : 'None'],
    ['Sign-in', user.google_id ? 'Google' : 'Email and password'],
    ['Timezone', user.timezone],
    ['Streak', `${user.current_streak || 0} now · ${user.longest_streak || 0} best`],
    ['Joined', user.created_at ? new Date(user.created_at).toLocaleString(getLocale()) : null],
    ['Approval note', user.approval_reason],
    ['No-show limits', [
      user.teaching_paused_until && new Date(user.teaching_paused_until) > new Date() && `new classes paused until ${new Date(user.teaching_paused_until).toLocaleDateString(getLocale())}`,
      user.booking_limited_until && new Date(user.booking_limited_until) > new Date() && `one booking at a time until ${new Date(user.booking_limited_until).toLocaleDateString(getLocale())}`,
    ].filter(Boolean).join('; ') || null],
  ].filter(([, value]) => value)

  // The file is in a private bucket: the backend hands back a 10-minute link.
  const openCertificate = async () => {
    const res = await fetch(`/api/admin/users/${user.id}/certificate`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    const data = await res.json().catch(() => ({}))
    if (res.ok) window.open(data.url, '_blank', 'noopener')
    else window.alert(data.error || 'Could not open the certificate')
  }
  // After a no-show dispute the admin agrees with. Refunds already made stay.
  const liftNoShow = async () => {
    if (!window.confirm(`Lift ${user.first_name}'s no-show limits and undo their strikes?`)) return
    const res = await fetch(`/api/admin/users/${user.id}/lift-no-show`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    if (!res.ok) window.alert('Could not lift the limits')
    onChanged?.()
  }
  const removeCertificate = async () => {
    if (!window.confirm(`Remove ${user.first_name}'s certificate? They can upload another.`)) return
    const res = await fetch(`/api/admin/users/${user.id}/certificate`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    if (!res.ok) window.alert('Could not remove the certificate')
    onChanged?.()
  }

  return (
    <div className="mt-3 border-t border-navy/10 pt-3 space-y-2">
      {user.bio
        ? <p className="text-navy/70 text-sm italic">“{user.bio}”</p>
        : <p className="text-navy/65 text-sm italic">No bio yet</p>}
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-navy/65 font-bold text-xs uppercase tracking-wide pt-0.5">{label}</dt>
            <dd className="text-navy/80">{value}</dd>
          </div>
        ))}
      </dl>
      {((user.teaching_paused_until && new Date(user.teaching_paused_until) > new Date()) || (user.booking_limited_until && new Date(user.booking_limited_until) > new Date())) && (
        <button type="button" onClick={liftNoShow} className="text-navy font-bold text-xs underline">Lift no-show limits and undo strikes</button>
      )}
      {user.certificate_uploaded_at && (
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <span className="text-navy/80">📄 {user.certificate_name || 'Certificate'} · {new Date(user.certificate_uploaded_at).toLocaleDateString(getLocale())}</span>
          <button type="button" onClick={openCertificate} className="text-navy font-bold text-xs underline">View</button>
          <button type="button" onClick={removeCertificate} className="text-brand-red font-bold text-xs underline">Remove</button>
        </div>
      )}
    </div>
  )
}

const CATEGORY_LABELS = {
  harassment: '🚨 Harassment',
  inappropriate_content: '⚠️ Inappropriate content',
  spam_or_scam: '💸 Spam or scam',
  no_show: '🕒 No-show',
  other: '❓ Other'
}

// Suspend is reversible and Delete is not, so they do not look alike and
// Delete does not fire on one click — it needs the user's own code typed in.
// The date a suspension of `days` would end. Outside components: reads the clock.
function daysFromNow(days, now = Date.now()) {
  return new Date(now + days * 24 * 60 * 60 * 1000)
}

function EnforcementControl({ user, confirmText, message, onConfirmChange, onSuspend, onUnsuspend, onDelete, defaultReason = '' }) {
  const code = 'U' + String(user.id).padStart(6, '0')
  // A duration button only opens the confirm box: one mis-click suspended
  // the owner's own account for 30 days (2026-11-17).
  const [pendingDays, setPendingDays] = useState(null)
  const [reason, setReason] = useState(defaultReason)
  const suspendedUntil = user.suspended_until && new Date(user.suspended_until) > new Date()
    ? new Date(user.suspended_until)
    : null

  return (
    <div className="mt-3 border-t border-navy/10 pt-3">
      {suspendedUntil ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-full text-xs font-bold border-2 border-brand-red/30">
            Suspended until {suspendedUntil.toLocaleDateString(getLocale())}
          </span>
          {user.suspension_reason && <span className="text-navy/60 text-xs">{user.suspension_reason}</span>}
          <button onClick={() => { if (window.confirm(`Cancel ${user.first_name || 'this member'}'s suspension now?`)) onUnsuspend() }}
            className="ml-auto bg-brand-teal text-white px-3 py-1.5 rounded-full text-xs font-bold border-2 border-navy hover:opacity-90">
            ↩ Cancel suspension
          </button>
        </div>
      ) : (<>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-navy text-xs">🚫 Suspend</span>
          {[7, 30, 3650].map(days => (
            <button key={days} onClick={() => setPendingDays(pendingDays === days ? null : days)} aria-pressed={pendingDays === days}
              className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition-colors ${pendingDays === days ? 'bg-brand-yellow/30 border-navy text-navy' : 'bg-white text-navy border-navy/20 hover:border-navy'}`}>
              {days === 3650 ? 'Permanent' : `${days} days`}
            </button>
          ))}
        </div>
        {pendingDays && (
          <div className="mt-2 border-2 border-brand-red rounded-xl bg-brand-red/5 p-3">
            <p className="font-bold text-navy text-sm">
              Suspend {user.first_name || 'this member'} {pendingDays >= 3650 ? 'permanently' : `for ${pendingDays} days, until ${daysFromNow(pendingDays).toLocaleDateString(getLocale())}`}?
            </p>
            <p className="text-navy/65 text-xs mt-0.5">Their upcoming classes are cancelled, their students refunded, and they get an email with the reason.</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} aria-label="Reason"
              className="w-full mt-2 border-2 border-navy/20 rounded-lg px-3 py-2 text-sm bg-white focus:border-brand-red focus:outline-none"/>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { onSuspend(pendingDays, reason.trim()); setPendingDays(null) }} disabled={!reason.trim()}
                className="bg-brand-red text-white px-3 py-1.5 rounded-full text-xs font-bold border-2 border-navy disabled:opacity-40">
                Confirm suspension
              </button>
              <button onClick={() => setPendingDays(null)} className="bg-white text-navy px-3 py-1.5 rounded-full text-xs font-bold border-2 border-navy">Cancel</button>
            </div>
          </div>
        )}
      </>)}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="font-display font-bold text-brand-red text-xs">🗑 Delete</span>
        <input value={confirmText || ''} onChange={onConfirmChange} placeholder={`Type ${code}`}
          className="w-32 border-2 border-navy/20 rounded-full px-3 py-1 text-xs font-mono focus:border-brand-red focus:outline-none"/>
        <button onClick={onDelete} disabled={confirmText !== code}
          className="bg-brand-red text-white px-3 py-1 rounded-full text-xs font-bold border-2 border-navy disabled:opacity-30 disabled:cursor-not-allowed">
          Delete permanently
        </button>
      </div>
      {message && <p className="text-navy/65 text-xs mt-2">{message}</p>}
    </div>
  )
}

export default function Admin() {
  const router = useRouter()
  const [tab, setTab] = useState('users')
  const [openUser, setOpenUser] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState({})
  const [actionMessage, setActionMessage] = useState({})
  const [userSearch, setUserSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [creditSearch, setCreditSearch] = useState('')
  const [creditAmounts, setCreditAmounts] = useState({})
  const [creditMessages, setCreditMessages] = useState({})
  const [users, setUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()
  const [resources, setResources] = useState([])
  const [resourceForm, setResourceForm] = useState({
    language_code: 'ES', level: 'A1', title: '', description: '', source_url: '', attribution: '',
  })
  const [resourceMessage, setResourceMessage] = useState('')
  const [uploadingId, setUploadingId] = useState(null)

  const API = ''

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/auth/login'); return }
    fetchUsers()
    fetchClasses()
    fetchReports()
    fetchResources()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setClasses(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setReports(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/resources/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setResources(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  // Not every failure arrives as JSON. An oversized body is rejected by
  // body-parser before the route runs, and a proxy error page is HTML — in
  // both cases res.json() throws and the real reason is lost, leaving a bare
  // "failed" with no clue. Fall back to the status code so the message at
  // least says something true.
  const readError = async (res, fallback) => {
    const data = await res.json().catch(() => ({}))
    return data.error || `${fallback} (HTTP ${res.status})`
  }

  // The form is the only editor, and it posts every field. Without a way to
  // load a row into it, correcting one word meant retyping the rest or
  // silently blanking it — validateResource turns '' into null and the upsert
  // writes that over what was there.
  const editResource = (r) => {
    setResourceForm({
      language_code: r.language_code,
      level: r.level,
      title: r.title || '',
      description: r.description || '',
      source_url: r.source_url || '',
      attribution: r.attribution || '',
    })
    setResourceMessage(`Editing ${r.language_code} ${r.level} — saving overwrites it.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveResource = async () => {
    setResourceMessage('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/resources`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceForm),
      })
      if (!res.ok) { setResourceMessage(await readError(res, 'Could not save')); return }
      setResourceMessage('Saved. Now upload the PDF below.')
      fetchResources()
    } catch (e) { setResourceMessage('Could not save') }
  }

  // Base64 in a JSON body, matching how class materials are uploaded, so the
  // browser never needs the Supabase anon key.
  const uploadResourcePdf = async (id, file) => {
    setResourceMessage('')
    setUploadingId(id)
    const reader = new FileReader()
    // Without this, an unreadable file leaves the message box empty forever —
    // indistinguishable from nothing having happened.
    reader.onerror = () => {
      setUploadingId(null)
      setResourceMessage('Could not read that file')
    }
    reader.onload = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API}/api/resources/${id}/pdf`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf: reader.result }),
        })
        if (!res.ok) { setResourceMessage(await readError(res, 'Upload failed')); return }
        setResourceMessage('PDF uploaded.')
        fetchResources()
      } catch (e) {
        setResourceMessage('Upload failed')
      } finally {
        setUploadingId(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const deleteResource = async (id) => {
    if (!window.confirm('Delete this resource and its PDF?')) return
    setResourceMessage('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/resources/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      // Refreshing after a failed delete makes the row reappear with no
      // explanation, which reads as the button being broken.
      if (!res.ok) { setResourceMessage(await readError(res, 'Could not delete')); return }
      fetchResources()
    } catch (e) { setResourceMessage('Could not delete') }
  }

  const suspendUser = async (userId, days, reason) => {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(`${API}/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ until, reason })
    })
    const data = await res.json().catch(() => ({}))
    setActionMessage(m => ({ ...m, [userId]: res.ok
      ? `Suspended until ${new Date(data.suspended_until).toLocaleDateString(getLocale())}`
      : data.error || 'Could not suspend' }))
    fetchUsers(); fetchReports()
  }

  const unsuspendUser = async userId => {
    const res = await fetch(`${API}/api/admin/users/${userId}/unsuspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    setActionMessage(m => ({ ...m, [userId]: res.ok ? 'Suspension lifted' : 'Could not lift it' }))
    fetchUsers(); fetchReports()
  }

  const deleteUser = async userId => {
    const res = await fetch(`${API}/api/admin/users/${userId}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ confirm: confirmDelete[userId] || '' })
    })
    const data = await res.json().catch(() => ({}))
    setActionMessage(m => ({ ...m, [userId]: res.ok ? 'Account deleted' : data.error || 'Could not delete' }))
    if (res.ok) setConfirmDelete(c => ({ ...c, [userId]: '' }))
    fetchUsers(); fetchReports()
  }

  // The bucket is private, so the image has no URL until the server signs
  // one. Opened on click rather than rendered inline: an <img> per report
  // would sign every piece of evidence in the queue just to draw the page.
  //
  // Shown inside the report card, not in a new tab: Safari blocks a tab
  // opened after waiting for the server (it has to happen during the click),
  // so the old window.open silently did nothing there.
  const [evidence, setEvidence] = useState({})
  const openEvidence = async (reportId, index) => {
    const key = `${reportId}-${index}`
    if (evidence[key]) { setEvidence(e => ({ ...e, [key]: null })); return }
    setEvidence(e => ({ ...e, [key]: { loading: true } }))
    const res = await fetch(`${API}/api/reports/${reportId}/evidence/${index}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json().catch(() => ({}))
    setEvidence(e => ({ ...e, [key]: data.url ? { url: data.url } : { error: data.error || 'Could not open the file' } }))
  }

  // Closing a report asks why first (the server requires it): { id, status, text }.
  const [closing, setClosing] = useState(null)
  const setReportStatus = async (id, status, notes) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/api/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, notes })
    })
    if (res.ok) setClosing(null)
    else {
      const data = await res.json().catch(() => ({}))
      window.alert(data.error || 'Could not update the report')
    }
    fetchReports()
  }

  const addCredit = async (id) => {
    const amount = parseInt(creditAmounts[id])
    if (!Number.isInteger(amount) || amount <= 0) {
      setCreditMessages(m => ({ ...m, [id]: 'Enter a positive whole number' }))
      return
    }
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/api/admin/users/${id}/credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount })
    })
    const data = await res.json()
    setCreditMessages(m => ({ ...m, [id]: res.ok ? `Balance now ${data.balance}` : (data.error || 'Could not add credit') }))
    if (res.ok) setCreditAmounts(a => ({ ...a, [id]: '' }))
  }

  // No approval step since 2026-11-19: classes go live when posted, and the
  // admin hides one that isn't OK (rejected = off Explore; students already
  // booked keep their place) or shows it again. Cancel is the stronger step:
  // it refunds and emails everyone booked.
  const setClassHidden = async (cls, hidden) => {
    if (hidden && !window.confirm(`Hide '${cls.title}' from Explore? Booked students keep their place; use Cancel to refund them.`)) return
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/api/classes/${cls.id}/${hidden ? 'reject' : 'approve'}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      window.alert(d.error || 'Could not change the class')
    }
    fetchClasses()
  }

  // Cancelling refunds every enrolled student and emails them, so it asks
  // first and says what went wrong instead of failing in silence.
  const cancelClass = async (cls) => {
    if (!window.confirm(`Cancel '${cls.title}'? Enrolled students are refunded and emailed.`)) return
    const token = localStorage.getItem('token')
    const res = await fetch(`${API}/api/classes/${cls.id}/cancel`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) window.alert(await readError(res, 'Could not cancel the class'))
    fetchClasses()
  }

  const matchesSearch = (u, query) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [userCode(u.id), u.first_name, u.last_name, u.email].some(v => v?.toLowerCase().includes(q))
  }
  const matchesUserSearch = u => matchesSearch(u, userSearch)

  // A deleted account is anonymized, not removed — the row has to survive
  // because other members' bookings and the credit ledger reference it. Part
  // of that scrubbing sets is_approved false, and this screen bucketed purely
  // on that flag, so every deleted account landed in "Waiting for approval"
  // permanently, showing Approve, Reject and Add-token controls. Approving one
  // would have flipped a scrubbed row back into the approved list.
  //
  // Every other route already filters on deleted_at — public search, public
  // profiles, login, the report pickers. This list was the one that did not.
  const liveUsers = users.filter(u => !u.deleted_at)
  const statusOf = u => isSuspended(u) ? 'suspended' : 'active'
  const shownUsers = liveUsers.filter(u => matchesUserSearch(u)
    && (!regionFilter || regionOf(u.nationality) === regionFilter)
    && (!languageFilter || u.teach_language === languageFilter)
    && (!statusFilter || statusOf(u) === statusFilter))
  // Members under a heading per region, in REGIONS order; empty regions are
  // dropped. (There is no approval queue since 2026-11-19.)
  const membersByRegion = REGIONS
    .map(region => [region, shownUsers.filter(u => regionOf(u.nationality) === region)])
    .filter(([, group]) => group.length > 0)
  const creditSearchResults = liveUsers.filter(u => matchesSearch(u, creditSearch))

  // A class is one of three things to an admin. Live: students can still
  // join it. Hidden: the admin took it off Explore. Finished: its last
  // session is over; the backend closes those by itself
  // (utils/classCompletion.js).
  const liveClasses = classes
    .filter(c => c.status === 'approved' && nextSessionDate(c))
    .sort((a, b) => nextSessionDate(a) - nextSessionDate(b))
  const hiddenClasses = classes.filter(c => (c.status === 'rejected' || c.status === 'pending') && nextSessionDate(c))
  const finishedClasses = classes
    .filter(c => c.status === 'completed' || (c.status === 'approved' && !nextSessionDate(c)))
  const classesThisWeek = liveClasses.filter(c => startsWithinDays(nextSessionDate(c), 7)).length

  const languageLabel = code => {
    const match = languageOptions(t).find(l => l.code === code)
    return match ? `${match.flag} ${match.name}` : code
  }

  // Enrollments hang off sessions, and a class with several sessions repeats
  // the same student, so dedupe by id. Cancelled enrollments are refunded
  // and no longer attending — listing them would overstate the class.
  const studentsOf = cls => {
    const byId = new Map()
    for (const session of cls.class_sessions || []) {
      for (const e of session.class_enrollments || []) {
        if (e.student && e.status !== 'cancelled') byId.set(e.student.id, e.student)
      }
    }
    return [...byId.values()]
  }
  const renderUser = user => {
    const theirClasses = classes.filter(c => c.teacher_id === user.id && c.status !== 'cancelled' && c.status !== 'rejected')
    const facts = [
      user.nationality,
      user.teach_language && `teaches ${languageLabel(user.teach_language)}`,
      `${theirClasses.length} class${theirClasses.length === 1 ? '' : 'es'}`,
      `joined ${new Date(user.created_at).toLocaleDateString(getLocale())}`,
    ].filter(Boolean)
    return (
      <div key={user.id} className="bg-white rounded-2xl p-5 border-2 border-navy/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-display font-bold border-2 border-navy bg-brand-teal text-navy`}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-navy">{user.first_name} {user.last_name}
                {user.phone_verified === false && <span title="Signed up with Google but never verified a phone, so they can't take part yet" className="ml-2 align-middle text-[11px] font-bold border-2 border-brand-red/40 text-brand-red rounded-full px-2 py-0.5">📱 not verified</span>}
              </p>
              <p className="text-navy/65 text-sm break-all">{user.email} · <span className="font-mono font-bold">{userCode(user.id)}</span></p>
              <p className="text-navy/65 text-xs">{facts.join(' · ')}</p>
            </div>
          </div>
          {isSuspended(user) && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-full text-xs font-bold border-2 border-brand-red/30">Suspended until {new Date(user.suspended_until).toLocaleDateString(getLocale())}</span>
              <button onClick={() => { if (window.confirm(`Cancel ${user.first_name || 'this member'}'s suspension now?`)) unsuspendUser(user.id) }}
                className="bg-brand-teal text-white px-3 py-1 rounded-full text-xs font-bold border-2 border-navy hover:opacity-90">
                ↩ Cancel suspension
              </button>
            </div>
          )}
        </div>
        <button onClick={() => setOpenUser(openUser === user.id ? null : user.id)}
          className="mt-3 text-navy/65 hover:text-navy text-xs font-bold transition-colors">
          {openUser === user.id ? '▾ Hide details' : '▸ Details'}
        </button>
        {openUser === user.id && <UserDetail user={user} t={t} onChanged={fetchUsers} />}
        <CreditControl amount={creditAmounts[user.id] || ''} message={creditMessages[user.id]}
          onAmountChange={e => setCreditAmounts(a => ({ ...a, [user.id]: e.target.value }))}
          onSubmit={() => addCredit(user.id)}/>
      </div>
    )
  }

  const pendingReports = reports.filter(r => r.status === 'pending')
  const handledReports = reports.filter(r => r.status !== 'pending')

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Gongbu<span className="text-brand-red">Leng</span></a>
        <span className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-full text-sm font-bold border-2 border-brand-red/30">⚙️ Admin Panel</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">Admin Dashboard</h1>
        <p className="text-navy/65 mb-8">Manage users and classes</p>

        <AdminAttention />

        {/* What needs a decision comes first and lights up; the plain cards
            are reference. Each one opens the tab it counts. */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { count: pendingReports.length, label: 'Open reports', tab: 'reports', alert: 'bg-brand-red text-white' },
            { count: classesThisWeek, label: 'Classes this week', tab: 'classes' },
            { count: liveUsers.length, label: 'Members', tab: 'users' },
          ].map(card => (
            <button key={card.label} onClick={() => setTab(card.tab)}
              className={`rounded-2xl p-4 border-2 border-navy text-center transition-transform hover:-translate-y-0.5 ${card.alert && card.count > 0 ? `${card.alert} shadow-[4px_4px_0_var(--color-navy)]` : 'bg-white text-navy'}`}>
              <p className="font-display font-extrabold text-3xl">{card.count}</p>
              <p className="text-sm font-medium">{card.label}</p>
            </button>
          ))}
        </div>

        <Tabs active={tab} onChange={setTab} tone="red" tabs={[
          { key: 'users', label: '👥 Members' },
          { key: 'classes', label: '📚 Classes' },
          { key: 'reports', label: '🚩 Reports' },
          { key: 'credits', label: '💰 Credits' },
          { key: 'resources', label: '📄 Resources' },
          { key: 'growth', label: '📈 Growth' },
          { key: 'activity', label: '🧾 Activity' },
        ]} />

        {tab === 'growth' && <AdminGrowth />}
        {tab === 'activity' && <AdminActivity />}

        {loading && <p className="text-navy/65">Loading...</p>}

        {tab === 'users' && !loading && (
          <>
          <div className="flex flex-wrap gap-2 mb-4">
            <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
              placeholder="Find a member by code, name, or email..." aria-label="Search members"
              className={`${FILTER} flex-1 min-w-48 px-4`}/>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} aria-label="Region" className={FILTER}>
              <option value="">All regions</option>
              {REGIONS.map(region => (
                <option key={region} value={region}>{region} ({liveUsers.filter(u => regionOf(u.nationality) === region).length})</option>
              ))}
            </select>
            <select value={languageFilter} onChange={e => setLanguageFilter(e.target.value)} aria-label="Language taught" className={FILTER}>
              <option value="">Teaches any language</option>
              {languageOptions(t).map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Status" className={FILTER}>
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="space-y-4">
            {membersByRegion.map(([region, group]) => (
              // <details>, not a useState toggle: the browser already has
              // this widget, keyboard and screen-reader behaviour included.
              <details key={region} open className="pt-2">
                <summary className="font-display font-bold text-navy mb-3 cursor-pointer select-none marker:text-navy/50">🌍 {region} · {group.length}</summary>
                <div className="space-y-4">{group.map(renderUser)}</div>
              </details>
            ))}
            {shownUsers.length === 0 && (
              <p className="text-navy/65 text-center py-12">{liveUsers.length === 0 ? 'No members yet' : 'No members match these filters'}</p>
            )}
          </div>
          </>
        )}

        {tab === 'classes' && !loading && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-navy">📅 Upcoming · {liveClasses.length}</h2>
            {liveClasses.length === 0 && (
              <p className="text-navy/65 text-sm">No upcoming classes. Visitors see an empty class list until a teacher posts one.</p>
            )}
            {liveClasses.map(cls => (
              <div key={cls.id} className="bg-white rounded-2xl p-4 border-2 border-brand-teal">
                <div className="flex items-start justify-between gap-3">
                  <ClassPeople cls={cls} students={studentsOf(cls)} language={languageLabel(cls.language_code)}/>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => setClassHidden(cls, true)}
                      className="bg-white text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy">
                      🙈 Hide
                    </button>
                    <button onClick={() => cancelClass(cls)}
                      className="bg-brand-red/10 text-brand-red px-4 py-2 rounded-full text-sm font-bold border-2 border-brand-red/30">
                      Cancel class
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {hiddenClasses.length > 0 && (
              <>
                <h2 className="font-display font-bold text-navy pt-4">🙈 Hidden from Explore · {hiddenClasses.length}</h2>
                <p className="text-navy/65 text-sm">Classes you hid. Booked students keep their place.</p>
                {hiddenClasses.map(cls => (
                  <div key={cls.id} className="bg-white rounded-2xl p-4 border-2 border-navy/20">
                    <div className="flex items-start justify-between gap-3">
                      <ClassPeople cls={cls} students={studentsOf(cls)} language={languageLabel(cls.language_code)}/>
                      <button onClick={() => setClassHidden(cls, false)}
                        className="bg-brand-teal text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy flex-shrink-0">
                        Show again
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {finishedClasses.length > 0 && (
              // Collapsed: finished classes are a record, not a to-do list.
              // They used to sit here open, each waiting for "Mark complete".
              <details className="pt-4">
                <summary className="font-display font-bold text-navy cursor-pointer select-none marker:text-navy/50">✅ Finished · {finishedClasses.length}</summary>
                <p className="text-navy/65 text-sm mt-1 mb-3">Classes close by themselves once their last session is over.</p>
                <div className="space-y-2">
                  {finishedClasses.map(cls => (
                    <div key={cls.id} className="bg-white rounded-2xl p-4 border-2 border-navy/10">
                      <ClassPeople cls={cls} students={studentsOf(cls)} language={languageLabel(cls.language_code)}/>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {tab === 'reports' && !loading && (
          <div className="space-y-4">
            {pendingReports.length > 0 && (
              <>
                <h2 className="font-display font-bold text-navy">⏳ Open reports</h2>
                {pendingReports.map(report => (
                  <div key={report.id} className="bg-white rounded-2xl p-5 border-2 border-brand-yellow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-navy">
                          {report.report_type === 'user'
                            ? <>👤 {report.reported_user
                                ? `${report.reported_user.first_name} ${report.reported_user.last_name}`
                                : 'Unknown user'} <span className="font-mono text-navy/65">{userCode(report.reported_id)}</span></>
                            : <>📚 Class #{report.reported_id}</>}
                        </p>
                        <p className="text-navy/65 text-xs font-bold mt-1">{CATEGORY_LABELS[report.category] || CATEGORY_LABELS.other}</p>
                        <p className="text-navy/65 text-sm mt-1">{report.reason}</p>
                        <p className="text-navy/65 text-xs mt-2">
                          Reported by {report.reporter?.first_name} {report.reporter?.last_name} <span className="font-mono">{userCode(report.reporter_id)}</span> ({report.reporter?.email}) · {new Date(report.created_at).toLocaleDateString(getLocale())}
                        </p>
                        {report.evidence_paths?.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {report.evidence_paths.map((_, i) => (
                              <button key={i} onClick={() => openEvidence(report.id, i)} aria-expanded={Boolean(evidence[`${report.id}-${i}`])}
                                className="bg-cream text-navy px-3 py-1 rounded-full text-xs font-bold border-2 border-navy/20 hover:border-navy transition-colors">
                                📎 Evidence {i + 1}{evidence[`${report.id}-${i}`] ? ' ▴' : ''}
                              </button>
                            ))}
                          </div>
                        )}
                        {(report.evidence_paths || []).map((path, i) => {
                          const shown = evidence[`${report.id}-${i}`]
                          if (!shown) return null
                          const isPdf = /\.pdf$/i.test(path)
                          return (
                            <div key={`ev-${i}`} className="mt-2 border-2 border-navy/20 rounded-xl p-2 bg-white">
                              {shown.loading && <p className="text-navy/65 text-xs">Loading…</p>}
                              {shown.error && <p className="text-brand-red text-xs font-bold">{shown.error}</p>}
                              {shown.url && (isPdf
                                ? <a href={shown.url} target="_blank" rel="noopener" className="text-navy text-sm font-bold underline">📄 Open the PDF (evidence {i + 1})</a>
                                : <a href={shown.url} target="_blank" rel="noopener" title="Open full size">
                                    <img src={shown.url} alt={`Evidence ${i + 1}`} className="max-h-96 max-w-full rounded-lg border border-navy/10"/>
                                  </a>)}
                            </div>
                          )
                        })}
                        {report.reported_user && !report.reported_user.deleted_at && (
                          <EnforcementControl
                            user={report.reported_user}
                            confirmText={confirmDelete[report.reported_user.id]}
                            message={actionMessage[report.reported_user.id]}
                            onConfirmChange={e => setConfirmDelete(c => ({ ...c, [report.reported_user.id]: e.target.value }))}
                            defaultReason={`Report #${report.id}: ${report.category || 'other'}`}
                            onSuspend={(days, reason) => suspendUser(report.reported_user.id, days, reason)}
                            onUnsuspend={() => unsuspendUser(report.reported_user.id)}
                            onDelete={() => deleteUser(report.reported_user.id)}/>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setClosing({ id: report.id, status: 'resolved', text: '' })}
                          className="bg-brand-teal text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy whitespace-nowrap">
                          ✓ Resolve
                        </button>
                        <button onClick={() => setClosing({ id: report.id, status: 'rejected', text: '' })}
                          className="bg-brand-red/10 text-brand-red px-4 py-2 rounded-full text-sm font-bold border-2 border-brand-red/30 whitespace-nowrap">
                          ✗ Dismiss
                        </button>
                      </div>
                    </div>
                    {closing?.id === report.id && (
                      <div className="mt-3 border-2 border-navy rounded-xl bg-cream/60 p-3">
                        <p className="font-bold text-navy text-sm">{closing.status === 'rejected' ? 'Why are you dismissing this report?' : 'What did you do?'}</p>
                        <textarea value={closing.text} onChange={e => setClosing(c => ({ ...c, text: e.target.value }))} rows={2} autoFocus
                          aria-label={closing.status === 'rejected' ? 'Reason for dismissing' : 'What was done'}
                          className="w-full mt-2 border-2 border-navy/20 rounded-lg px-3 py-2 text-sm bg-white focus:border-brand-red focus:outline-none"/>
                        <p className="text-navy/60 text-xs mt-1">Required. Only admins see it; the member who reported sees {closing.status === 'rejected' ? '"Closed, no action"' : '"Action taken"'}.</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setReportStatus(report.id, closing.status, closing.text.trim())} disabled={!closing.text.trim()}
                            className={`text-white px-3 py-1.5 rounded-full text-xs font-bold border-2 border-navy disabled:opacity-40 ${closing.status === 'rejected' ? 'bg-brand-red' : 'bg-brand-teal'}`}>
                            {closing.status === 'rejected' ? 'Dismiss report' : 'Mark as resolved'}
                          </button>
                          <button onClick={() => setClosing(null)} className="bg-white text-navy px-3 py-1.5 rounded-full text-xs font-bold border-2 border-navy">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            {handledReports.length > 0 && (
              <>
                <h2 className="font-display font-bold text-navy mt-6">✅ Handled</h2>
                {handledReports.map(report => (
                  <div key={report.id} className="bg-white rounded-2xl p-5 border-2 border-navy/10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-navy">
                          {report.reported_type === 'user'
                            ? <>👤 User <span className="font-mono">{userCode(report.reported_id)}</span></>
                            : <>📚 Class #{report.reported_id}</>}
                        </p>
                        <p className="text-navy/65 text-sm mt-1">{report.reason}</p>
                        {report.notes && <p className="bg-navy/5 rounded-lg px-3 py-2 text-sm text-navy mt-2"><b>Reason:</b> {report.notes}</p>}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${
                        report.status === 'resolved' ? 'bg-brand-teal/10 text-brand-teal-dark border-brand-teal/30' : 'bg-navy/5 text-navy/65 border-navy/10'}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {reports.length === 0 && <p className="text-navy/65 text-center py-12">No reports yet</p>}
          </div>
        )}

        {tab === 'credits' && !loading && (
          <>
          <input value={creditSearch} onChange={e => setCreditSearch(e.target.value)}
            placeholder="Find a user by code, name, or email..."
            className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-4 focus:border-brand-red focus:outline-none transition-colors"/>
          <div className="space-y-3">
            {creditSearchResults.map(user => (
              <div key={user.id} className="bg-white rounded-2xl p-4 border-2 border-navy/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-10 h-10 bg-brand-yellow/30 rounded-full flex items-center justify-center text-navy font-display font-bold border-2 border-navy">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-navy text-sm">{user.first_name} {user.last_name}</p>
                    <p className="text-navy/65 text-xs">{user.email} · <span className="font-mono font-bold">{userCode(user.id)}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" value={creditAmounts[user.id] || ''}
                    onChange={e => setCreditAmounts(a => ({ ...a, [user.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addCredit(user.id)}
                    placeholder="Amount"
                    className="w-24 border-2 border-navy/20 rounded-full px-3 py-1.5 text-sm focus:border-brand-red focus:outline-none transition-colors"/>
                  <button onClick={() => addCredit(user.id)}
                    className="bg-brand-yellow/20 text-navy px-4 py-1.5 rounded-full text-sm font-bold border-2 border-navy/20 hover:border-navy transition-colors whitespace-nowrap">
                    Add
                  </button>
                  {creditMessages[user.id] && <span className="text-navy/65 text-xs whitespace-nowrap">{creditMessages[user.id]}</span>}
                </div>
              </div>
            ))}
            {creditSearchResults.length === 0 && (
              <p className="text-navy/65 text-center py-12">{liveUsers.length === 0 ? 'No users yet' : 'No users match your search'}</p>
            )}
          </div>
          </>
        )}

        {tab === 'resources' && !loading && (
          <>
            <div className="bg-white border-2 border-navy/15 rounded-xl p-5 mb-6">
              <p className="font-display font-bold text-navy mb-1">Add or update a guide</p>
              {/* One row per language + level. Saving with a level already in
                  the list below updates that row rather than adding one, which
                  is not obvious from a form that keeps its values. */}
              <p className="text-navy/65 text-xs mb-3">
                Save once per level, then upload that level&apos;s PDF from its card below.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <select value={resourceForm.language_code}
                  onChange={e => setResourceForm({ ...resourceForm, language_code: e.target.value })}
                  className="border-2 border-navy/20 rounded-full px-3 py-2 text-sm focus:border-brand-red focus:outline-none">
                  {languageOptions(t).map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                </select>
                <select value={resourceForm.level}
                  onChange={e => setResourceForm({ ...resourceForm, level: e.target.value })}
                  className="border-2 border-navy/20 rounded-full px-3 py-2 text-sm focus:border-brand-red focus:outline-none">
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <input value={resourceForm.title}
                onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                placeholder="Title, e.g. Spanish A1 — What to Study"
                className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-2 focus:border-brand-red focus:outline-none"/>
              <textarea value={resourceForm.description}
                onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })}
                placeholder="Short description shown on the page and in search results"
                rows={2}
                className="w-full border-2 border-navy/20 rounded-2xl px-4 py-2 text-sm mb-2 focus:border-brand-red focus:outline-none"/>
              <input value={resourceForm.source_url}
                onChange={e => setResourceForm({ ...resourceForm, source_url: e.target.value })}
                placeholder="Official syllabus URL (optional)"
                className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-2 focus:border-brand-red focus:outline-none"/>
              <input value={resourceForm.attribution}
                onChange={e => setResourceForm({ ...resourceForm, attribution: e.target.value })}
                placeholder="Attribution — only for third-party material under an open licence"
                className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-3 focus:border-brand-red focus:outline-none"/>
              <div className="flex items-center gap-3">
                <button onClick={saveResource}
                  className="bg-brand-red text-white px-5 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red/90 transition-colors">
                  Save {languageOptions(t).find(l => l.code === resourceForm.language_code)?.name || resourceForm.language_code} {resourceForm.level}
                </button>
                {resourceMessage && <span className="text-navy/65 text-sm">{resourceMessage}</span>}
              </div>
            </div>

            {resources.length === 0 && <p className="text-navy/65">No resources yet.</p>}
            {resources.map(r => (
              <div key={r.id} className="bg-white border-2 border-navy/15 rounded-xl p-4 mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">{r.title}</p>
                    <p className="text-navy/65 text-sm">{r.language_code} · {r.level} · {r.audience}</p>
                    {/* A row with no PDF is a draft and is hidden from the
                        public list, so say so rather than looking published. */}
                    <p className={`text-xs mt-1 ${r.pdf_url ? 'text-navy/65' : 'text-brand-red font-bold'}`}>
                      {r.pdf_url ? 'Published' : 'Draft — no PDF uploaded, not public'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => editResource(r)}
                      className="text-navy text-sm font-bold hover:underline whitespace-nowrap">Edit</button>
                    <button onClick={() => deleteResource(r.id)}
                      className="text-brand-red text-sm font-bold hover:underline whitespace-nowrap">Delete</button>
                  </div>
                </div>
                <div className="mt-3 border-t border-navy/10 pt-3 flex items-center gap-3 flex-wrap">
                  <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                    uploadingId === r.id
                      ? 'bg-navy/5 text-navy/65 border-navy/20 cursor-wait'
                      : r.pdf_url
                        ? 'bg-white text-navy border-navy/30 hover:border-navy cursor-pointer'
                        : 'bg-brand-red text-white border-navy hover:bg-brand-red/90 cursor-pointer'}`}>
                    {uploadingId === r.id
                      ? 'Uploading…'
                      : r.pdf_url ? '↻ Replace PDF' : '⬆ Upload PDF'}
                    <input type="file" accept="application/pdf" className="hidden"
                      disabled={uploadingId === r.id}
                      onChange={e => e.target.files[0] && uploadResourcePdf(r.id, e.target.files[0])}/>
                  </label>
                  {r.pdf_url && (
                    <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="text-navy/65 text-sm underline hover:text-navy">View current PDF</a>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  )
}
