'use client'
import { levelLabel } from '../../../lib/languages'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import Navbar from '../../../components/Navbar'
import { formatInTimezone, formatDay } from '../../../lib/timezone'
import { nextSessionDate, lastSessionDate } from '../../../lib/classSchedule'
import { fetchJoinedClassIds } from '../../../lib/enrollments'

const API = 'https://linguaxchange-backend-production.up.railway.app'

const BADGE_KEYS = { first_class: 'firstClass', five_taught: 'fiveTaught', polyglot: 'polyglot' }

function BadgeRow({ badges, t }) {
  if (!badges || badges.length === 0) return null
  return (
    <div className="flex gap-2 mt-3">
      {badges.map(badge => {
        const key = BADGE_KEYS[badge.id]
        const label = key ? t(`badges.${key}Label`) : badge.label
        const criteria = key ? t(`badges.${key}Criteria`) : badge.criteria
        return (
          <span key={badge.id} title={`${label} — ${criteria}`}
            className="w-9 h-9 flex items-center justify-center text-lg bg-brand-yellow/15 border-2 border-brand-yellow rounded-full">
            {badge.icon}
          </span>
        )
      })}
    </div>
  )
}

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
  const [viewerTimezone, setViewerTimezone] = useState(null)
  const [viewerTimeFormat, setViewerTimeFormat] = useState(null)
  const [reporting, setReporting] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const [reportCategory, setReportCategory] = useState('harassment')
  const [reportImages, setReportImages] = useState([])
  const [reportError, setReportError] = useState('')
  const [saved, setSaved] = useState(false)
  const [savingTeacher, setSavingTeacher] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [joinedClassIds, setJoinedClassIds] = useState(new Set())

  const LANGS = {
    KO: { flag: '🇰🇷', name: t('home.langKorean') },
    ES: { flag: '🇪🇸', name: t('home.langSpanish') },
    DE: { flag: '🇩🇪', name: t('home.langGerman') },
    EN: { flag: '🇬🇧', name: t('home.langEnglish') },
    PT: { flag: '🇧🇷', name: t('home.langPortuguese') },
    FR: { flag: '🇫🇷', name: t('home.langFrench') },
    IT: { flag: '🇮🇹', name: t('home.langItalian') },
  }

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (stored) {
      const viewer = JSON.parse(stored)
      setViewerTimezone(viewer.timezone)
      setViewerTimeFormat(viewer.time_format)
      setCurrentUser(viewer)
    }
    if (!stored || !token) return
    fetch(`${API}/api/saved-teachers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(list => setSaved(Array.isArray(list) && list.some(t => String(t.id) === String(id))))
    fetchJoinedClassIds(token).then(setJoinedClassIds)
  }, [id])

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
    // Joining spends a credit, so it gets the same confirmation browse
    // already asks for — this page was taking the credit on a single click.
    if (!window.confirm(t('classes.confirmJoin'))) return
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
        setMessage('classes.successfullyJoined')
        setMessageOk(true)
        // Navbar reads the balance from its own fetch — without this the
        // credit badge sits stale until the next navigation.
        window.dispatchEvent(new Event('credits-changed'))
        fetchJoinedClassIds(token).then(setJoinedClassIds)
      } else {
        setMessage(data.error || 'classes.errorJoinClass')
        setMessageOk(false)
      }
    } catch (e) {
      setMessage('common.connectionError')
      setMessageOk(false)
    }
    setJoining(null)
  }

  // Read to a data URL and post as JSON, matching how avatars and class
  // materials already upload: the browser never holds a Supabase key.
  const attachImages = async event => {
    const files = [...event.target.files].slice(0, 3 - reportImages.length)
    if (!files.length) return
    setReportError('')

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setReportError(t('teacher.reportEvidenceTooBig'))
        return
      }
    }

    const encoded = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })))

    setReportImages(current => [...current, ...encoded].slice(0, 3))
  }

  const submitReport = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/auth/login'
      return
    }
    if (!reportReason.trim()) return
    setReportError('')
    try {
      const res = await fetch(`${API}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          report_type: 'user',
          reported_id: parseInt(id),
          reason: reportReason.trim(),
          category: reportCategory,
          evidence: reportImages
        })
      })
      if (res.ok) {
        setReportSent(true)
        setReporting(false)
        setReportReason('')
        setReportImages([])
        return
      }
      // Unlike the rest of this page, a failed report does say so. Someone
      // reporting harassment who is met with silence has no way to tell
      // whether anyone heard them.
      const data = await res.json().catch(() => ({}))
      setReportError(data.error || t('teacher.reportFailed'))
    } catch (e) {
      setReportError(t('teacher.reportFailed'))
    }
  }

  const toggleSaved = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.href = '/auth/login'
      return
    }
    setSavingTeacher(true)
    if (saved) {
      await fetch(`${API}/api/saved-teachers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setSaved(false)
    } else {
      const res = await fetch(`${API}/api/saved-teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacher_id: parseInt(id) })
      })
      if (res.ok) setSaved(true)
    }
    setSavingTeacher(false)
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const upcomingClasses = classes.filter(c => nextSessionDate(c))
  const pastClasses = classes
    .filter(c => !nextSessionDate(c))
    .sort((a, b) => (lastSessionDate(b) || 0) - (lastSessionDate(a) || 0))

  // Plain function, not a nested component: a component declared inside
  // another gets a fresh identity every render and remounts its subtree.
  const classSummary = (cls, date, muted) => (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span>{LANGS[cls.language_code]?.flag}</span>
        <span className="bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">{levelLabel(cls.language_code, cls.level)}</span>
        <span className="text-navy/40 text-xs">{cls.duration_minutes} {t('classes.min')}</span>
      </div>
      <p className="font-bold text-navy text-sm">{cls.title}</p>
      {cls.description && <p className="text-navy/40 text-xs mt-0.5">{cls.description}</p>}
      {date && (
        <p className={`text-xs font-bold mt-1 ${muted ? 'text-navy/40' : 'text-brand-red'}`}>
          🗓️ {formatInTimezone(date.toISOString(), viewerTimezone, viewerTimeFormat)}
        </p>
      )}
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('common.loading')}</div>
  )

  if (!teacher || teacher.error) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('teacher.teacherNotFound')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        {/* Header card */}
        <div className="bg-white rounded-2xl p-8 border-2 border-navy mb-6">
          <div className="flex justify-end items-center gap-4">
            <button onClick={toggleSaved} disabled={savingTeacher}
              className={`text-xs font-bold disabled:opacity-50 ${saved ? 'text-brand-red' : 'text-navy/40 hover:text-brand-red'}`}>
              {saved ? `❤️ ${t('teacher.savedLabel')}` : `🤍 ${t('teacher.saveLabel')}`}
            </button>
            {reportSent ? (
              <span className="text-navy/40 text-xs">{t('teacher.reportSent')}</span>
            ) : (
              <button onClick={() => setReporting(o => !o)}
                className="text-navy/40 text-xs font-medium hover:text-brand-red">
                🚩 {t('teacher.report')}
              </button>
            )}
          </div>
          {reporting && (
            <div className="mb-4 bg-cream border-2 border-navy/10 rounded-xl p-4">
              <label className="block text-xs font-bold text-navy mb-1">{t('teacher.reportCategory')}</label>
              <select value={reportCategory} onChange={e => setReportCategory(e.target.value)}
                className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm mb-3 focus:border-brand-red focus:outline-none transition-colors">
                <option value="harassment">{t('teacher.reportCatHarassment')}</option>
                <option value="inappropriate_content">{t('teacher.reportCatInappropriate')}</option>
                <option value="spam_or_scam">{t('teacher.reportCatSpam')}</option>
                <option value="no_show">{t('teacher.reportCatNoShow')}</option>
                <option value="other">{t('teacher.reportCatOther')}</option>
              </select>
              <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} rows={3} maxLength={500}
                placeholder={t('teacher.reportReasonPlaceholder')}
                className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm focus:border-brand-red focus:outline-none transition-colors"/>
              <label className="block text-xs font-bold text-navy mt-3 mb-1">{t('teacher.reportEvidence')}</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={attachImages}
                disabled={reportImages.length >= 3}
                className="text-xs text-navy/60 file:mr-3 file:rounded-full file:border-2 file:border-navy/20 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold"/>
              {reportImages.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {reportImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-navy/15"/>
                      <button onClick={() => setReportImages(imgs => imgs.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-brand-red text-white w-5 h-5 rounded-full text-xs font-bold border-2 border-white">×</button>
                    </div>
                  ))}
                </div>
              )}
              {reportError && <p className="text-brand-red text-xs mt-2 font-bold">{reportError}</p>}
              <div className="flex gap-2 justify-end mt-2">
                <button onClick={() => setReporting(false)} className="text-navy/50 text-sm font-bold px-3 py-1.5">
                  {t('teacher.reportCancel')}
                </button>
                <button onClick={submitReport} disabled={!reportReason.trim()}
                  className="bg-brand-red text-white px-4 py-1.5 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-50">
                  {t('teacher.reportSubmit')}
                </button>
              </div>
            </div>
          )}
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
              {teacher?.university_verified_at && (
                /* The date is the point: a university address keeps working after
                   graduation, so the badge states when it was checked rather than
                   implying the person is enrolled today. */
                <p className="text-brand-teal font-bold text-sm mt-1">
                  🎓 {teacher.university_domain}
                  <span className="text-navy/40 font-medium">
                    {' · '}{formatDay(teacher.university_verified_at)}
                  </span>
                </p>
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
              <BadgeRow badges={teacher.badges} t={t} />

              {/* GET /api/users/:id already returned learn_languages and
                  certificate_explanation — this page just never rendered
                  them, so half of what a teacher fills in on /profile was
                  invisible to the people deciding whether to book them. */}
              {teacher.certificate_explanation && (
                <p className="text-navy/60 text-sm mt-2 italic">{teacher.certificate_explanation}</p>
              )}

              {teacher.learn_languages?.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-navy/50 text-sm">{t('teacher.wantsToLearn')}</span>
                  {teacher.learn_languages.map(code => LANGS[code] && (
                    <span key={code}
                      className="bg-brand-teal/10 text-navy px-2.5 py-1 rounded-full text-xs font-bold border-2 border-brand-teal/30">
                      {LANGS[code].flag} {LANGS[code].name}
                    </span>
                  ))}
                </div>
              )}

              {teacher.bio && (
                <p className="text-navy/70 mt-4 leading-relaxed">{teacher.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming classes */}
        {upcomingClasses.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
            <h2 className="font-display font-bold text-navy mb-4">{t('teacher.upcomingClasses')}</h2>

            {message && (
              <div className={`px-4 py-3 rounded-xl mb-4 text-sm font-medium border-2 ${messageOk ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>
                {t(message)}
              </div>
            )}

            <div className="space-y-3">
              {upcomingClasses.map(cls => (
                <div key={cls.id} className="flex items-center justify-between py-3 border-b border-navy/10 last:border-0">
                  {classSummary(cls, nextSessionDate(cls))}
                  {/* Same three states browse shows. Offering Join on a class
                      you already joined (or teach yourself) only ever earned
                      a rejection from POST /api/enrollments. */}
                  {String(cls.teacher_id) === String(currentUser?.id) ? (
                    <a href={`/classes/${cls.id}`}
                      className="bg-navy/5 text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-navy/10 transition-colors flex-shrink-0 ml-4 whitespace-nowrap">
                      {t('classes.yourClass')}
                    </a>
                  ) : joinedClassIds.has(cls.id) ? (
                    <span className="bg-brand-teal/10 text-brand-teal px-4 py-2 rounded-full text-sm font-bold border-2 border-brand-teal/30 flex-shrink-0 ml-4 whitespace-nowrap">
                      {t('classes.joined')}
                    </span>
                  ) : (
                    <button onClick={() => joinClass(cls)}
                      disabled={joining === cls.id}
                      className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors flex-shrink-0 ml-4">
                      {joining === cls.id ? t('classes.joining') : t('teacher.join')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already taught — no Join button; these can't be joined any more. */}
        {pastClasses.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border-2 border-navy/15 mb-6">
            <h2 className="font-display font-bold text-navy mb-1">{t('teacher.pastClasses')}</h2>
            <p className="text-navy/50 text-xs mb-4">{t('teacher.pastClassesNote')}</p>
            <div className="space-y-3">
              {pastClasses.map(cls => (
                <div key={cls.id} className="py-3 border-b border-navy/10 last:border-0 opacity-70">
                  {classSummary(cls, lastSessionDate(cls), true)}
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
