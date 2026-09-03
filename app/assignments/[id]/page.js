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
  // undefined = not resolved yet (defaults to "can't review"); the login
  // response never includes teach_language, so the cached `user` object
  // almost never has it — this always ends up fetching, and that fetch is
  // the only source of truth, not a guess.
  const [teachLanguage, setTeachLanguage] = useState(undefined)

  const load = () => {
    fetch(`${API}/api/assignments/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(setRequest)
      .catch(() => setRequest(null))
  }

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      setUser(u)
      if (u.teach_language !== undefined) {
        setTeachLanguage(u.teach_language)
      } else {
        fetch(`${API}/api/users/${u.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
          .then(r => (r.ok ? r.json() : null))
          .then(data => setTeachLanguage(data ? data.teach_language ?? null : null))
          .catch(() => setTeachLanguage(null))
      }
    }
    load()
  }, [id])

  if (!request) return (<><Navbar /><main className="px-4 py-10 max-w-3xl mx-auto" /></>)

  const feedback = (request.assignment_feedback || [])[0]
  const isStudent = user && user.id === request.student_id
  const canReview = user && teachLanguage !== undefined && teachLanguage === request.language_code

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
        ) : canReview ? (
          <AnnotationEditor request={request} onSent={load} />
        ) : (
          <div>
            <div className="bg-white border-2 border-navy rounded-2xl p-5 whitespace-pre-wrap leading-relaxed mb-4">
              {request.body}
            </div>
            {!user ? (
              <a href="/auth/login" className="text-brand-red font-bold hover:underline">{t('common.signIn')}</a>
            ) : teachLanguage !== undefined ? (
              <p className="text-navy/60">{t('assignments.notYourLanguage')}</p>
            ) : null}
          </div>
        )}
      </main>
    </>
  )
}
