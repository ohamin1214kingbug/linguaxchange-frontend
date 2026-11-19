'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'
import RatingForm from '../../components/RatingForm'
import { formatInTimezone, asUtcDate } from '../../lib/timezone'
import { downloadClassIcs } from '../../lib/calendar'
import FirstClassChecklist from '../../components/FirstClassChecklist'
import InviteCard from '../../components/InviteCard'
import Panel from '../../components/Panel'
import ChatList, { useChats } from '../../components/ChatsPanel'
import SurveyCard from '../../components/SurveyCard'
import TandemCard from '../../components/TandemCard'
import ShareClass from '../../components/ShareClass'
import TeachNudge from '../../components/TeachNudge'
import ClassCard, { nextSession } from '../../components/ClassCard'
import { isUnread } from '../../lib/chatSeen'
import { nextSessionDate, hasFinished } from '../../lib/classSchedule'
import { LANGUAGE_COLORS, levelLabel } from '../../lib/languages'

const API = ''

// Was computed inline, separately, in both the enrolled-classes list and the
// teaching-classes list. A third caller (the live-class banner below) is
// what made copying it a third time worth stopping to share instead.
// `canJoin` mirrors utils/classroomAccess.js on the backend, which is what
// actually enforces this: the room needs a token, and the server refuses to
// mint one outside the window. Kept in step here so the link never appears
// on a door the server will hold shut.
const TEACHER_EARLY_MS = 10 * 60 * 1000

// The rules a new member otherwise only learns by running into them. The
// numbers are the backend's: SIGNUP_CREDIT_GRANT (routes/auth.js),
// REFUND_CUTOFF_MS (utils/enrollmentCancel.js), REQUEST_TTL_HOURS
// (utils/classRequests.js) — change the copy if those change. Remembered per
// browser: once dismissed it stays gone, unlike the navbar's banana panel,
// because this one is a paragraph of reading rather than a single line.
const WELCOME_DISMISSED_KEY = 'welcomeCardDismissed'
// Every way a balance moves, in the order a new member meets them. Bananas
// can't be bought: teaching (enrollments.js payout) and writing feedback
// (utils/assignmentCredits.js) are the only ways to earn.
const BANANA_CYCLE = [
  ['🍌', 'dashboard.bananaCycleStart'],
  ['📚', 'dashboard.bananaCycleSpend'],
  ['🎓', 'dashboard.bananaCycleEarn']
]
const WELCOME_POINTS = [
  ['↩️', 'dashboard.welcomeCancel'],
  ['🙋', 'dashboard.welcomeRequest'],
  ['🧑‍🏫', 'dashboard.welcomeTeach']
]

const MODE_KEY = 'dashboardMode'
const FLAGS = { KO: '🇰🇷', ES: '🇪🇸', DE: '🇩🇪', EN: '🇬🇧', PT: '🇧🇷', FR: '🇫🇷', IT: '🇮🇹' }
const PILL = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors'
const PRIMARY = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-white bg-brand-red hover:bg-brand-red-dark transition-colors'

// "in 2 h 15 min" for the next-class cards. Coarse on purpose: past a day
// the minutes are noise.
function countdown(date, t, now = new Date()) {
  const mins = Math.max(0, Math.round((date - now) / 60000))
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60
  const parts = d > 0
    ? [t('dashboard.durDays', { n: d }), h > 0 && t('dashboard.durHours', { n: h })]
    : [h > 0 && t('dashboard.durHours', { n: h }), (h === 0 || m > 0) && t('dashboard.durMinutes', { n: m })]
  return t('dashboard.inTime', { time: parts.filter(Boolean).join(' ') })
}

// "12 min" / "1 h 5 min" since the class started.
function elapsed(date, t, now = new Date()) {
  const mins = Math.max(0, Math.round((now - date) / 60000))
  const h = Math.floor(mins / 60), m = mins % 60
  return [h > 0 && t('dashboard.durHours', { n: h }), (h === 0 || m > 0) && t('dashboard.durMinutes', { n: m })].filter(Boolean).join(' ')
}

const isThisMonth = (date, now = new Date()) =>
  date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()

