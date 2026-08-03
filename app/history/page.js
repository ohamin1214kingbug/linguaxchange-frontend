'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'
import { formatInTimezone, asUtcDate } from '../../lib/timezone'

const API = 'https://linguaxchange-backend-production.up.railway.app'

const FLAGS = { KO: '🇰🇷', ES: '🇪🇸', DE: '🇩🇪', EN: '🇬🇧', PT: '🇧🇷', FR: '🇫🇷', IT: '🇮🇹' }

// A session belongs in the history once it has finished, not merely started —
// otherwise a class you're sitting in right now would jump to the archive.
function hasFinished(sessionDate, durationMinutes) {
  if (!sessionDate) return false
  const end = asUtcDate(sessionDate).getTime() + (durationMinutes || 60) * 60 * 1000
  return Date.now() > end
}

// Column names on student_feedback, in display order. The label for each
// comes from i18n so this list stays the single source of truth.
const SKILLS = ['vocabulary', 'pronunciation', 'phrase_formation', 'fluency', 'grammar', 'listening', 'confidence']
const SKILL_LABEL = {
  vocabulary: 'vocabulary', pronunciation: 'pronunciation', phrase_formation: 'phraseFormation',
  fluency: 'fluency', grammar: 'grammar', listening: 'listening', confidence: 'confidence'
}

function Dots({ value, onChange, readOnly }) {
  return (
    <span className="flex gap-1.5 flex-shrink-0">
      {[1, 2, 3, 4, 5].map(n => {
        const on = (value || 0) >= n
        return readOnly ? (
          <span key={n} className={`w-3 h-3 rounded-full ${on ? 'bg-brand-teal' : 'bg-navy/15'}`} />
        ) : (
          <button key={n} type="button" onClick={() => onChange(value === n ? null : n)}
            aria-label={`${n}/5`}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${on ? 'bg-brand-teal border-brand-teal' : 'bg-white border-navy/20 hover:border-navy/50'}`} />
        )
      })}
    </span>
  )
}

// Read-only view of feedback a student received, shown under their own class.
function FeedbackSummary({ feedback, t }) {
  const rated = SKILLS.filter(s => feedback[s] != null)
  if (!rated.length && !feedback.comment) return null
  return (
    <div className="mt-3 bg-cream rounded-xl p-4 border-2 border-navy/10">
      <p className="text-xs font-bold text-navy mb-2">{t('feedback.received')}</p>
      <div className="space-y-1.5">
        {rated.map(s => (
          <div key={s} className="flex items-center justify-between gap-4">
            <span className="text-navy/60 text-xs">{t(`feedback.${SKILL_LABEL[s]}`)}</span>
            <Dots value={feedback[s]} readOnly />
          </div>
        ))}
      </div>
      {feedback.comment && <p className="text-navy/70 text-xs mt-3 italic">“{feedback.comment}”</p>}
    </div>
  )
}

// Teacher-side panel: loads the roster for one session and lets each student
// be scored. Loaded lazily on expand so the history page itself stays one
// request per section no matter how many classes are listed.
function RateStudents({ sessionId, t }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(null)
  const [msg, setMsg] = useState('')

  const load = () => {
    const token = localStorage.getItem('token')
    fetch(`${API}/api/student-feedback/session/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setRows(list)
        setDrafts(Object.fromEntries(list.map(r => [r.student.id, { ...(r.feedback || {}), comment: r.feedback?.comment || '' }])))
      })
      .catch(() => setRows([]))
  }

  const toggle = () => {
    if (!open && rows === null) load()
    setOpen(o => !o)
  }

  const setSkill = (studentId, skill, value) =>
    setDrafts(d => ({ ...d, [studentId]: { ...d[studentId], [skill]: value } }))

  const submit = async (studentId) => {
    const draft = drafts[studentId] || {}
    if (SKILLS.every(s => draft[s] == null)) { setMsg(t('feedback.rateAtLeastOne')); return }
    setMsg('')
    setSaving(studentId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/student-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          class_session_id: sessionId,
          student_id: studentId,
          ...Object.fromEntries(SKILLS.map(s => [s, draft[s] ?? null])),
          comment: draft.comment || ''
        })
      })
      const data = await res.json()
      setMsg(res.ok ? t('feedback.saved') : (data.error || t('common.connectionError')))
    } catch {
      setMsg(t('common.connectionError'))
    }
    setSaving(null)
  }

  return (
    <div className="pb-4">
      <button onClick={toggle} className="text-brand-red text-xs font-bold hover:underline">
        {open ? t('feedback.hide') : t('feedback.rateStudents')}
      </button>

      {open && rows === null && <p className="text-navy/40 text-xs mt-2">{t('common.loading')}</p>}
      {open && rows?.length === 0 && <p className="text-navy/40 text-xs mt-2">{t('feedback.noStudents')}</p>}

      {open && rows?.map(({ student }) => {
        const draft = drafts[student.id] || {}
        return (
          <div key={student.id} className="mt-3 bg-cream rounded-xl p-4 border-2 border-navy/10">
            <p className="text-sm font-bold text-navy mb-3">{student.first_name} {student.last_name || ''}</p>
            <div className="space-y-2">
              {SKILLS.map(s => (
                <div key={s} className="flex items-center justify-between gap-4">
                  <span className="text-navy/70 text-xs">{t(`feedback.${SKILL_LABEL[s]}`)}</span>
                  <Dots value={draft[s]} onChange={v => setSkill(student.id, s, v)} />
                </div>
              ))}
            </div>
            <textarea
              value={draft.comment || ''}
              maxLength={300}
              onChange={e => setSkill(student.id, 'comment', e.target.value)}
              placeholder={t('feedback.commentPlaceholder', { name: student.first_name })}
              rows={2}
              className="w-full mt-3 border-2 border-navy/20 rounded-xl px-3 py-2 text-sm resize-none focus:border-brand-red focus:outline-none transition-colors"/>
            <button onClick={() => submit(student.id)} disabled={saving === student.id}
              className="mt-2 bg-brand-red text-white px-4 py-1.5 rounded-full text-xs font-bold border-2 border-navy disabled:opacity-50">
              {saving === student.id ? t('feedback.saving') : t('feedback.submit')}
            </button>
          </div>
        )
      })}

      {open && msg && <p className="text-navy/60 text-xs mt-2 font-medium">{msg}</p>}
    </div>
  )
}

