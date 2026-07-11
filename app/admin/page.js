'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Admin() {
  const router = useRouter()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { router.push('/auth/login'); return }
    fetchUsers()
    fetchClasses()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3001/api/admin/users', {
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
      const res = await fetch('http://localhost:3001/api/admin/classes', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setClasses(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  const approveUser = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:3001/api/admin/users/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchUsers()
  }

  const rejectUser = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:3001/api/admin/users/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchUsers()
  }

  const approveClass = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:3001/api/classes/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchClasses()
  }

  const rejectClass = async (id) => {
    const token = localStorage.getItem('token')
    await fetch(`http://localhost:3001/api/classes/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchClasses()
  }

  const pendingUsers = users.filter(u => !u.is_approved)
  const approvedUsers = users.filter(u => u.is_approved)
  const pendingClasses = classes.filter(c => c.status === 'pending')

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white">
        <a href="/" className="text-xl font-semibold text-indigo-600">LinguaXchange</a>
        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">⚙️ Admin Panel</span>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 mb-8">Manage users and classes</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-3xl font-bold text-amber-500">{pendingUsers.length}</p>
            <p className="text-gray-500 text-sm">Pending users</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-3xl font-bold text-green-500">{approvedUsers.length}</p>
            <p className="text-gray-500 text-sm">Approved users</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-3xl font-bold text-indigo-500">{pendingClasses.length}</p>
            <p className="text-gray-500 text-sm">Pending classes</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={() => setTab('users')}
            className={`px-5 py-2 rounded-lg font-medium text-sm ${tab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
            👥 Users
          </button>
          <button onClick={() => setTab('classes')}
            className={`px-5 py-2 rounded-lg font-medium text-sm ${tab === 'classes' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
            📚 Classes
          </button>
        </div>

        {loading && <p className="text-gray-400">Loading...</p>}

        {tab === 'users' && !loading && (
          <div className="space-y-4">
            {pendingUsers.length > 0 && (
              <>
                <h2 className="font-semibold text-gray-700">⏳ Waiting for approval</h2>
                {pendingUsers.map(user => (
                  <div key={user.id} className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-gray-500 text-sm">{user.email}</p>
                          <p className="text-gray-400 text-xs">{user.nationality} · {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveUser(user.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                          ✓ Approve
                        </button>
                        <button onClick={() => rejectUser(user.id)}
                          className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium">
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                    {user.bio && <p className="text-gray-500 text-sm mt-3 border-t border-gray-100 pt-3">{user.bio}</p>}
                  </div>
                ))}
              </>
            )}
            {approvedUsers.length > 0 && (
              <>
                <h2 className="font-semibold text-gray-700 mt-6">✅ Approved users</h2>
                {approvedUsers.map(user => (
                  <div key={user.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                          <p className="text-gray-500 text-sm">{user.email}</p>
                          <p className="text-gray-400 text-xs">{user.nationality}</p>
                        </div>
                      </div>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">Approved</span>
                    </div>
                  </div>
                ))}
              </>
            )}
            {users.length === 0 && <p className="text-gray-400 text-center py-12">No users yet</p>}
          </div>
        )}

        {tab === 'classes' && !loading && (
          <div className="space-y-4">
            {pendingClasses.map(cls => (
              <div key={cls.id} className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{cls.title}</p>
                    <p className="text-gray-500 text-sm">{cls.language_code} · {cls.level} · {cls.duration_minutes} min</p>
                    {cls.description && <p className="text-gray-500 text-sm mt-2">{cls.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveClass(cls.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                      ✓ Approve
                    </button>
                    <button onClick={() => rejectClass(cls.id)}
                      className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium">
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingClasses.length === 0 && <p className="text-gray-400 text-center py-12">No pending classes</p>}
          </div>
        )}
      </div>
    </main>
  )
}