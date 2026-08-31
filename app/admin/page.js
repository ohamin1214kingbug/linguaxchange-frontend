'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { languageOptions, LEVELS } from '../../lib/languages'
import { useLanguage } from '../../lib/i18n/LanguageContext'

// A user's DB id is already permanent and unique — no new column needed,
// just a friendlier alphabet-led format for admins to reference in reports.
const userCode = id => 'U' + String(id).padStart(6, '0')

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
        {message && <span className="text-navy/50 text-xs">{message}</span>}
      </div>
    </div>
  )
}

export default function Admin() {
  const router = useRouter()
  const [tab, setTab] = useState('users')
  const [userSearch, setUserSearch] = useState('')
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

  const API = 'https://linguaxchange-backend-production.up.railway.app'

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

  const setReportStatus = async (id, status) => {
    const token = localStorage.getItem('token')
    await fetch(`${API}/api/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status })
    })
    fetchReports()
  }

  const approveUser = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`${API}/api/admin/users/${id}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    fetchUsers()
  }

  const rejectUser = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`${API}/api/admin/users/${id}/reject`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    fetchUsers()
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

  const approveClass = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`${API}/api/classes/${id}/approve`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    fetchClasses()
  }

  const rejectClass = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`${API}/api/classes/${id}/reject`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    fetchClasses()
  }

  const completeClass = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`${API}/api/admin/classes/${id}/complete`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    })
    fetchClasses()
  }

  const matchesSearch = (u, query) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [userCode(u.id), u.first_name, u.last_name, u.email].some(v => v?.toLowerCase().includes(q))
  }
  const matchesUserSearch = u => matchesSearch(u, userSearch)
  const pendingUsers = users.filter(u => !u.is_approved && matchesUserSearch(u))
  const approvedUsers = users.filter(u => u.is_approved && matchesUserSearch(u))
  const creditSearchResults = users.filter(u => matchesSearch(u, creditSearch))
  const pendingClasses = classes.filter(c => c.status === 'pending')
  const approvedClasses = classes.filter(c => c.status === 'approved')
  const pendingReports = reports.filter(r => r.status === 'pending')
  const handledReports = reports.filter(r => r.status !== 'pending')

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <span className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-full text-sm font-bold border-2 border-brand-red/30">⚙️ Admin Panel</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">Admin Dashboard</h1>
        <p className="text-navy/60 mb-8">Manage users and classes</p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 border-2 border-navy text-center">
            <p className="font-display font-extrabold text-3xl text-brand-yellow">{pendingUsers.length}</p>
            <p className="text-navy/60 text-sm font-medium">Pending users</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border-2 border-navy text-center">
            <p className="font-display font-extrabold text-3xl text-brand-teal">{approvedUsers.length}</p>
            <p className="text-navy/60 text-sm font-medium">Approved users</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border-2 border-navy text-center">
            <p className="font-display font-extrabold text-3xl text-brand-yellow">{pendingClasses.length}</p>
            <p className="text-navy/60 text-sm font-medium">Pending classes</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border-2 border-navy text-center">
            <p className="font-display font-extrabold text-3xl text-brand-red">{approvedClasses.length}</p>
            <p className="text-navy/60 text-sm font-medium">Active classes</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border-2 border-navy text-center">
            <p className="font-display font-extrabold text-3xl text-brand-yellow">{pendingReports.length}</p>
            <p className="text-navy/60 text-sm font-medium">Open reports</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={() => setTab('users')}
            className={`px-5 py-2 rounded-full font-bold text-sm border-2 transition-colors ${tab === 'users' ? 'bg-brand-red text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
            👥 Users
          </button>
          <button onClick={() => setTab('classes')}
            className={`px-5 py-2 rounded-full font-bold text-sm border-2 transition-colors ${tab === 'classes' ? 'bg-brand-red text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
            📚 Classes
          </button>
          <button onClick={() => setTab('reports')}
            className={`px-5 py-2 rounded-full font-bold text-sm border-2 transition-colors ${tab === 'reports' ? 'bg-brand-red text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
            🚩 Reports
          </button>
          <button onClick={() => setTab('credits')}
            className={`px-5 py-2 rounded-full font-bold text-sm border-2 transition-colors ${tab === 'credits' ? 'bg-brand-red text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
            💰 Credits
          </button>
          <button onClick={() => setTab('resources')}
            className={`px-5 py-2 rounded-full font-bold text-sm border-2 transition-colors ${tab === 'resources' ? 'bg-brand-red text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
            📄 Resources
          </button>
        </div>

        {loading && <p className="text-navy/40">Loading...</p>}

        {tab === 'users' && !loading && (
          <>
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
            placeholder="Find a user by code, name, or email..."
            className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-4 focus:border-brand-red focus:outline-none transition-colors"/>
          <div className="space-y-4">
            {pendingUsers.length > 0 && (
              <>
                <h2 className="font-display font-bold text-navy">⏳ Waiting for approval</h2>
                {pendingUsers.map(user => (
                  <div key={user.id} className="bg-white rounded-2xl p-5 border-2 border-brand-yellow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-red rounded-full flex items-center justify-center text-white font-display font-bold border-2 border-navy">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-navy">{user.first_name} {user.last_name}</p>
                          <p className="text-navy/60 text-sm">{user.email} · <span className="font-mono font-bold">{userCode(user.id)}</span></p>
                          <p className="text-navy/40 text-xs">{user.nationality} · {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveUser(user.id)}
                          className="bg-brand-teal text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy">
                          ✓ Approve
                        </button>
                        <button onClick={() => rejectUser(user.id)}
                          className="bg-brand-red/10 text-brand-red px-4 py-2 rounded-full text-sm font-bold border-2 border-brand-red/30">
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                    {user.bio && <p className="text-navy/60 text-sm mt-3 border-t border-navy/10 pt-3">{user.bio}</p>}
                    <CreditControl amount={creditAmounts[user.id] || ''} message={creditMessages[user.id]}
                      onAmountChange={e => setCreditAmounts(a => ({ ...a, [user.id]: e.target.value }))}
                      onSubmit={() => addCredit(user.id)}/>
                  </div>
                ))}
              </>
            )}
            {approvedUsers.length > 0 && (
              <>
                <h2 className="font-display font-bold text-navy mt-6">✅ Approved users</h2>
                {approvedUsers.map(user => (
                  <div key={user.id} className="bg-white rounded-2xl p-5 border-2 border-navy/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-teal rounded-full flex items-center justify-center text-white font-display font-bold border-2 border-navy">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-navy">{user.first_name} {user.last_name}</p>
                          <p className="text-navy/60 text-sm">{user.email} · <span className="font-mono font-bold">{userCode(user.id)}</span></p>
                          <p className="text-navy/40 text-xs">{user.nationality}</p>
                        </div>
                      </div>
                      <span className="bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full text-xs font-bold border-2 border-brand-teal/30">Approved</span>
                    </div>
                    <CreditControl amount={creditAmounts[user.id] || ''} message={creditMessages[user.id]}
                      onAmountChange={e => setCreditAmounts(a => ({ ...a, [user.id]: e.target.value }))}
                      onSubmit={() => addCredit(user.id)}/>
                  </div>
                ))}
              </>
            )}
            {pendingUsers.length === 0 && approvedUsers.length === 0 && (
              <p className="text-navy/40 text-center py-12">{users.length === 0 ? 'No users yet' : 'No users match your search'}</p>
            )}
          </div>
          </>
        )}

        {tab === 'classes' && !loading && (
          <div className="space-y-4">
            {approvedClasses.length > 0 && (
              <>
                <h2 className="font-display font-bold text-navy">✅ Active classes — mark complete once the class has happened (updates teacher streak/badges; credit is earned separately when students confirm attendance)</h2>
                {approvedClasses.map(cls => (
                  <div key={cls.id} className="bg-white rounded-2xl p-5 border-2 border-brand-teal">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-navy">{cls.title}</p>
                        <p className="text-navy/60 text-sm">{cls.language_code} · {cls.level} · {cls.duration_minutes} min</p>
                        {cls.description && <p className="text-navy/60 text-sm mt-2">{cls.description}</p>}
                      </div>
                      <button onClick={() => completeClass(cls.id)}
                        className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy">
                        ✓ Mark complete
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {pendingClasses.length > 0 && (
              <>
                <h2 className="font-display font-bold text-navy mt-4">⏳ Pending approval</h2>
                {pendingClasses.map(cls => (
                  <div key={cls.id} className="bg-white rounded-2xl p-5 border-2 border-brand-yellow">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-navy">{cls.title}</p>
                        <p className="text-navy/60 text-sm">{cls.language_code} · {cls.level} · {cls.duration_minutes} min</p>
                        {cls.description && <p className="text-navy/60 text-sm mt-2">{cls.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveClass(cls.id)}
                          className="bg-brand-teal text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy">
                          ✓ Approve
                        </button>
                        <button onClick={() => rejectClass(cls.id)}
                          className="bg-brand-red/10 text-brand-red px-4 py-2 rounded-full text-sm font-bold border-2 border-brand-red/30">
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {pendingClasses.length === 0 && approvedClasses.length === 0 && (
              <p className="text-navy/40 text-center py-12">No classes yet</p>
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
                      <div>
                        <p className="font-bold text-navy">
                          {report.reported_type === 'user'
                            ? <>👤 User <span className="font-mono">{userCode(report.reported_id)}</span></>
                            : <>📚 Class #{report.reported_id}</>}
                        </p>
                        <p className="text-navy/60 text-sm mt-1">{report.reason}</p>
                        <p className="text-navy/40 text-xs mt-2">
                          Reported by {report.reporter?.first_name} {report.reporter?.last_name} <span className="font-mono">{userCode(report.reporter_id)}</span> ({report.reporter?.email}) · {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setReportStatus(report.id, 'resolved')}
                          className="bg-brand-teal text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy whitespace-nowrap">
                          ✓ Resolve
                        </button>
                        <button onClick={() => setReportStatus(report.id, 'rejected')}
                          className="bg-brand-red/10 text-brand-red px-4 py-2 rounded-full text-sm font-bold border-2 border-brand-red/30 whitespace-nowrap">
                          ✗ Dismiss
                        </button>
                      </div>
                    </div>
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
                        <p className="text-navy/60 text-sm mt-1">{report.reason}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 whitespace-nowrap ${
                        report.status === 'resolved' ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' : 'bg-navy/5 text-navy/50 border-navy/10'}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {reports.length === 0 && <p className="text-navy/40 text-center py-12">No reports yet</p>}
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
                    <p className="text-navy/50 text-xs">{user.email} · <span className="font-mono font-bold">{userCode(user.id)}</span></p>
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
                  {creditMessages[user.id] && <span className="text-navy/50 text-xs whitespace-nowrap">{creditMessages[user.id]}</span>}
                </div>
              </div>
            ))}
            {creditSearchResults.length === 0 && (
              <p className="text-navy/40 text-center py-12">{users.length === 0 ? 'No users yet' : 'No users match your search'}</p>
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
              <p className="text-navy/50 text-xs mb-3">
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
                {resourceMessage && <span className="text-navy/60 text-sm">{resourceMessage}</span>}
              </div>
            </div>

            {resources.length === 0 && <p className="text-navy/40">No resources yet.</p>}
            {resources.map(r => (
              <div key={r.id} className="bg-white border-2 border-navy/15 rounded-xl p-4 mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">{r.title}</p>
                    <p className="text-navy/50 text-sm">{r.language_code} · {r.level} · {r.audience}</p>
                    {/* A row with no PDF is a draft and is hidden from the
                        public list, so say so rather than looking published. */}
                    <p className={`text-xs mt-1 ${r.pdf_url ? 'text-navy/40' : 'text-brand-red font-bold'}`}>
                      {r.pdf_url ? 'Published' : 'Draft — no PDF uploaded, not public'}
                    </p>
                  </div>
                  <button onClick={() => deleteResource(r.id)}
                    className="text-brand-red text-sm font-bold hover:underline whitespace-nowrap">Delete</button>
                </div>
                <div className="mt-3 border-t border-navy/10 pt-3 flex items-center gap-3 flex-wrap">
                  <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                    uploadingId === r.id
                      ? 'bg-navy/5 text-navy/40 border-navy/20 cursor-wait'
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
                      className="text-navy/60 text-sm underline hover:text-navy">View current PDF</a>
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
