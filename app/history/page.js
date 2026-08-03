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

// Score -> colour + word, so a rating reads at a glance instead of forcing
// the reader to count dots. Class strings are literal because Tailwind only
// sees what it can find in the source, never an interpolated name.
const SCORE_STYLE = {
  1: { dot: 'bg-brand-red border-brand-red', text: 'text-brand-red', key: 'poor' },
  2: { dot: 'bg-brand-yellow border-brand-yellow', text: 'text-brand-yellow', key: 'fair' },
  3: { dot: 'bg-brand-blue border-brand-blue', text: 'text-brand-blue', key: 'good' },
  4: { dot: 'bg-brand-teal border-brand-teal', text: 'text-brand-teal', key: 'veryGood' },
  5: { dot: 'bg-brand-green border-brand-green', text: 'text-brand-green', key: 'excellent' },
}

// Inline paths rather than an icon package — seven glyphs don't justify a
// dependency, and these inherit currentColor so they tint with the score.
const ICON_PATHS = {
  vocabulary: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  pronunciation: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></>,
  phrase_formation: <><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="17" x2="18" y2="17" /></>,
  fluency: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  grammar: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
  listening: <><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></>,
  confidence: <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></>,
}

function SkillIcon({ name, className }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 ${className}`}>
      {ICON_PATHS[name]}
    </svg>
  )
}

function Dots({ value, onChange, readOnly }) {
  const filled = SCORE_STYLE[value]?.dot || ''
  return (
    <span className="flex gap-1.5 flex-shrink-0">
      {[1, 2, 3, 4, 5].map(n => {
        const on = (value || 0) >= n
        return readOnly ? (
          <span key={n} className={`w-3 h-3 rounded-full border-2 ${on ? filled : 'bg-white border-navy/20'}`} />
        ) : (
          <button key={n} type="button" onClick={() => onChange(value === n ? null : n)}
            aria-label={`${n}/5`}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${on ? filled : 'bg-white border-navy/20 hover:border-navy/50'}`} />
        )
      })}
    </span>
  )
}

// One row of the evaluation, shared by the teacher's editor and the
// student's read-only view so the two can't drift apart.
function SkillRow({ skill, value, onChange, readOnly, t }) {
  const style = SCORE_STYLE[value]
  return (
    <div className="flex items-center gap-3 py-2 border-b border-navy/5 last:border-0">
      <SkillIcon name={skill} className={style ? style.text : 'text-navy/25'} />
      <div className="min-w-0 flex-1">
        <p className="text-navy text-xs font-bold leading-tight">{t(`feedback.${SKILL_LABEL[skill]}`)}</p>
        <p className="text-navy/40 text-[11px] leading-tight">{t(`feedback.${SKILL_LABEL[skill]}Hint`)}</p>
      </div>
      <Dots value={value} onChange={onChange} readOnly={readOnly} />
      <span className={`w-16 text-right text-[10px] font-extrabold uppercase leading-tight ${style ? style.text : 'text-navy/20'}`}>
        {style ? t(`feedback.${style.key}`) : '—'}
      </span>
    </div>
  )
}

// Read-only view of feedback a student received, shown under their own class.
function FeedbackSummary({ feedback, t }) {
  const rated = SKILLS.filter(s => feedback[s] != null)
  if (!rated.length && !feedback.comment) return null
  return (
    <div className="mt-3 bg-cream rounded-xl p-4 border-2 border-navy/10">
      <p className="text-xs font-extrabold text-brand-red uppercase tracking-wide mb-2">{t('feedback.received')}</p>
      <div>
        {rated.map(s => (
          <SkillRow key={s} skill={s} value={feedback[s]} readOnly t={t} />
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
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-sm font-bold text-navy">{student.first_name} {student.last_name || ''}</p>
              <span className="text-navy/40 text-xs font-bold">{SKILLS.filter(s => draft[s] != null).length}/7</span>
            </div>
            <p className="text-[10px] font-extrabold text-brand-red uppercase tracking-wide mb-2">{t('feedback.skillEvaluation')}</p>
            <div>
              {SKILLS.map(s => (
                <SkillRow key={s} skill={s} value={draft[s]} onChange={v => setSkill(student.id, s, v)} t={t} />
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
