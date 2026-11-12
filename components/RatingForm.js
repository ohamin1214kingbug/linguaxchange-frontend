'use client'
import { useState } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'

// Shared by the dashboard and the class history page, which both let a
// student review a class they attended.

const API = ''

function Stars({ rating }) {
  return (
    <span className="text-lg leading-none">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={rating >= i ? 'text-brand-yellow' : 'text-navy/50'}>★</span>
      ))}
    </span>
  )
}

// `existingReview` comes from GET /api/reviews/mine, not from local state:
// success used to live only in this component, so a reload brought the empty
// form back and made a saved review look like it never went through.
export default function RatingForm({ classSessionId, existingReview, onReviewed }) {
  const { t } = useLanguage()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submitRating = async () => {
    setError('')
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          class_session_id: classSessionId,
          rating,
          comment
        })
      })
      const data = await res.json().catch(() => ({}))
      // Was unconditional: every rejection (already reviewed, didn't attend,
      // expired token) still rendered "Review submitted!" and dropped what
      // the student had written.
      if (!res.ok) setError(data.error || 'dashboard.reviewFailed')
      else onReviewed({ class_session_id: classSessionId, rating, comment })
    } catch (e) {
      setError('common.connectionError')
    }
    setSaving(false)
  }

  if (existingReview) return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <span className="text-brand-teal-dark font-bold">{t('dashboard.reviewSubmitted')}</span>
      <Stars rating={existingReview.rating} />
      {existingReview.comment && <span className="text-navy/65 italic truncate">"{existingReview.comment}"</span>}
    </div>
  )

  return (
    <div className="mt-3 bg-cream rounded-xl p-4 border-2 border-navy/10">
      <p className="text-sm font-bold text-navy mb-2">{t('dashboard.rateThisClass')}</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(star => (
          <button key={star} type="button" onClick={() => setRating(star)}
            className={`text-2xl transition-colors ${rating >= star ? 'text-brand-yellow' : 'text-navy/50'}`}>
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
        placeholder={t('dashboard.writeReviewPlaceholder')}
        className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm resize-none mb-2 focus:border-brand-red focus:outline-none transition-colors"/>
      {error && <p className="text-brand-red text-xs font-medium mb-2">{t(error)}</p>}
      <button onClick={submitRating} disabled={rating === 0 || saving}
        className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40 disabled:border-navy/20">
        {saving ? t('dashboard.submittingReview') : t('dashboard.submitReview')}
      </button>
    </div>
  )
}

