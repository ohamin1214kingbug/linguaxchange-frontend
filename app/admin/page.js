'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Admin() {
  const router = useRouter()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  const API = 'https://linguaxchange-backend-production.up.railway.app'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/auth/login'); return }
    fetchUsers()
    fetchClasses()
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

  const pendingUsers = users.filter(u => !u.is_approved)
  const approvedUsers = users.filter(u => u.is_approved)
  const pendingClasses = classes.filter(c => c.status === 'pending')
  const approvedClasses = classes.filter(c => c.status === 'approved')

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <span className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-full text-sm font-bold border-2 border-brand-red/30">⚙️ Admin Panel</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl text-navy mb-2">Admin Dashboard</h1>
        <p className="text-navy/60 mb-8">Manage users and classes</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
        </div>

        {loading && <p className="text-navy/40">Loading...</p>}

        {tab === 'users' && !loading && (
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
                          <p className="text-navy/60 text-sm">{user.email}</p>
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
                          <p className="text-navy/60 text-sm">{user.email}</p>
                          <p className="text-navy/40 text-xs">{user.nationality}</p>
                        </div>
                      </div>
                      <span className="bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full text-xs font-bold border-2 border-brand-teal/30">Approved</span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {users.length === 0 && <p className="text-navy/40 text-center py-12">No users yet</p>}
          </div>
        )}

        {tab === 'classes' && !loading && (
          <div className="space-y-4">
            {approvedClasses.length > 0 && (
              <>
                <h2 className="font-display font-bold text-navy">✅ Active classes — mark complete to give teacher 1 credit</h2>
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
                        ✓ Mark complete (+1 credit)
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
      </div>
    </main>
  )
}
