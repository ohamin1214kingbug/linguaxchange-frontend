'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import ClassChat from '../../../components/ClassChat'
import { useLanguage } from '../../../lib/i18n/LanguageContext'

// Where a chat notification leads: the chat on its own, full width, which
// is what a phone needs. The class page and the classroom show the same chat.
export default function ChatPage() {
  const { sessionId } = useParams()
  const router = useRouter()
  const { t } = useLanguage()
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    fetch(`/api/chat/session/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : { denied: true })).then(setInfo).catch(() => setInfo({ denied: true }))
  }, [sessionId])

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {info && !info.denied && (
          <div className="mb-4">
            <h1 className="font-display font-extrabold text-2xl text-navy">{info.title}</h1>
            <a href={`/classes/${info.class_id}`} className="text-navy text-sm font-bold underline decoration-2 underline-offset-4">{t('dashboard.classPage')} →</a>
          </div>
        )}
        {info?.denied && <p className="text-navy/65">{t('chat.notMember')}</p>}
        {info && !info.denied && <ClassChat sessionId={sessionId} />}
      </div>
    </main>
  )
}
