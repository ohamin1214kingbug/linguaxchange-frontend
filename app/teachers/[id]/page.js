'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const API = 'https://linguaxchange-backend-production.up.railway.app'

function Stars({ rating }) {
  return (
    <span className="text-brand-yellow text-lg">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={rating >= i ? 'text-brand-yellow' : 'text-navy/15'}>★</span>
      ))}
    </span>
  )
}

export default function TeacherProfile() {
  const { id } = useParams()
  const { t } = useLanguage()
  const [teacher, setTeacher] = useState(null)
  const [classes, setClasses] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(null)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)

  const LANGS = {
    KO: { flag: '🇰🇷', name: t('home.langKorean') },
    ES: { flag: '🇪🇸', name: t('home.langSpanish') },
    DE: { flag: '🇩🇪', name: t('home.langGerman') },
    EN: { flag: '🇬🇧', name: t('home.langEnglish') },
    PT: { flag: '🇧🇷', name: t('home.langPortuguese') },
  }

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`${API}/api/users/${id}`).then(r => r.json()),
      fetch(`${API}/api/classes?teacher_id=${id}`).then(r => r.json()),
      fetch(`${API}/api/reviews/teacher/${id}`).then(r => r.json()),
    ]).then(([user, cls, rev]) => {
      setTeacher(user)
      setClasses(Array.isArray(cls) ? cls : [])
      setReviews(Array.isArray(rev) ? rev : [])
      setLoading(false)
    })
  }, [id])

  const joinClass = async (cls) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const token = localStorage.getItem('token')
    if (!user || !token) {
      window.location.href = '/auth/login'
      return
    }
    setJoining(cls.id)
    setMessage('')
    try {
      const res = await fetch(`${API}/api/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ class_id: cls.id })
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(t('classes.successfullyJoined'))
        setMessageOk(true)
      } else {
        setMessage(data.error || t('classes.errorJoinClass'))
        setMessageOk(false)
      }
    } catch (e) {
      setMessage(t('common.connectionError'))
      setMessageOk(false)
    }
    setJoining(null)
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('common.loading')}</div>
  )

  if (!teacher || teacher.error) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('teacher.teacherNotFound')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <div className="flex gap-4 items-center">
          <a href="/classes" className="text-navy/70 font-medium hover:text-navy">{t('common.explore')}</a>
          <a href="/dashboard" className="text-navy/70 font-medium hover:text-navy">{t('common.dashboard')}</a>
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        {/* Header card */}
        <div className="bg-white rounded-2xl p-8 border-2 border-navy mb-6">
          <div className="flex items-start gap-6">
            {teacher.photo_url ? (
              <img src={teacher.photo_url} alt={teacher.first_name}
                className="w-24 h-24 rounded-full object-cover border-2 border-navy flex-shrink-0"/>
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-red flex items-center justify-center text-4xl text-white font-display font-bold flex-shrink-0 border-2 border-navy">
                {teacher.first_name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-display font-extrabold text-2xl text-navy">
                {teacher.first_name} {teacher.last_name}
              </h1>
              {teacher.nationality && (
                <p className="text-navy/50 text-sm mt-0.5">{teacher.nationality}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {teacher.teach_language && LANGS[teacher.teach_language] && (
                  <span className="bg-brand-red/10 text-navy px-3 py-1 rounded-full text-sm font-bold border-2 border-navy/10">
                    {LANGS[teacher.teach_language].flag} {t('teacher.teaches', { lang: LANGS[teacher.teach_language].name })}
                    {teacher.teach_level ? ` · ${teacher.teach_level}` : ''}
                  </span>
                )}
                {teacher.has_certificate && (
                  <span className="bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full text-sm font-bold border-2 border-brand-teal/30">
                    {t('teacher.certified')}
                  </span>
                )}
                {avgRating && (
                  <span className="flex items-center gap-1">
                    <Stars rating={parseFloat(avgRating)} />
                    <span className="text-navy text-sm font-bold">{avgRating}</span>
                    <span className="text-navy/40 text-sm">{t('teacher.reviewsCount', { n: reviews.length })}</span>
                  </span>
                )}
              </div>
              {teacher.bio && (
                <p className="text-navy/70 mt-4 leading-relaxed">{teacher.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming classes */}
        {classes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
            <h2 className="font-display font-bold text-navy mb-4">{t('teacher.upcomingClasses')}</h2>

            {message && (
              <div className={`px-4 py-3 rounded-xl mb-4 text-sm font-medium border-2 ${messageOk ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>
                {message}
              </div>
            )}

            <div className="space-y-3">
              {classes.map(cls => (
                <div key={cls.id} className="flex items-center justify-between py-3 border-b border-navy/10 last:border-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{LANGS[cls.language_code]?.flag}</span>
                      <span className="bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">{cls.level}</span>
                      <span className="text-navy/40 text-xs">{cls.duration_minutes} {t('classes.min')}</span>
                    </div>
                    <p className="font-bold text-navy text-sm">{cls.title}</p>
                    {cls.description && <p className="text-navy/40 text-xs mt-0.5">{cls.description}</p>}
                    {cls.class_sessions?.[0]?.session_date && (
                      <p className="text-brand-red text-xs font-bold mt-1">
                        🗓️ {new Date(cls.class_sessions[0].session_date).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button onClick={() => joinClass(cls)}
                    disabled={joining === cls.id}
                    className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors flex-shrink-0 ml-4">
                    {joining === cls.id ? t('classes.joining') : t('teacher.join')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border-2 border-navy">
            <h2 className="font-display font-bold text-navy mb-4">{t('teacher.studentReviews')}</h2>
            <div className="space-y-4">
              {reviews.slice(0, 10).map((rev, i) => (
                <div key={i} className="py-3 border-b border-navy/10 last:border-0">
                  <Stars rating={rev.rating} />
                  {rev.comment && <p className="text-navy/70 text-sm mt-1">{rev.comment}</p>}
                  <p className="text-navy/40 text-xs mt-1">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {classes.length === 0 && reviews.length === 0 && (
          <div className="text-center py-12 text-navy/40">
            <p>{t('teacher.noClassesPosted')}</p>
          </div>
        )}
      </div>
    </main>
  )
}
