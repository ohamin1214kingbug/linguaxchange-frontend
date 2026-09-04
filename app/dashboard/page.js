'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'
import Tabs from '../../components/Tabs'
import { formatInTimezone, asUtcDate } from '../../lib/timezone'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// Was computed inline, separately, in both the enrolled-classes list and the
// teaching-classes list. A third caller (the live-class banner below) is
// what made copying it a third time worth stopping to share instead.
// `canJoin` mirrors utils/classroomAccess.js on the backend, which is what
// actually enforces this: the room needs a token, and the server refuses to
// mint one outside the window. Kept in step here so the link never appears
// on a door the server will hold shut.
const TEACHER_EARLY_MS = 10 * 60 * 1000

function sessionTiming(session, durationMinutes, isTeacher = false, now = new Date()) {
  const scheduledAt = session?.session_date ? asUtcDate(session.session_date) : null
  const durationMs = (durationMinutes || 60) * 60 * 1000
  const classEndTime = scheduledAt ? new Date(scheduledAt.getTime() + durationMs) : null
  const isClassOver = classEndTime ? now > classEndTime : true
  const isLive = scheduledAt && !isClassOver && now >= scheduledAt
  const opensAt = scheduledAt && isTeacher
    ? new Date(scheduledAt.getTime() - TEACHER_EARLY_MS)
    : scheduledAt
  const canJoin = !!opensAt && !isClassOver && now >= opensAt
  return { scheduledAt, isClassOver, isLive, canJoin }
}

function Stars({ rating }) {
  return (
    <span className="text-lg leading-none">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={rating >= i ? 'text-brand-yellow' : 'text-navy/20'}>★</span>
      ))}
    </span>
  )
}