function Row({ flag, title, level, when, meta, badge, badgeTone, divider = true }) {
  return (
    <div className={`py-4 ${divider ? 'border-b border-navy/10 last:border-0' : ''} flex items-start justify-between gap-4`}>
      <div className="min-w-0">
        <p className="text-navy text-sm font-bold truncate">
          {flag} {title}
          {level && <span className="ml-2 bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">{level}</span>}
        </p>
        <p className="text-navy/40 text-xs mt-0.5">{when}{meta ? ` · ${meta}` : ''}</p>
      </div>
      {badge && (
        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border-2 ${badgeTone}`}>{badge}</span>
      )}
    </div>
  )
}

export default function History() {
  const router = useRouter()
  const { t } = useLanguage()
  const [user, setUser] = useState(null)
  const [taken, setTaken] = useState([])
  const [taught, setTaught] = useState([])
  const [feedbackBySession, setFeedbackBySession] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const me = JSON.parse(stored)
    setUser(me)

    const headers = { Authorization: `Bearer ${token}` }

    // Both lists come from endpoints the dashboard already uses — the only
    // thing this page adds is the past-only filter and the flattening of a
    // recurring class into one row per session.
    Promise.all([
      fetch(`${API}/api/enrollments`, { headers }).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/classes?teacher_id=${me.id}`).then(r => r.json()).catch(() => [])
    ]).then(([enrollments, classes]) => {
      const past = (Array.isArray(enrollments) ? enrollments : [])
        .filter(e => hasFinished(e.class_sessions?.session_date, e.class_sessions?.classes?.duration_minutes))
        .sort((a, b) => new Date(b.class_sessions.session_date) - new Date(a.class_sessions.session_date))
      setTaken(past)

      const sessions = []
      for (const cls of Array.isArray(classes) ? classes : []) {
        for (const s of cls.class_sessions || []) {
          if (hasFinished(s.session_date, cls.duration_minutes)) sessions.push({ ...s, cls })
        }
      }
      sessions.sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
      setTaught(sessions)
      setLoading(false)
    })

    fetch(`${API}/api/student-feedback/mine`, { headers })
      .then(r => r.json())
      .then(d => setFeedbackBySession(Object.fromEntries((Array.isArray(d) ? d : []).map(f => [f.class_session_id, f]))))
      .catch(() => {})
  }, [])

  if (!user) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/40 font-medium">{t('common.loading')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-display font-extrabold text-2xl md:text-3xl text-navy mb-2">{t('history.title')}</h1>
        <p className="text-navy/60 mb-8">{t('history.subtitle')}</p>

        {loading && <p className="text-navy/40 font-medium">{t('common.loading')}</p>}

        {!loading && (
          <>
            <div className="bg-white rounded-2xl p-6 border-2 border-navy mb-6">
              <h2 className="font-display font-bold text-navy mb-4">
                {t('history.taken')} <span className="text-navy/40 font-medium text-sm">({taken.length})</span>
              </h2>
              {taken.length === 0 ? (
                <p className="text-navy/40 text-sm">{t('history.noneTaken')}</p>
              ) : taken.map(e => {
                const cls = e.class_sessions.classes
                const teacher = cls?.teacher
                const received = feedbackBySession[e.class_session_id]
                return (
                  <div key={e.id} className="border-b border-navy/10 last:border-0 pb-2 last:pb-0">
                    <Row
                      flag={FLAGS[cls?.language_code] || ''}
                      title={cls?.title || '-'}
                      level={cls?.level}
                      when={formatInTimezone(e.class_sessions.session_date, user.timezone)}
                      meta={teacher ? t('history.withTeacher', { name: `${teacher.first_name} ${teacher.last_name || ''}`.trim() }) : ''}
                      badge={e.status === 'attended' ? t('dashboard.attended') : t('history.notConfirmed')}
                      badgeTone={e.status === 'attended'
                        ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                        : 'bg-navy/5 text-navy/40 border-navy/10'}
                      divider={false}
                    />
                    {received && <FeedbackSummary feedback={received} t={t} />}
                  </div>
                )
              })}
            </div>

            <div className="bg-white rounded-2xl p-6 border-2 border-navy">
              <h2 className="font-display font-bold text-navy mb-4">
                {t('history.taught')} <span className="text-navy/40 font-medium text-sm">({taught.length})</span>
              </h2>
              {taught.length === 0 ? (
                <p className="text-navy/40 text-sm">{t('history.noneTaught')}</p>
              ) : taught.map(s => (
                <div key={s.id} className="border-b border-navy/10 last:border-0">
                  <Row
                    flag={FLAGS[s.cls.language_code] || ''}
                    title={s.cls.title}
                    level={s.cls.level}
                    when={formatInTimezone(s.session_date, user.timezone)}
                    badge={s.status === 'cancelled' ? t('history.cancelled') : t('history.done')}
                    badgeTone={s.status === 'cancelled'
                      ? 'bg-brand-red/10 text-brand-red border-brand-red/30'
                      : 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'}
                    divider={false}
                  />
                  {s.status !== 'cancelled' && <RateStudents sessionId={s.id} t={t} />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
