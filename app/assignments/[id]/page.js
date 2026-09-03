'use client'
import { useState, useEffect, use } from 'react'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import Navbar from '../../../components/Navbar'
import AnnotationEditor from '../../../components/AnnotationEditor'
import FeedbackView from '../../../components/FeedbackView'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function AssignmentPage({ params }) {
  const { id } = use(params)
  const { t } = useLanguage()
  const [request, setRequest] = useState(null)
  const [user, setUser] = useState(null)

  const load = () => {
    fetch(`${API}/api/assignments/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(setRequest)
      .catch(() => setRequest(null))
  }

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    load()
  }, [id])

  if (!request) return (<><Navbar /><main className="px-4 py-10 max-w-3xl mx-auto" /></>)

  const feedback = (request.assignment_feedback || [])[0]
  const isStudent = user && user.id === request.student_id

  const acknowledge = async () => {
    await fetch(`${API}/api/assignments/${request.id}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    load()
  }

  return (
    <>
      <Navbar />
      <main className="px-4 py-10 max-w-3xl mx-auto">
        <h1 className="font-display font-extrabold text-navy text-2xl mb-1">{request.prompt}</h1>
        <p className="text-navy/50 text-sm mb-6">{request.language_code}</p>

        {feedback ? (
          <FeedbackView request={request} feedback={feedback}
            canAcknowledge={isStudent && !feedback.acknowledged_at}
            onAcknowledge={acknowledge} />
        ) : isStudent ? (
          <p className="text-navy/60">{t('assignments.awaiting')}</p>
        ) : (
          <AnnotationEditor request={request} onSent={load} />
        )}
      </main>
    </>
  )
}