// `existingReview` comes from GET /api/reviews/mine, not from local state:
// success used to live only in this component, so a reload brought the empty
// form back and made a saved review look like it never went through.
function RatingForm({ classSessionId, existingReview, onReviewed }) {
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
      <span className="text-brand-teal font-bold">{t('dashboard.reviewSubmitted')}</span>
      <Stars rating={existingReview.rating} />
      {existingReview.comment && <span className="text-navy/50 italic truncate">"{existingReview.comment}"</span>}
    </div>
  )

  return (
    <div className="mt-3 bg-cream rounded-xl p-4 border-2 border-navy/10">
      <p className="text-sm font-bold text-navy mb-2">{t('dashboard.rateThisClass')}</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map(star => (
          <button key={star} type="button" onClick={() => setRating(star)}
            className={`text-2xl transition-colors ${rating >= star ? 'text-brand-yellow' : 'text-navy/20'}`}>
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

export default function Dashboard() {
  const router = useRouter()
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [credits, setCredits] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [teachingClasses, setTeachingClasses] = useState([])
  const [reporting, setReporting] = useState(false)
  const [reportCode, setReportCode] = useState('')
  const [reportFiles, setReportFiles] = useState([])
  const [reportCategory, setReportCategory] = useState('harassment')
  const [reportReason, setReportReason] = useState('')
  const [reportState, setReportState] = useState('')
  const [confirming, setConfirming] = useState(null)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)
  const [editingClassId, setEditingClassId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', description: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [cancellingClassId, setCancellingClassId] = useState(null)
  const [cancellingEnrollmentId, setCancellingEnrollmentId] = useState(null)
  const [myReviews, setMyReviews] = useState([])
  const [tab, setTab] = useState('enrolled')
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const parsedUser = JSON.parse(stored)
    setUser(parsedUser)
    fetchCredits()
    fetchTransactions()
    fetchEnrollments()
    fetchMyReviews()
    fetchTeachingClasses(parsedUser.id)
    // The cached localStorage user only carries what login returned, so the
    // public profile is fetched fresh — it's the same data a stranger sees
    // on /teachers/:id, which is exactly what the nudge below is about.
    fetch(`${API}/api/users/${parsedUser.id}`)
      .then(r => r.json()).then(setProfile).catch(() => {})
  }, [])

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

  const fetchCredits = () => {
    fetch(`${API}/api/credits`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setCredits(data?.balance ?? 0))
  }

  const fetchTransactions = () => {
    fetch(`${API}/api/credits/transactions`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setTransactions(Array.isArray(data) ? data : []))
  }

  const fetchEnrollments = () => {
    fetch(`${API}/api/enrollments`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setEnrollments(Array.isArray(data) ? data : []))
  }

  const fetchMyReviews = () => {
    fetch(`${API}/api/reviews/mine`, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => setMyReviews(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  const submitReport = async () => {
    if (!reportCode.trim() || !reportReason.trim()) return
    setReportState('sending')
    try {
      const res = await fetch(`${API}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          report_type: 'user',
          reported_code: reportCode.trim(),
          category: reportCategory,
          reason: reportReason.trim(),
          evidence: reportFiles
        })
      })
      if (res.ok) {
        setReportState('sent')
        setReportReason(''); setReportCode(''); setReportFiles([])
        return
      }
      const data = await res.json().catch(() => ({}))
      setReportState(data.error || t('teacher.reportFailed'))
    } catch (e) {
      setReportState(t('teacher.reportFailed'))
    }
  }

  // Screenshots or PDFs, read to data URLs and posted as JSON — the same
  // shape avatars and class materials already use, so the browser never
  // holds a Supabase key.
  const attachEvidence = async event => {
    const files = [...event.target.files].slice(0, 3 - reportFiles.length)
    if (!files.length) return
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setReportState(t('teacher.reportEvidenceTooBig'))
        return
      }
    }
    const encoded = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })))
    setReportFiles(current => [...current, ...encoded].slice(0, 3))
  }

  const fetchTeachingClasses = (teacherId) => {
    fetch(`${API}/api/classes?teacher_id=${teacherId}`)
      .then(res => res.json())
      .then(data => setTeachingClasses(Array.isArray(data) ? data : []))
  }

  const startEditClass = (cls) => {
    setEditingClassId(cls.id)
    setEditForm({ title: cls.title || '', description: cls.description || '' })
  }

  const saveEditClass = async (classId) => {
    setSavingEdit(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/classes/${classId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })
      const data = await res.json()
      if (res.ok) {
        setEditingClassId(null)
        fetchTeachingClasses(user.id)
      } else {
        setMessage(data.error || 'dashboard.errorEditClass')
        setMessageOk(false)
      }
    } catch (e) {
      setMessage('common.connectionError')
      setMessageOk(false)
    }
    setSavingEdit(false)
  }

  const cancelTeachingClass = async (classId) => {
    if (!window.confirm(t('dashboard.cancelClassConfirm'))) return
    setCancellingClassId(classId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/classes/${classId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('dashboard.classCancelledMsg')
        setMessageOk(true)
        fetchTeachingClasses(user.id)
      } else {
        setMessage(data.error || 'dashboard.errorCancelClass')
        setMessageOk(false)
      }
    } catch (e) {
      setMessage('common.connectionError')
      setMessageOk(false)
    }
    setCancellingClassId(null)
  }

  const cancelEnrollment = async (enrollment, willRefund) => {
    const confirmMsg = willRefund ? t('dashboard.cancelEnrollConfirmRefund') : t('dashboard.cancelEnrollConfirmNoRefund')
    if (!window.confirm(confirmMsg)) return
    setCancellingEnrollmentId(enrollment.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/enrollments/${enrollment.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(data.refunded ? t('dashboard.enrollCancelledRefunded') : t('dashboard.enrollCancelledNoRefund'))
        setMessageOk(true)
        fetchEnrollments()
        fetchCredits()
        if (data.refunded) window.dispatchEvent(new Event('credits-changed'))
      } else {
        setMessage(data.error || 'dashboard.errorCancelEnroll')
        setMessageOk(false)
      }
    } catch (e) {
      setMessage('common.connectionError')
      setMessageOk(false)
    }
    setCancellingEnrollmentId(null)
  }

  const confirmAttendance = async (enrollmentId) => {
    setConfirming(enrollmentId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/enrollments/${enrollmentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })
      if (res.ok) {
        setMessage('dashboard.attendanceConfirmed')
        setMessageOk(true)
        fetchEnrollments()
        fetchCredits()
        fetchTransactions()
      } else {
        const data = await res.json()
        setMessage(data.error || 'dashboard.errorConfirmAttendance')
        setMessageOk(false)
      }
    } catch (e) {
      setMessage('common.connectionError')
      setMessageOk(false)
    }
    setConfirming(null)
  }

  // Whichever class — teaching or attending — is live right now, if any.
  // Teaching checked first: if a teacher is also enrolled as a student
  // somewhere (unusual, but not prevented), the class they're expected to
  // run is the more urgent one to surface.
  const liveTeaching = teachingClasses.find(cls => sessionTiming(cls.class_sessions?.[0], cls.duration_minutes).isLive)
  const liveEnrollment = enrollments.find(e => sessionTiming(e.class_sessions, e.class_sessions?.classes?.duration_minutes).isLive)
  const live = liveTeaching
    ? { role: 'teaching', title: liveTeaching.title, sessionId: liveTeaching.class_sessions?.[0]?.id }
    : liveEnrollment
      ? { role: 'attending', title: liveEnrollment.class_sessions?.classes?.title, sessionId: liveEnrollment.class_session_id }
      : null

  // Same upcoming/past split the teacher profile and /history already use.
  // Everything was in one undivided list, so a class from last month sat
  // between two you still have to show up for.
  const isEnrollmentOver = (e) => sessionTiming(e.class_sessions, e.class_sessions?.classes?.duration_minutes).isClassOver
  const upcomingEnrollments = enrollments.filter(e => !isEnrollmentOver(e))
  const pastEnrollments = enrollments.filter(isEnrollmentOver)

  const isTeachingOver = (c) => sessionTiming(c.class_sessions?.[0], c.duration_minutes).isClassOver
  const upcomingTeaching = teachingClasses.filter(c => !isTeachingOver(c))
  const pastTeaching = teachingClasses.filter(isTeachingOver)

  const reviewFor = (sessionId) => myReviews.find(r => r.class_session_id === sessionId)

  // Exactly the fields that render on /teachers/:id. Anything blank here is a
  // blank space a student sees while deciding whether to book you, and until
  // now nothing in the app told you it was blank. No dismiss button on
  // purpose: filling the field is what makes this go away.
  const missingProfileFields = profile ? [
    !profile.photo_url && 'profile.profilePhoto',
    !profile.bio?.trim() && 'profile.bio',
    !profile.nationality?.trim() && 'auth.nationality'
  ].filter(Boolean) : []

  if (!user) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('common.loading')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-display font-extrabold text-2xl md:text-3xl text-navy mb-2">
          {t('dashboard.welcomeBack', { name: user.first_name })}
        </h1>
        <p className="text-navy/60 mb-8">{t('dashboard.accountOverview')}</p>

        {/* Unmissable on purpose — a class in progress is time-sensitive in
            a way nothing else on this page is, so it sits above every other
            card rather than waiting inside the list further down. */}
        {live && (
          <a href={`/classroom/${live.sessionId}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-red-600 text-white rounded-2xl px-6 py-5 border-2 border-navy animate-pulse shadow-[0_0_24px_6px_rgba(220,38,38,0.5)] hover:bg-red-700 transition-colors">
            <div>
              <p className="flex items-center gap-2 font-extrabold text-sm tracking-wide uppercase mb-1">
                <span className="w-2.5 h-2.5 bg-white rounded-full" /> {t('dashboard.liveNow')}
              </p>
              <p className="font-display font-bold text-xl">{live.title}</p>
              <p className="text-white/80 text-sm">
                {live.role === 'teaching' ? t('dashboard.liveBannerTeaching') : t('dashboard.liveBannerAttending')}
              </p>
            </div>
            <span className="flex-shrink-0 bg-white text-red-600 font-extrabold px-6 py-3 rounded-full text-center">
              {live.role === 'teaching' ? t('dashboard.startClass') : t('dashboard.joinMeeting')}
            </span>
          </a>
        )}

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${
            messageOk
              ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
              : 'bg-brand-red/10 text-brand-red border-brand-red/30'
          }`}>
            {t(message)}
          </div>
        )}

        {missingProfileFields.length > 0 && (
          <a href="/profile"
            className="flex items-start gap-3 mb-6 bg-brand-yellow/10 border-2 border-brand-yellow rounded-2xl px-5 py-4 hover:bg-brand-yellow/20 transition-colors">
            <span className="text-xl leading-none mt-0.5">👋</span>
            <div>
              <p className="font-display font-bold text-navy">{t('dashboard.completeProfileTitle')}</p>
              <p className="text-navy/60 text-sm mt-0.5">
                {t('dashboard.completeProfileNote', {
                  fields: missingProfileFields.map(k => t(k)).join(', ')
                })}
              </p>
            </div>
          </a>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
          <div className="bg-white rounded-2xl p-6 border-2 border-navy">
            <p className="text-navy/60 text-sm mb-1 font-medium">{t('dashboard.creditBalance')}</p>
            <p className="font-display font-extrabold text-5xl text-brand-red">{credits ?? '...'}</p>
            <p className="text-navy/40 text-sm mt-1">{t('dashboard.creditsAvailable')}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-navy">
            <p className="text-navy/60 text-sm mb-1 font-medium">{t('dashboard.classesJoined')}</p>
            <p className="font-display font-extrabold text-5xl text-brand-teal">{enrollments.length}</p>
            <p className="text-navy/40 text-sm mt-1">{t('dashboard.totalEnrollments')}</p>
          </div>
        </div>

        {/* The three lists were stacked one under the other, so reaching
            credit history meant scrolling past every class. One at a time,
            same pill tabs settings uses. */}
        {/* Sits in the tab row rather than in Quick actions: this is where
            the eye already is, and reporting is not a "quick action" you
            take on purpose — it is something you go looking for. */}
        <div className="flex flex-wrap items-start gap-2 mb-6">
          <div className="flex-1 min-w-0">
            <Tabs active={tab} onChange={setTab} tabs={[
              { key: 'enrolled', label: t('dashboard.myClasses') },
              { key: 'teaching', label: t('dashboard.classesTeaching') },
              { key: 'credits', label: t('dashboard.creditHistory') }
            ]} />
          </div>
          <button onClick={() => { setReporting(o => !o); setReportState('') }}
            className="px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap border-2 border-navy/20 bg-white text-navy/60 hover:border-brand-red hover:text-brand-red transition-colors">
            🚩 {t('dashboard.reportSomeone')}
          </button>
        </div>

        {reporting && (
          <div className="bg-white rounded-2xl p-6 border-2 border-brand-red/30 mb-6">
            {reportState === 'sent' ? (
              <p className="text-brand-teal text-sm font-bold">✅ {t('teacher.reportSent')}</p>
            ) : (
              <div className="space-y-3 max-w-xl">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy mb-1">{t('dashboard.reportCodeLabel')}</label>
                    <input value={reportCode} onChange={e => setReportCode(e.target.value)}
                      placeholder="U000012" maxLength={12}
                      className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm font-mono focus:border-brand-red focus:outline-none transition-colors"/>
                    <p className="text-navy/40 text-xs mt-1">{t('dashboard.reportCodeHint')}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy mb-1">{t('teacher.reportCategory')}</label>
                    <select value={reportCategory} onChange={e => setReportCategory(e.target.value)}
                      className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm focus:border-brand-red focus:outline-none transition-colors">
                      <option value="harassment">{t('teacher.reportCatHarassment')}</option>
                      <option value="inappropriate_content">{t('teacher.reportCatInappropriate')}</option>
                      <option value="spam_or_scam">{t('teacher.reportCatSpam')}</option>
                      <option value="no_show">{t('teacher.reportCatNoShow')}</option>
                      <option value="other">{t('teacher.reportCatOther')}</option>
                    </select>
                  </div>
                </div>
                <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} rows={3} maxLength={500}
                  placeholder={t('teacher.reportReasonPlaceholder')}
                  className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm focus:border-brand-red focus:outline-none transition-colors"/>
                <div>
                  <label className="block text-xs font-bold text-navy mb-1">{t('dashboard.reportAttach')}</label>
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple
                    onChange={attachEvidence} disabled={reportFiles.length >= 3}
                    className="text-xs text-navy/60 file:mr-3 file:rounded-full file:border-2 file:border-navy/20 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold"/>
                  {reportFiles.length > 0 && (
                    <p className="text-navy/50 text-xs mt-1">
                      {reportFiles.length} {t('dashboard.reportAttached')}
                      <button onClick={() => setReportFiles([])} className="ml-2 text-brand-red font-bold hover:underline">×</button>
                    </p>
                  )}
                </div>
                {reportState && reportState !== 'sending' && (
                  <p className="text-brand-red text-xs font-bold">{reportState}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setReporting(false)} className="text-navy/50 text-sm font-bold px-3 py-1.5">
                    {t('teacher.reportCancel')}
                  </button>
                  <button onClick={submitReport}
                    disabled={!reportCode.trim() || !reportReason.trim() || reportState === 'sending'}
                    className="bg-brand-red text-white px-4 py-1.5 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40">
                    {t('teacher.reportSubmit')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* My enrolled classes — upcoming first, finished ones below and
            muted, so what you still have to show up for reads first. */}
        {tab === 'enrolled' && (
          <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
            <h2 className="font-display font-bold text-navy mb-4">{t('dashboard.myClasses')}</h2>
            {enrollments.length === 0 && (
              <p className="text-navy/40 text-sm">{t('history.noneTaken')}</p>
            )}
            {[[upcomingEnrollments, 'teacher.upcomingClasses'], [pastEnrollments, 'dashboard.pastClassesTaken']].map(([group, heading]) => group.length > 0 && (
            <div key={heading} className="mb-4 last:mb-0">
            <p className="text-navy/40 text-xs font-bold uppercase tracking-wide mb-1">{t(heading)}</p>
            <div className="space-y-1">
              {group.map(enrollment => {
                const session = enrollment.class_sessions
                const cls = session?.classes
                const { scheduledAt, isClassOver, isLive } = sessionTiming(session, cls?.duration_minutes)

                return (
                  <div key={enrollment.id} className="py-4 border-b border-navy/10 last:border-0">
                    {isLive && enrollment.status !== 'cancelled' && (
                      <a href={`/classroom/${enrollment.class_session_id}`}
                        className="flex items-center justify-center gap-2 mb-3 bg-red-600 text-white font-extrabold text-sm tracking-wide px-4 py-2 rounded-xl animate-pulse shadow-[0_0_16px_4px_rgba(220,38,38,0.55)] hover:bg-red-700 transition-colors">
                        <span className="w-2 h-2 bg-white rounded-full" /> {t('dashboard.liveNow')} · {t('dashboard.joinMeeting')}
                      </a>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-navy text-sm font-bold">
                          {cls?.title || 'Class'}
                        </p>
                        {/* Reporting is about a person, so this points at the
                            teacher's profile, where the form with categories
                            and evidence already lives. */}
                        {cls?.teacher?.id && (
                          <a href={`/teachers/${cls.teacher.id}`}
                            className="text-navy/40 hover:text-brand-red text-xs font-medium transition-colors">
                            🚩 {t('teacher.report')} · {cls.teacher.first_name} {cls.teacher.last_name}
                          </a>
                        )}
                        <p className="text-navy/40 text-xs mt-0.5">
                          {scheduledAt
                            ? formatInTimezone(scheduledAt, user.timezone, user.time_format)
                            : t('dashboard.noTimeSet')}
                          {' · '}
                          {enrollment.status === 'cancelled'
                            ? t('history.cancelled')
                            : enrollment.status === 'attended'
                              ? t('dashboard.attended')
                              : isClassOver
                                ? t('dashboard.classEndedConfirm')
                                : isLive
                                  ? t('dashboard.liveNow')
                                  : t('dashboard.upcoming')}
                        </p>
                      </div>
                      <div>
                        {enrollment.status !== 'attended' && enrollment.status !== 'cancelled' && isClassOver && (
                          <button
                            onClick={() => confirmAttendance(enrollment.id)}
                            disabled={confirming === enrollment.id}
                            className="bg-brand-teal text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:opacity-90 disabled:opacity-50 transition-opacity">
                            {confirming === enrollment.id ? t('dashboard.confirming') : t('dashboard.confirmAttendance')}
                          </button>
                        )}
                        {enrollment.status !== 'attended' && enrollment.status !== 'cancelled' && !isClassOver && (
                          <button
                            onClick={() => cancelEnrollment(enrollment, scheduledAt && (scheduledAt.getTime() - Date.now() >= 24 * 60 * 60 * 1000))}
                            disabled={cancellingEnrollmentId === enrollment.id}
                            className="text-brand-red text-sm font-bold hover:underline disabled:opacity-50">
                            {cancellingEnrollmentId === enrollment.id ? t('dashboard.cancelling') : t('dashboard.cancelClass')}
                          </button>
                        )}
                        {enrollment.status === 'attended' && (
                          <span className="bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full text-xs font-bold border-2 border-brand-teal/30">
                            {t('dashboard.confirmed')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating form - shows after confirming attendance */}
                    {enrollment.status === 'attended' && (
                      <RatingForm classSessionId={enrollment.class_session_id}
                        existingReview={reviewFor(enrollment.class_session_id)}
                        onReviewed={r => setMyReviews(rs => [...rs, r])} />
                    )}
                  </div>
                )
              })}
            </div>
            </div>
            ))}
          </div>
        )}

        {/* Classes I'm teaching — same upcoming/finished split as above. */}
        {tab === 'teaching' && (
          <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
            <h2 className="font-display font-bold text-navy mb-4">{t('dashboard.classesTeaching')}</h2>
            {teachingClasses.length === 0 && (
              <p className="text-navy/40 text-sm">{t('history.noneTaught')}</p>
            )}
            {[[upcomingTeaching, 'teacher.upcomingClasses'], [pastTeaching, 'teacher.pastClasses']].map(([group, heading]) => group.length > 0 && (
            <div key={heading} className="mb-4 last:mb-0">
            <p className="text-navy/40 text-xs font-bold uppercase tracking-wide mb-1">{t(heading)}</p>
            <div className="space-y-1">
              {group.map(cls => {
                const session = cls.class_sessions?.[0]
                const { scheduledAt, isClassOver, isLive, canJoin } = sessionTiming(session, cls.duration_minutes, true)

                return (
                  <div key={cls.id} className="py-4 border-b border-navy/10 last:border-0">
                    {canJoin && session && (
                      <a href={`/classroom/${session.id}`}
                        className={`flex items-center justify-center gap-2 mb-3 font-extrabold text-sm tracking-wide px-4 py-2 rounded-xl transition-colors ${isLive
                          ? 'bg-red-600 text-white animate-pulse shadow-[0_0_16px_4px_rgba(220,38,38,0.55)] hover:bg-red-700'
                          : 'bg-navy text-white hover:opacity-90'}`}>
                        {isLive
                          ? <><span className="w-2 h-2 bg-white rounded-full" /> {t('dashboard.liveNow')} · {t('dashboard.startClass')}</>
                          : t('dashboard.openClassroomEarly')}
                      </a>
                    )}
                    {editingClassId === cls.id ? (
                      <div className="bg-cream rounded-xl p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-navy mb-1">{t('dashboard.editTitleLabel')}</label>
                          <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm focus:border-brand-red focus:outline-none transition-colors"/>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-navy mb-1">{t('dashboard.editDescriptionLabel')}</label>
                          <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                            rows={2}
                            className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm resize-none focus:border-brand-red focus:outline-none transition-colors"/>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEditClass(cls.id)} disabled={savingEdit}
                            className="bg-brand-red text-white px-4 py-1.5 rounded-full text-xs font-bold border-2 border-navy disabled:opacity-50">
                            {savingEdit ? t('dashboard.savingChanges') : t('dashboard.saveChanges')}
                          </button>
                          <button onClick={() => setEditingClassId(null)}
                            className="border-2 border-navy/20 text-navy px-4 py-1.5 rounded-full text-xs font-bold">
                            {t('dashboard.discardEdit')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-navy text-sm font-bold">{cls.title}</p>
                          <p className="text-navy/40 text-xs mt-0.5">
                            {scheduledAt ? formatInTimezone(scheduledAt, user.timezone, user.time_format) : t('dashboard.noTimeSet')}
                          </p>
                        </div>
                        {isClassOver ? (
                          <span className="text-navy/40 text-sm">{t('dashboard.ended')}</span>
                        ) : (
                          <div className="flex gap-2 flex-shrink-0 ml-4">
                            <button onClick={() => startEditClass(cls)}
                              className="border-2 border-navy/20 text-navy px-3 py-1.5 rounded-full text-xs font-bold hover:border-navy/40">
                              {t('dashboard.edit')}
                            </button>
                            <button onClick={() => cancelTeachingClass(cls.id)} disabled={cancellingClassId === cls.id}
                              className="border-2 border-brand-red/30 text-brand-red px-3 py-1.5 rounded-full text-xs font-bold hover:border-brand-red disabled:opacity-50">
                              {cancellingClassId === cls.id ? t('dashboard.cancelling') : t('dashboard.cancelClass')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            </div>
            ))}
          </div>
        )}

        {/* Credit history */}
        {tab === 'credits' && (
        <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
          <h2 className="font-display font-bold text-navy mb-4">{t('dashboard.creditHistory')}</h2>
          {transactions.length === 0 ? (
            <p className="text-navy/40 text-sm">{t('dashboard.noTransactionsYet')}</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-navy/10 last:border-0">
                  <div>
                    <p className="text-navy text-sm font-medium">{tx.description}</p>
                    <p className="text-navy/40 text-xs">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={tx.amount > 0
                    ? 'text-brand-teal font-bold'
                    : 'text-brand-red font-bold'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Quick actions */}
        <div className="bg-white rounded-2xl p-6 border-2 border-navy">
          <h2 className="font-display font-bold text-navy mb-4">{t('dashboard.quickActions')}</h2>
          <div className="flex gap-4 flex-wrap">
            <a href="/classes"
              className="bg-brand-red text-white px-6 py-3 rounded-full text-sm font-bold border-2 border-navy">
              {t('common.explore')}
            </a>
            <a href="/classes/create"
              className="border-2 border-navy text-navy px-6 py-3 rounded-full text-sm font-bold hover:bg-navy hover:text-white transition-colors">
              {t('dashboard.createAClass')}
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