const startedWithinDays = (date, days, now = new Date()) =>
  Boolean(date) && now - date < days * 24 * 60 * 60 * 1000

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
  const [profile, setProfile] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [reviewingId, setReviewingId] = useState(null)
  // The member's own choice of mode; null until they pick, then remembered.
  const [modeChoice, setModeChoice] = useState(null)
  const chats = useChats()
  const [publicClasses, setPublicClasses] = useState([])
  const [requests, setRequests] = useState([])
  const [ratingQueue, setRatingQueue] = useState([])
  // Class rosters by class id: the live class and the next one taught.
  const [rosters, setRosters] = useState({})
  const [showAllTx, setShowAllTx] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const parsedUser = JSON.parse(stored)
    setUser(parsedUser)
    setShowWelcome(!localStorage.getItem(WELCOME_DISMISSED_KEY))
    try { setModeChoice(localStorage.getItem(MODE_KEY)) } catch (e) {}
    // /dashboard#report (the My reports page's button) opens the report form.
    if (window.location.hash === '#report') setReporting(true)
    fetch(`${API}/api/classes`).then(r => r.json())
      .then(d => setPublicClasses(Array.isArray(d) ? d : [])).catch(() => {})
    fetchCredits()
    fetchTransactions()
    fetchEnrollments()
    fetchMyReviews()
    fetchTeachingClasses(parsedUser.id)
    // The cached localStorage user only carries what login returned, so the
    // public profile is fetched fresh — it's the same data a stranger sees
    // on /teachers/:id, which is exactly what the nudge below is about.
    fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(p => {
        // Google sign-ups skip the form that asks for languages; nothing can
        // be matched without them, so they finish the welcome steps first.
        if (p?.id && (!p.teach_language?.trim() || !(p.learn_languages || []).some(Boolean))) {
          router.replace('/welcome')
          return
        }
        setProfile(p)
      }).catch(() => {})
  }, [])

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })

  // Open requests in the language this member teaches.
  useEffect(() => {
    if (!profile?.teach_language) return
    fetch(`${API}/api/class-requests?language_code=${profile.teach_language}`)
      .then(r => r.json())
      .then(d => setRequests(Array.isArray(d) ? d.filter(r => r.student?.id !== profile.id) : []))
      .catch(() => {})
  }, [profile?.teach_language, profile?.id])

  // Sessions taught in the last 14 days with students still unrated. One
  // request per session; a teacher has a handful at most.
  // ponytail: per-session requests; add a "pending feedback" endpoint if a
  // teacher ever runs dozens of classes a fortnight.
  useEffect(() => {
    const recentSessions = teachingClasses.flatMap(cls => (cls.class_sessions || [])
      .filter(s => s.status !== 'cancelled' && hasFinished(s.session_date, cls.duration_minutes)
        && startedWithinDays(asUtcDate(s.session_date), 14))
      .map(s => ({ ...s, cls })))
    if (!recentSessions.length) return
    Promise.all(recentSessions.map(s =>
      fetch(`${API}/api/student-feedback/session/${s.id}`, { headers: authHeaders() })
        .then(r => r.json())
        .then(rows => ({ ...s, waiting: Array.isArray(rows) ? rows.filter(r => !r.feedback).length : 0 }))
        .catch(() => ({ ...s, waiting: 0 }))))
      .then(list => setRatingQueue(list.filter(s => s.waiting > 0)))
  }, [teachingClasses])

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
  // Every session is checked, not only the first: a recurring class's first
  // session is usually long past.
  const liveTeaching = teachingClasses.flatMap(cls => (cls.class_sessions || [])
    .filter(s => s.status !== 'cancelled' && sessionTiming(s, cls.duration_minutes).isLive)
    .map(session => ({ cls, session })))[0]
  const liveEnrollment = enrollments.find(e => e.status !== 'cancelled'
    && sessionTiming(e.class_sessions, e.class_sessions?.classes?.duration_minutes).isLive)
  const live = liveTeaching
    ? { role: 'teaching', cls: liveTeaching.cls, sessionId: liveTeaching.session.id, at: asUtcDate(liveTeaching.session.session_date) }
    : liveEnrollment
      ? { role: 'attending', cls: liveEnrollment.class_sessions.classes, sessionId: liveEnrollment.class_session_id,
          at: asUtcDate(liveEnrollment.class_sessions.session_date), classmates: liveEnrollment.class_sessions.classmates || [] }
      : null

  // Same upcoming/past split the teacher profile and /history already use.
  // Everything was in one undivided list, so a class from last month sat
  // between two you still have to show up for.
  const isEnrollmentOver = (e) => sessionTiming(e.class_sessions, e.class_sessions?.classes?.duration_minutes).isClassOver
  const upcomingEnrollments = enrollments.filter(e => !isEnrollmentOver(e))

  // Over only when every session that isn't cancelled has ended. It used to
  // look at the first session alone, so a weekly class vanished from the
  // teaching panels once its first week had passed.
  const isTeachingOver = (c) => (c.class_sessions || [])
    .filter(s => s.status !== 'cancelled')
    .every(s => hasFinished(s.session_date, c.duration_minutes))
  const upcomingTeaching = teachingClasses.filter(c => !isTeachingOver(c))

  const reviewFor = (sessionId) => myReviews.find(r => r.class_session_id === sessionId)

  // What the member owes after a class: confirming they attended (pays the
  // teacher now rather than after 72h) and then a review. Both used to sit
  // inside the class list below, easy to scroll past. Only classes from the
  // last 14 days, so an old one cannot nag forever.
  const recent = enrollments.filter(e => {
    const { scheduledAt, isClassOver } = sessionTiming(e.class_sessions, e.class_sessions?.classes?.duration_minutes)
    return isClassOver && startedWithinDays(scheduledAt, 14)
  })
  const todos = [
    ...recent.filter(e => e.status === 'confirmed').map(e => ({ kind: 'confirm', e })),
    ...recent.filter(e => e.status === 'attended' && !reviewFor(e.class_session_id)).map(e => ({ kind: 'review', e })),
  ]

  // The class you are going to next, as a student.
  // The live one is shown in its own card above, so this is the one after it.
  const nextLearn = upcomingEnrollments
    .filter(e => e.status !== 'cancelled' && e.class_sessions?.session_date && e.class_session_id !== live?.sessionId)
    .sort((a, b) => asUtcDate(a.class_sessions.session_date) - asUtcDate(b.class_sessions.session_date))[0]

  // The session you teach next: the soonest future session of any class.
  // The class taught most recently, for "Teach it again" when nothing is
  // scheduled.
  const lastTaught = teachingClasses
    .filter(c => c.status === 'approved' || c.status === 'completed')
    .map(c => ({ c, last: Math.max(0, ...(c.class_sessions || []).map(s => asUtcDate(s.session_date).getTime())) }))
    .sort((a, b) => b.last - a.last)[0]?.c
  const nextTeach = upcomingTeaching
    .map(cls => ({ cls, at: nextSessionDate(cls) }))
    .filter(x => x.at)
    .sort((a, b) => a.at - b.at)[0]
  const nextTeachSession = nextTeach && nextTeach.cls.class_sessions
    .find(s => asUtcDate(s.session_date).getTime() === nextTeach.at.getTime())

  // Upcoming public classes in a language this member learns, at their
  // level where they gave one. Not their own, not ones already booked.
  const bookedSessions = new Set(enrollments.map(e => e.class_session_id))
  const forYou = publicClasses.filter(cls => {
    const learning = profile?.learn_languages || []
    if (!learning.includes(cls.language_code) || cls.teacher_id === user?.id) return false
    const level = profile?.learn_details?.[cls.language_code]?.level
    if (level && cls.level !== level) return false
    const next = nextSessionDate(cls)
    return next && !(cls.class_sessions || []).some(s => bookedSessions.has(s.id))
  }).slice(0, 4)

  const earnedThisMonth = transactions
    .filter(tx => tx.type === 'earned' && isThisMonth(new Date(tx.created_at)))
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Default mode: teaching only for someone who teaches and is not booked
  // into anything; everyone else starts on learning.
  const mode = modeChoice || (upcomingTeaching.length > 0 && upcomingEnrollments.length === 0 ? 'teaching' : 'learning')
  const unreadChats = (chats || []).filter(isUnread).length
  const pickMode = m => { setModeChoice(m); try { localStorage.setItem(MODE_KEY, m) } catch (e) {} }
  const ratingsWaiting = ratingQueue.reduce((sum, s) => sum + s.waiting, 0)

  // Exactly the fields that render on /teachers/:id. Anything blank here is a
  // blank space a student sees while deciding whether to book you, and until
  // now nothing in the app told you it was blank. No dismiss button on
  // purpose: filling the field is what makes this go away.
  const missingProfileFields = profile ? [
    !profile.photo_url && 'profile.profilePhoto',
    !profile.bio?.trim() && 'profile.bio',
    !profile.nationality?.trim() && 'auth.nationality'
  ].filter(Boolean) : []

  // Rosters for the class being taught live and the next one; each fetched once.
  const liveTeachId = live?.role === 'teaching' ? live.cls.id : null
  useEffect(() => {
    for (const id of [liveTeachId, nextTeach?.cls.id]) {
      if (!id) continue
      fetch(`${API}/api/classes/${id}/roster`, { headers: authHeaders() })
        .then(r => r.json()).then(d => d?.sessions && setRosters(m => ({ ...m, [id]: d }))).catch(() => {})
    }
  }, [liveTeachId, nextTeach?.cls.id])
  const studentsFor = (classId, sessionId) => (rosters[classId]?.sessions?.find(x => x.id === sessionId)?.students || [])
    .filter(st => st.status !== 'cancelled')
  const nextStudents = studentsFor(nextTeach?.cls.id, nextTeachSession?.id)
  const liveStudents = live?.role === 'teaching' ? studentsFor(live.cls.id, live.sessionId) : []

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1')
    setShowWelcome(false)
  }

  if (!user) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/65 font-medium">{t('common.loading')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-navy">
            {t('dashboard.welcomeBack', { name: user.first_name })}
          </h1>
          <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setReporting(o => !o); setReportState('') }}
            className="px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap border-2 border-navy/20 bg-white text-navy/65 hover:border-brand-red hover:text-brand-red transition-colors">
            🚩 {t('dashboard.reportSomeone')}
          </button>
          <Link href="/reports"
            className="px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap border-2 border-navy/20 bg-white text-navy/65 hover:border-navy hover:text-navy transition-colors">
            📋 {t('myReports.title')}
          </Link>
          </div>
        </div>

        <SurveyCard />
        <TandemCard />

        {/* Two modes, each showing only what that role needs, plus the chats
            for both. The badge is what is waiting in each, so nothing hides
            behind a tab. */}
        <div role="tablist" className="inline-flex border-2 border-navy rounded-full overflow-hidden mb-6 bg-white">
          {[['learning', 'dashboard.modeLearning', todos.length], ['teaching', 'dashboard.modeTeaching', ratingsWaiting], ['chats', 'dashboard.modeChats', unreadChats]].map(([key, label, badge]) => (
            <button key={key} role="tab" aria-selected={mode === key} onClick={() => pickMode(key)}
              className={`px-3 sm:px-5 py-2 text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-colors ${mode === key ? 'bg-navy text-white' : 'text-navy hover:bg-cream'}`}>
              {t(label)}
              {badge > 0 && <span className="bg-brand-red text-white text-xs rounded-full min-w-5 h-5 px-1.5 inline-flex items-center justify-center">{badge}</span>}
            </button>
          ))}
        </div>

        {/* A live class keeps its details: who is in it, the PDF and the notes.
            It used to shrink to a red "Start class" bar exactly when the
            teacher needed to see who had booked. */}
        {live && (() => {
          const cls = live.cls
          const teaching = live.role === 'teaching'
          const people = teaching ? liveStudents : live.classmates
          const end = new Date(live.at.getTime() + (cls.duration_minutes || 60) * 60000)
          const timeOnly = date => new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone: user.timezone || undefined,
            hour12: user.time_format ? user.time_format === '12h' : undefined }).format(date)
          return (
            <section className="mb-6 bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] overflow-hidden">
              <div className="bg-brand-red text-white px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" aria-hidden="true"/>
                    {t('dashboard.liveSince', { time: elapsed(live.at, t) })} · {t('dashboard.liveEnds', { time: timeOnly(end) })}
                  </p>
                  <p className="font-display font-extrabold text-2xl leading-tight mt-1 break-words">{FLAGS[cls.language_code] || ''} {cls.title}</p>
                </div>
                <a href={`/classroom/${live.sessionId}`} className="shrink-0 bg-white text-brand-red font-extrabold px-5 py-2.5 rounded-full border-2 border-navy hover:bg-cream transition-colors">
                  {teaching ? t('dashboard.startClass') : t('dashboard.joinMeeting')}
                </a>
              </div>
              <div className="grid md:grid-cols-2 gap-5 p-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-navy/65 mb-2">
                    {teaching ? t('dashboard.liveStudents', { n: people.length, max: cls.max_students }) : t('dashboard.liveClassmates')}
                  </p>
                  {!teaching && cls.teacher && (
                    <p className="text-sm text-navy mb-2"><span className="text-navy/65">{t('dashboard.liveTeacherLabel')}:</span> <b>{cls.teacher.first_name} {cls.teacher.last_name || ''}</b></p>
                  )}
                  {people.length === 0
                    ? <p className="text-navy/65 text-sm">{teaching ? t('dashboard.noStudentsYetShare') : t('history.onlyYou')}</p>
                    : <ul>{people.map(p => {
                        const detail = p.learn_details?.[cls.language_code]
                        return (
                          <li key={p.id} className="flex items-center gap-2 py-1.5 border-b border-navy/10 last:border-0 flex-wrap">
                            <b className="text-navy text-sm">{p.first_name}</b>
                            {detail?.level && <span className="text-xs font-bold border-2 border-navy rounded-full px-2 bg-brand-blue/15">{levelLabel(cls.language_code, detail.level, t)}</span>}
                            {p.joined && <span className="text-brand-teal-dark text-xs font-bold ml-auto">● {t('classDetail.inRoom')}</span>}
                            {detail?.note && <span className="text-navy/65 text-xs basis-full">“{detail.note}”</span>}
                          </li>
                        )
                      })}</ul>}
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-navy/65 mb-2">{t('dashboard.lessonMaterial')}</p>
                  <div className="flex flex-wrap gap-2">
                    {cls.lesson_plan_url && <a href={cls.lesson_plan_url} target="_blank" rel="noopener" className={PRIMARY}>📄 {t('dashboard.openPdf')}</a>}
                    <a href={`/classes/${cls.id}`} className={PILL}>{t('dashboard.classPage')}</a>
                    <a href={`/chat/${live.sessionId}`} className={PILL}>{t('chat.open')}</a>
                  </div>
                  {cls.materials ? (<>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-navy/65 mt-3 mb-1">{teaching ? t('dashboard.yourNotes') : t('dashboard.teacherNotes')}</p>
                    <p className="bg-cream rounded-xl px-3 py-2 text-sm text-navy whitespace-pre-line break-words">{cls.materials}</p>
                  </>) : !cls.lesson_plan_url && <p className="text-navy/65 text-sm mt-2">{t('dashboard.noMaterial')}</p>}
                </div>
              </div>
            </section>
          )
        })()}

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${
            messageOk
              ? 'bg-brand-teal/10 text-brand-teal-dark border-brand-teal/30'
              : 'bg-brand-red/10 text-brand-red border-brand-red/30'
          }`}>
            {t(message)}
          </div>
        )}

        {reporting && (
          <div className="bg-white rounded-2xl p-6 border-2 border-brand-red/30 mb-6">
            {reportState === 'sent' ? (
              <p className="text-brand-teal-dark text-sm font-bold">✅ {t('teacher.reportSent')}</p>
            ) : (
              <div className="space-y-3 max-w-xl">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy mb-1">{t('dashboard.reportCodeLabel')}</label>
                    <input value={reportCode} onChange={e => setReportCode(e.target.value)}
                      placeholder={t('dashboard.reportCodePlaceholder')} maxLength={12}
                      className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm font-mono focus:border-brand-red focus:outline-none transition-colors"/>
                    <p className="text-navy/65 text-xs mt-1">{t('dashboard.reportCodeHint')}</p>
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
                    className="text-xs text-navy/65 file:mr-3 file:rounded-full file:border-2 file:border-navy/20 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold"/>
                  {reportFiles.length > 0 && (
                    <p className="text-navy/65 text-xs mt-1">
                      {reportFiles.length} {t('dashboard.reportAttached')}
                      <button onClick={() => setReportFiles([])} className="ml-2 text-brand-red font-bold hover:underline">×</button>
                    </p>
                  )}
                </div>
                {reportState && reportState !== 'sending' && (
                  <p className="text-brand-red text-xs font-bold">{reportState}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setReporting(false)} className="text-navy/65 text-sm font-bold px-3 py-1.5">
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

        {showWelcome && (
          <section className="mb-6 bg-white border-2 border-navy rounded-2xl px-5 py-5">
            <h2 className="font-display font-bold text-lg text-navy mb-3">{t('dashboard.welcomeTitle')}</h2>
            <h3 className="font-bold text-navy text-sm mb-2">{t('dashboard.bananaCycleTitle')}</h3>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              {BANANA_CYCLE.map(([icon, key], i) => (
                <li key={key} className="flex items-center gap-2 bg-brand-yellow/15 border-2 border-navy rounded-xl px-3 py-2 text-sm font-bold text-navy">
                  <span aria-hidden="true">{icon}</span>
                  <span>{i + 1}. {t(key)}</span>
                </li>
              ))}
            </ol>
            <p className="text-navy/65 text-sm mb-4">{t('dashboard.bananaCycleNote')}</p>
            <ul className="space-y-2 text-navy text-sm">
              {WELCOME_POINTS.map(([icon, key]) => (
                <li key={key} className="flex gap-3">
                  <span aria-hidden="true">{icon}</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3 mt-5">
              <Link href="/classes?tab=requests"
                className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
                {t('dashboard.welcomeCta')}
              </Link>
              <button onClick={dismissWelcome}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-navy border-2 border-navy hover:bg-navy/5 transition-colors">
                {t('dashboard.welcomeGotIt')}
              </button>
            </div>
          </section>
        )}


        {mode === 'chats' && <ChatList chats={chats} user={user} />}

        {mode === 'learning' && (<>
          {(() => {
            const cls = nextLearn?.class_sessions.classes
            const at = nextLearn && asUtcDate(nextLearn.class_sessions.session_date)
            const { canJoin } = sessionTiming(nextLearn?.class_sessions, cls?.duration_minutes)
            return (
              <Panel icon="⏰" tone="bg-brand-yellow" title={t('dashboard.nextClass')} open
                note={nextLearn ? `${cls?.title} · ${countdown(at, t)}` : t('dashboard.noUpcomingLearning')}>
                {nextLearn ? (
                <ClassCard cls={cls} session={nextLearn.class_sessions} user={user} countdown={countdown(at, t)}
                  showBar={false} status={`✓ ${t('classes.joined')}`} statusTone="text-brand-teal-dark font-bold"
                  actions={<>
                  {canJoin && <a href={`/classroom/${nextLearn.class_session_id}`} className={PRIMARY}>{t('dashboard.joinMeeting')}</a>}
                  <button type="button" className={PILL}
                    onClick={() => downloadClassIcs({ sessionId: nextLearn.class_session_id, title: cls?.title || 'Class', start: at, durationMinutes: cls?.duration_minutes })}>
                    {t('dashboard.addToCalendar')}
                  </button>
                  {cls?.id && <a href={`/classes/${cls.id}`} className={PILL}>{t('dashboard.classPage')}</a>}
                  <a href={`/chat/${nextLearn.class_session_id}`} className={PILL}>{t('chat.open')}</a>
                  </>}/>
                ) : (
                  <Link href="/classes" className={PRIMARY}>{t('common.explore')}</Link>
                )}
              </Panel>
            )
          })()}

        {todos.length > 0 && (
          <Panel id="todo" icon="✅" tone="bg-brand-green/40" title={t('dashboard.todoTitle', { n: todos.length })} badge={todos.length} open
            note={todos[0] && (todos[0].kind === 'confirm'
              ? t('dashboard.todoConfirm', { title: todos[0].e.class_sessions?.classes?.title || '' })
              : t('dashboard.todoReview', { title: todos[0].e.class_sessions?.classes?.title || '' }))}>
            <ul className="space-y-2">
              {todos.map(({ kind, e }) => {
                const title = e.class_sessions?.classes?.title || ''
                return (
                  <li key={`${kind}-${e.id}`} className="bg-cream border-2 border-navy rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-bold text-navy text-sm">
                          {kind === 'confirm' ? `✓ ${t('dashboard.todoConfirm', { title })}` : `★ ${t('dashboard.todoReview', { title })}`}
                        </p>
                        <p className="text-navy/65 text-xs mt-0.5">
                          {formatInTimezone(e.class_sessions.session_date, user.timezone, user.time_format)}
                          {kind === 'confirm' ? ` · ${t('dashboard.todoConfirmNote')}` : ''}
                        </p>
                      </div>
                      {kind === 'confirm' ? (
                        <button onClick={() => confirmAttendance(e.id)} disabled={confirming === e.id}
                          className="shrink-0 bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-50">
                          {confirming === e.id ? t('dashboard.confirming') : t('dashboard.confirmAttendance')}
                        </button>
                      ) : (
                        <button onClick={() => setReviewingId(reviewingId === e.id ? null : e.id)} aria-expanded={reviewingId === e.id}
                          className="shrink-0 bg-white text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy">
                          ★ {t('dashboard.todoReviewBtn')}
                        </button>
                      )}
                    </div>
                    {kind === 'review' && reviewingId === e.id && (
                      <RatingForm classSessionId={e.class_session_id} existingReview={null}
                        onReviewed={r => { setMyReviews(rs => [...rs, r]); setReviewingId(null) }}/>
                    )}
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}



          <Panel icon="✨" tone="bg-brand-purple/25" title={t('dashboard.forYou')} open={forYou.length > 0}
            note={forYou.length ? forYou.map(c => c.title).join(' · ') : t('dashboard.forYouEmpty')}>
            {forYou.length > 0 ? (
              <div className="space-y-3">
                {forYou.map(cls => (
                  <ClassCard key={cls.id} cls={cls} session={nextSession(cls)} user={user}
                    actions={<a href={`/classes/${cls.id}`} className={PRIMARY}>{t('classes.joinBanana')}</a>}/>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-navy/65 text-sm">{t('dashboard.forYouEmpty')}</p>
                <Link href="/classes?tab=requests" className={PILL}>🙋 {t('dashboard.askForClass')}</Link>
              </div>
            )}
          </Panel>

          <Panel icon="🗓️" tone="bg-brand-blue/25" title={t('dashboard.yourUpcoming')} open={upcomingEnrollments.length > 0}
            badge={upcomingEnrollments.length}
            note={upcomingEnrollments.length ? upcomingEnrollments.map(e => e.class_sessions?.classes?.title).join(' · ') : t('dashboard.noUpcomingLearning')}>
            {upcomingEnrollments.length === 0
              ? <p className="text-navy/65 text-sm">{t('dashboard.noUpcomingLearning')}</p>
              : <div className="space-y-3">
              {upcomingEnrollments.map(enrollment => {
                const session = enrollment.class_sessions
                const cls = session?.classes
                const { scheduledAt, isClassOver, isLive } = sessionTiming(session, cls?.duration_minutes)
                const active = enrollment.status !== 'attended' && enrollment.status !== 'cancelled'
                const statusText = enrollment.status === 'cancelled'
                  ? t('history.cancelled')
                  : enrollment.status === 'attended'
                    ? t('dashboard.attended')
                    : isClassOver
                      ? t('dashboard.classEndedConfirm')
                      : isLive ? t('dashboard.liveNow') : `✓ ${t('classes.joined')}`
                return (
                  <ClassCard key={enrollment.id} cls={cls} session={session} user={user} showBar={false}
                    status={statusText} statusTone={enrollment.status === 'cancelled' ? 'text-brand-red font-bold' : 'text-brand-teal-dark font-bold'}
                    above={isLive && enrollment.status !== 'cancelled' && (
                      <a href={`/classroom/${enrollment.class_session_id}`}
                        className="flex items-center justify-center gap-2 mb-3 bg-red-600 text-white font-extrabold text-sm tracking-wide px-4 py-2 rounded-xl animate-pulse shadow-[0_0_16px_4px_rgba(220,38,38,0.55)] hover:bg-red-700 transition-colors">
                        <span className="w-2 h-2 bg-white rounded-full" /> {t('dashboard.liveNow')} · {t('dashboard.joinMeeting')}
                      </a>
                    )}
                    actions={<>
                      {scheduledAt && !isClassOver && enrollment.status !== 'cancelled' && (
                        <button type="button" className={PILL}
                          onClick={() => downloadClassIcs({ sessionId: enrollment.class_session_id, title: cls?.title || 'Class', start: scheduledAt, durationMinutes: cls?.duration_minutes })}>
                          {t('dashboard.addToCalendar')}
                        </button>
                      )}
                      {active && !isClassOver && <a href={`/chat/${enrollment.class_session_id}`} className={PILL}>{t('chat.open')}</a>}
                      {active && isClassOver && (
                        <button onClick={() => confirmAttendance(enrollment.id)} disabled={confirming === enrollment.id}
                          className="bg-brand-teal text-white px-4 py-1.5 rounded-full text-sm font-bold border-2 border-navy hover:opacity-90 disabled:opacity-50 transition-opacity">
                          {confirming === enrollment.id ? t('dashboard.confirming') : t('dashboard.confirmAttendance')}
                        </button>
                      )}
                      {active && !isClassOver && (
                        <button
                          onClick={() => cancelEnrollment(enrollment, scheduledAt && (scheduledAt.getTime() - Date.now() >= 24 * 60 * 60 * 1000))}
                          disabled={cancellingEnrollmentId === enrollment.id}
                          className="border-2 border-brand-red/30 text-brand-red px-3 py-1.5 rounded-full text-sm font-bold hover:border-brand-red disabled:opacity-50">
                          {cancellingEnrollmentId === enrollment.id ? t('dashboard.cancelling') : t('dashboard.cancelClass')}
                        </button>
                      )}
                    </>}
                    below={<>
                      {/* Reporting is about a person, so this points at the
                          teacher's profile, where the form already lives. */}
                      {cls?.teacher?.id && (
                        <a href={`/teachers/${cls.teacher.id}`}
                          className="inline-block mt-2 text-navy/55 hover:text-brand-red text-xs font-medium transition-colors">
                          🚩 {t('teacher.report')}
                        </a>
                      )}
                      {enrollment.status === 'attended' && (
                        <RatingForm classSessionId={enrollment.class_session_id}
                          existingReview={reviewFor(enrollment.class_session_id)}
                          onReviewed={r => setMyReviews(rs => [...rs, r])} />
                      )}
                    </>}/>
                )
              })}
            </div>}
            <a href="/history" className="inline-block mt-3 text-navy text-sm font-bold underline decoration-2 underline-offset-4">{t('dashboard.pastInHistory')} →</a>
          </Panel>

          <Panel icon="🍌" tone="bg-brand-yellow/50" title={`${credits ?? '...'} ${t('dashboard.creditsAvailable')}`}
            note={transactions.length ? `${t('dashboard.recentBananas')}: ${transactions.slice(0, 3).map(tx => `${tx.amount > 0 ? '+' : ''}${tx.amount}`).join(' · ')}` : ''}>
            <div className="flex items-center gap-4">
              <p className="font-display font-extrabold text-4xl text-brand-red leading-none">{credits ?? '...'}</p>
              <p className="text-navy text-sm flex-1">{t('dashboard.creditsAvailable')}</p>
              <button type="button" onClick={() => setShowAllTx(v => !v)} className={PILL}>
                {showAllTx ? t('dashboard.hideHistory') : t('dashboard.showAllHistory')}
              </button>
            </div>
            {!showAllTx && transactions.length > 0 && (
              <p className="text-navy/65 text-xs mt-3">
                {t('dashboard.recentBananas')}: {transactions.slice(0, 3).map(tx => `${tx.amount > 0 ? '+' : ''}${tx.amount} ${tx.description}`).join(' · ')}
              </p>
            )}
            {showAllTx && <div className="mt-4">
          {transactions.length === 0 ? (
            <p className="text-navy/65 text-sm">{t('dashboard.noTransactionsYet')}</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-navy/10 last:border-0">
                  <div>
                    <p className="text-navy text-sm font-medium">{tx.description}</p>
                    <p className="text-navy/65 text-xs">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={tx.amount > 0
                    ? 'text-brand-teal-dark font-bold'
                    : 'text-brand-red font-bold'}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
            </div>}
          </Panel>

          <Panel icon="💌" tone="bg-brand-coral/30" title={t('dashboard.inviteTitle')} note={t('dashboard.inviteBody')}>
            <InviteCard userId={user.id} t={t} />
          </Panel>
        </>)}

        {mode === 'teaching' && (<>
          <FirstClassChecklist profile={profile} teachingClasses={teachingClasses} transactions={transactions} t={t} />
          <TeachNudge />
        {missingProfileFields.length > 0 && (
          <a href="/profile"
            className="flex items-start gap-3 mb-6 bg-brand-yellow/10 border-2 border-brand-yellow rounded-2xl px-5 py-4 hover:bg-brand-yellow/20 transition-colors">
            <span className="text-xl leading-none mt-0.5">👋</span>
            <div>
              <p className="font-display font-bold text-navy">{t('dashboard.completeProfileTitle')}</p>
              <p className="text-navy/65 text-sm mt-0.5">
                {t('dashboard.completeProfileNote', {
                  fields: missingProfileFields.map(k => t(k)).join(', ')
                })}
              </p>
            </div>
          </a>
        )}


          {nextTeach ? (() => {
            const cls = nextTeach.cls
            const { canJoin, isLive } = sessionTiming(nextTeachSession, cls.duration_minutes, true)
            return (
              <Panel icon="⏰" tone="bg-brand-yellow" title={t('dashboard.nextToTeach')} open
                note={`${cls.title} · ${countdown(nextTeach.at, t)}`}>
                <ClassCard cls={cls} session={{ ...nextTeachSession, taken: nextStudents.length }} user={user} countdown={countdown(nextTeach.at, t)}
                  person={<>
                    <p className="font-bold text-navy text-sm">👥 {nextStudents.length > 0 ? t('dashboard.studentsBooked', { n: nextStudents.length }) : t('dashboard.noStudentsYetShare')}</p>
                    {nextStudents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {nextStudents.map(st => {
                          const level = st.learn_details?.[cls.language_code]?.level
                          return (
                            <span key={st.id} className="bg-white border-2 border-navy rounded-full px-2.5 py-0.5 text-xs font-bold text-navy">
                              {st.first_name}{level ? ` · ${levelLabel(cls.language_code, level, t)}` : ''}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </>}
                  actions={<>
                    {!isLive && nextTeachSession && (cls.max_students || 0) > nextStudents.length && (
                      <ShareClass cls={cls} session={{ ...nextTeachSession, taken: nextStudents.length }} user={user} small/>
                    )}
                    {canJoin && nextTeachSession && (
                      <a href={`/classroom/${nextTeachSession.id}`} className={PRIMARY}>
                        {isLive ? t('dashboard.startClass') : t('dashboard.openClassroomEarly')}
                      </a>
                    )}
                    <button type="button" className={PILL}
                      onClick={() => downloadClassIcs({ sessionId: nextTeachSession?.id, title: cls.title, start: nextTeach.at, durationMinutes: cls.duration_minutes })}>
                      {t('dashboard.addToCalendar')}
                    </button>
                    <a href={`/classes/${cls.id}`} className={PILL}>📄 {t('dashboard.classPage')}</a>
                    {nextTeachSession && <a href={`/chat/${nextTeachSession.id}`} className={PILL}>{t('chat.open')}</a>}
                  </>}/>
              </Panel>
            )
          })() : (
            <Panel icon="⏰" tone="bg-brand-yellow" title={t('dashboard.nextToTeach')} note={t('dashboard.noUpcomingTeaching')} open>
              {lastTaught && <p className="text-navy/65 text-sm mb-3">{t('dashboard.lastTaught', { title: lastTaught.title })}</p>}
              <div className="flex flex-wrap gap-2">
                {lastTaught && <Link href={`/classes/create?from=${lastTaught.id}`} className={PRIMARY}>🔁 {t('dashboard.teachAgain')}</Link>}
                <Link href="/classes/create" className={lastTaught ? PILL : PRIMARY}>{t('dashboard.createAClass')}</Link>
              </div>
            </Panel>
          )}

          {requests.length > 0 && (
            <Panel icon="🙋" tone="bg-brand-blue/25" title={`${t('dashboard.studentsAsking')} · ${FLAGS[profile?.teach_language] || ''}`}
              badge={requests.length} open note={requests.map(r => r.topic).join(' · ')}>
              <ul>
                {requests.slice(0, 3).map(req => (
                  <li key={req.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy/10 last:border-0">
                    <div className="min-w-0">
                      <p className="text-navy text-sm font-bold break-words">{req.topic}</p>
                      <p className="text-navy/65 text-xs">
                        {[req.level, req.preferred_time && formatInTimezone(req.preferred_time, user.timezone, user.time_format),
                          (req.class_request_interest?.length || 0) > 0 && t('dashboard.interestedCount', { n: req.class_request_interest.length })].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <a className={PILL} href={'/classes/create?' + new URLSearchParams({
                      request: req.id, language_code: req.language_code, level: req.level || '', topic: req.topic,
                      max_students: req.max_students, preferred_time: req.preferred_time
                    }).toString()}>{t('dashboard.teachIt')}</a>
                  </li>
                ))}
              </ul>
              {requests.length > 3 && (
                <a href={`/classes?tab=requests&language=${profile?.teach_language}`} className="inline-block mt-2 text-navy text-sm font-bold underline decoration-2 underline-offset-4">{t('dashboard.seeAllRequests')} →</a>
              )}
            </Panel>
          )}

          {ratingQueue.length > 0 && (
            <Panel icon="⭐" tone="bg-brand-green/40" title={t('dashboard.rateTitle')} badge={ratingsWaiting} open
              note={ratingQueue.map(x => x.cls.title).join(' · ')}>
              <ul>
                {ratingQueue.map(sess => (
                  <li key={sess.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy/10 last:border-0">
                    <div className="min-w-0">
                      <p className="text-navy text-sm font-bold">{sess.cls.title}</p>
                      <p className="text-navy/65 text-xs">{formatInTimezone(sess.session_date, user.timezone, user.time_format)} · {t('dashboard.rateWaiting', { n: sess.waiting })}</p>
                    </div>
                    <a href="/history?tab=taught" className={PILL}>{t('dashboard.rateBtn')}</a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel icon="🗓️" tone="bg-brand-purple/25" title={t('dashboard.classesTeaching')} badge={upcomingTeaching.length}
            open={upcomingTeaching.length > 0}
            note={upcomingTeaching.length ? upcomingTeaching.map(c => c.title).join(' · ') : t('dashboard.noUpcomingTeaching')}>
            <Link href="/classes/create" className={`${PILL} mb-2`}>+ {t('dashboard.createAClass')}</Link>
            {upcomingTeaching.length === 0
              ? <p className="text-navy/65 text-sm">{t('dashboard.noUpcomingTeaching')}</p>
              : <div className="space-y-3">
              {upcomingTeaching.map(cls => {
                // The next session, not the first: a weekly class's first
                // one can already be over.
                const session = nextSession(cls) || cls.class_sessions?.[0]
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
                      <ClassCard cls={cls} session={session} user={user}
                        person={<>
                          <p className="font-bold text-navy text-sm">👥 {(session?.taken ?? 0) > 0 ? t('dashboard.studentsBooked', { n: session.taken }) : t('dashboard.noStudentsYet')}</p>
                          {!isClassOver && session && (session.taken ?? 0) < (cls.max_students || 0) && (
                            <p className="text-navy/75 text-xs mt-2 bg-[#fff8e6] border-2 border-dashed border-navy/40 rounded-xl px-2.5 py-1.5">💡 {t('share.teacherTip')}</p>
                          )}
                        </>}
                        status={isClassOver ? t('dashboard.ended') : undefined}
                        actions={isClassOver ? null : <>
                          {session && (session.taken ?? 0) < (cls.max_students || 0) && <ShareClass cls={cls} session={session} user={user} small/>}
                          {scheduledAt && session && (
                            <button type="button" className={PILL}
                              onClick={() => downloadClassIcs({ sessionId: session.id, title: cls.title, start: scheduledAt, durationMinutes: cls.duration_minutes })}>
                              {t('dashboard.addToCalendar')}
                            </button>
                          )}
                          <button onClick={() => startEditClass(cls)} className={PILL}>✏️ {t('dashboard.edit')}</button>
                          <button onClick={() => cancelTeachingClass(cls.id)} disabled={cancellingClassId === cls.id}
                            className="border-2 border-brand-red/30 text-brand-red px-3 py-1.5 rounded-full text-sm font-bold hover:border-brand-red disabled:opacity-50">
                            {cancellingClassId === cls.id ? t('dashboard.cancelling') : t('dashboard.cancelClass')}
                          </button>
                        </>}/>
                    )}
                  </div>
                )
              })}
            </div>}
            <a href="/history?tab=taught" className="inline-block mt-3 text-navy text-sm font-bold underline decoration-2 underline-offset-4">{t('dashboard.pastInHistory')} →</a>
          </Panel>

          <Panel icon="🍌" tone="bg-brand-yellow/50" title={`+${earnedThisMonth} ${t('dashboard.earnedThisMonth')}`} note={`🍌 ${credits ?? '...'} ${t('dashboard.creditsAvailable')}`}>
            <div className="flex items-center gap-4">
              <p className="font-display font-extrabold text-4xl text-brand-red leading-none">+{earnedThisMonth}</p>
              <p className="text-navy text-sm flex-1">{t('dashboard.earnedThisMonth')}</p>
              <p className="text-navy/65 text-sm">🍌 {credits ?? '...'}</p>
            </div>
          </Panel>
        </>)}
      </div>
    </main>
  )
}
