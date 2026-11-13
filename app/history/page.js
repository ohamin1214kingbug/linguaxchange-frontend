'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'
import Tabs from '../../components/Tabs'
import { formatInTimezone } from '../../lib/timezone'
import { hasFinished } from '../../lib/classSchedule'
import { LANGUAGE_COLORS } from '../../lib/languages'
import RatingForm from '../../components/RatingForm'

const API = ''

const FLAGS = { KO: '🇰🇷', ES: '🇪🇸', DE: '🇩🇪', EN: '🇬🇧', PT: '🇧🇷', FR: '🇫🇷', IT: '🇮🇹' }

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
  4: { dot: 'bg-brand-teal border-brand-teal', text: 'text-brand-teal-dark', key: 'veryGood' },
  5: { dot: 'bg-brand-green border-brand-green', text: 'text-brand-green', key: 'excellent' },
}

// Mirrors MIN_SKILLS in the backend's utils/studentFeedback.js. The server
// rejects anything below it regardless; this only stops the pointless round
// trip and tells the teacher why the button is dim.
const MIN_SKILLS = 3

// One-tap phrases that append to the comment box. Keys, not sentences, so
// they translate with everything else.
const COMMENT_CHIPS = ['chipPronunciation', 'chipVocabulary', 'chipGrammar', 'chipListening', 'chipConfidence', 'chipConjugations']

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
      <SkillIcon name={skill} className={style ? style.text : 'text-navy/50'} />
      <div className="min-w-0 flex-1">
        <p className="text-navy text-xs font-bold leading-tight">{t(`feedback.${SKILL_LABEL[skill]}`)}</p>
        <p className="text-navy/65 text-[11px] leading-tight">{t(`feedback.${SKILL_LABEL[skill]}Hint`)}</p>
      </div>
      <Dots value={value} onChange={onChange} readOnly={readOnly} />
      <span className={`w-16 text-right text-[10px] font-extrabold uppercase leading-tight ${style ? style.text : 'text-navy/65'}`}>
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
  // Holds { studentId, key } — a translation KEY, not a rendered string.
  // Storing t(...) output here meant a saved confirmation kept the language
  // it was created in even after the user switched. Server errors have no
  // key to translate, so they ride along as { text }.
  const [msg, setMsg] = useState(null)

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

  // Appends rather than replaces, so chips stack into a sentence, and clamps
  // to the same 300 chars the column enforces. Reads the previous comment
  // inside the updater rather than from the render closure — two chips tapped
  // in the same tick would otherwise both build on the pre-click value and
  // the second would silently drop the first.
  const appendChip = (studentId, phrase) =>
    setDrafts(d => {
      const current = d[studentId]?.comment || ''
      const next = (current ? `${current.trimEnd()} ` : '') + phrase
      return { ...d, [studentId]: { ...d[studentId], comment: next.slice(0, 300) } }
    })

  const submit = async (studentId) => {
    const draft = drafts[studentId] || {}
    if (SKILLS.filter(s => draft[s] != null).length < MIN_SKILLS) {
      setMsg({ studentId, key: 'feedback.rateAtLeastThree' })
      return
    }
    setMsg(null)
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
      setMsg(res.ok
        ? { studentId, key: 'feedback.saved' }
        : (data.error ? { studentId, text: data.error } : { studentId, key: 'common.connectionError' }))
      // Reload so the row locks straight away. Without it the form stays
      // editable until the page is reloaded, and the next submit is refused
      // by the server with no explanation the teacher expects.
      if (res.ok) load()
    } catch {
      setMsg({ studentId, key: 'common.connectionError' })
    }
    setSaving(null)
  }

  return (
    <div className="pb-4">
      <button onClick={toggle} className="text-brand-red text-xs font-bold hover:underline">
        {open ? t('feedback.hide') : t('feedback.rateStudents')}
      </button>

      {open && rows === null && <p className="text-navy/65 text-xs mt-2">{t('common.loading')}</p>}
      {open && rows?.length === 0 && <p className="text-navy/65 text-xs mt-2">{t('feedback.noStudents')}</p>}

      {open && rows?.map(({ student, feedback }) => {
        const draft = drafts[student.id] || {}
        const rated = SKILLS.filter(s => draft[s] != null).length
        const ready = rated >= MIN_SKILLS
        const comment = draft.comment || ''
        // Submitted feedback is final — the student may already have read it.
        // The server enforces this; here it just stops the teacher filling in
        // a form that would be refused.
        const locked = !!feedback
        return (
          <div key={student.id} className="mt-3 bg-cream rounded-xl p-4 border-2 border-navy/10">
            <div className="flex items-center justify-between gap-3 mb-1">
              <a href={`/teachers/${student.id}`}
                className="text-sm font-bold text-navy hover:text-brand-red transition-colors">
                {student.first_name} {student.last_name || ''}
              </a>
              <span className="text-navy/65 text-xs font-bold">{rated}/{SKILLS.length}</span>
            </div>
            <p className="text-[10px] font-extrabold text-brand-red uppercase tracking-wide">{t('feedback.skillEvaluation')}</p>
            {!locked && <p className="text-navy/65 text-[11px] mb-2">{t('feedback.rateAtLeastThree', { n: MIN_SKILLS })}</p>}
            <div>
              {SKILLS.map(s => (
                <SkillRow key={s} skill={s} value={draft[s]} readOnly={locked}
                  onChange={v => setSkill(student.id, s, v)} t={t} />
              ))}
            </div>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-1.5 bg-navy/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${ready ? 'bg-brand-green' : 'bg-brand-yellow'}`}
                  style={{ width: `${(rated / SKILLS.length) * 100}%` }} />
              </div>
              <span className="text-navy/65 text-[11px] font-bold">{t('feedback.ratedCount', { n: rated, total: SKILLS.length })}</span>
            </div>

            <p className="text-[10px] font-extrabold text-brand-blue uppercase tracking-wide mt-4 mb-2">{t('feedback.teacherComment')}</p>
            <div className={`flex flex-wrap gap-2 mb-2 ${locked ? 'hidden' : ''}`}>
              {COMMENT_CHIPS.map(key => (
                <button key={key} type="button" onClick={() => appendChip(student.id, t(`feedback.${key}`))}
                  className="border-2 border-navy/15 text-navy/70 rounded-full px-3 py-1 text-[11px] font-medium hover:border-navy/40 hover:text-navy transition-colors">
                  + {t(`feedback.${key}`)}
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              maxLength={300}
              readOnly={locked}
              onChange={e => setSkill(student.id, 'comment', e.target.value)}
              placeholder={t('feedback.commentPlaceholder', { name: student.first_name })}
              rows={2}
              className={`w-full border-2 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none transition-colors ${
                locked ? 'border-navy/10 bg-navy/5 text-navy/65' : 'border-navy/20 focus:border-brand-red'}`}/>
            {!locked && <p className="text-navy/65 text-[10px] mt-1">{comment.length}/300</p>}

            {locked ? (
              <p className="text-navy/65 text-[11px] font-medium mt-2">{t('feedback.alreadySubmitted')}</p>
            ) : (
              <div className="flex items-center justify-between gap-3 mt-2">
                <span className={`text-[11px] font-medium ${ready ? 'text-brand-green' : 'text-navy/65'}`}>
                  {ready ? t('feedback.readyToSubmit') : t('feedback.rateAtLeastThree', { n: MIN_SKILLS })}
                </span>
                <button onClick={() => submit(student.id)} disabled={saving === student.id || !ready}
                  className="bg-brand-red text-white px-4 py-1.5 rounded-full text-xs font-bold border-2 border-navy disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving === student.id ? t('feedback.saving') : t('feedback.submit')}
                </button>
              </div>
            )}

            {msg?.studentId === student.id && (
              <p className={`text-xs mt-2 font-bold text-right ${
                msg.key === 'feedback.saved' ? 'text-brand-teal-dark' : 'text-brand-red'}`}>
                {msg.text || t(msg.key, { n: MIN_SKILLS })}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Avatar({ person, color = 'bg-brand-red' }) {
  return person?.photo_url
    ? <img src={person.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border-2 border-navy -ml-2 first:ml-0 bg-white"/>
    : <span className={`w-7 h-7 rounded-full border-2 border-navy -ml-2 first:ml-0 inline-flex items-center justify-center text-white text-xs font-bold ${color}`}>
        {person?.first_name?.[0]?.toUpperCase() || '?'}
      </span>
}

const AVATAR_COLORS = ['bg-brand-blue', 'bg-brand-green', 'bg-brand-purple', 'bg-brand-coral', 'bg-brand-teal']

// Classes grouped by the month they happened in, newest first. The list is
// already sorted, so a month starts wherever the label changes.
function byMonth(items, dateOf, locale) {
  const groups = []
  for (const item of items) {
    const label = new Date(dateOf(item)).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] })
    groups.at(-1).items.push(item)
  }
  return groups
}

// Three totals over the classes that were not cancelled.
function Totals({ items, minutesOf, languageOf, hoursLabel, t }) {
  const held = items.filter(item => item.cancelled !== true)
  const hours = held.reduce((sum, item) => sum + (minutesOf(item) || 0), 0) / 60
  const flags = [...new Set(held.map(languageOf))].map(code => FLAGS[code]).filter(Boolean)
  const stats = [
    [held.length, t('history.statClasses')],
    [t('history.hoursShort', { n: Math.round(hours * 10) / 10 }), hoursLabel],
    [flags.join(' ') || '–', t('history.statLanguages')],
  ]
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {stats.map(([value, label]) => (
        <div key={label} className="bg-white rounded-2xl border-2 border-navy shadow-[3px_3px_0_var(--color-navy)] py-3 px-2 text-center">
          <p className="font-display font-extrabold text-xl md:text-2xl text-navy leading-tight">{value}</p>
          <p className="text-navy/65 text-xs font-semibold">{label}</p>
        </div>
      ))}
    </div>
  )
}

// One class on the timeline. Folded, it is the coloured header and one
// summary line; open, it shows everything. The newest class starts open,
// because that is usually the one the member came for.
function ClassCard({ cls, title, status, statusTone, summary, open, onToggle, attended, t, children }) {
  const color = LANGUAGE_COLORS[cls?.language_code]
  return (
    <div className="relative">
      <span aria-hidden="true" className={`absolute -left-[31px] md:-left-[35px] top-4 w-[18px] h-[18px] rounded-full border-[3px] border-navy ${attended ? 'bg-brand-yellow' : 'bg-white'}`}/>
      <div className={`bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] overflow-hidden ${open ? 'outline outline-[3px] outline-brand-yellow outline-offset-[3px]' : ''}`}>
        <div className={`px-4 py-2.5 border-b-2 border-navy flex items-center justify-between gap-2 ${color?.tint || 'bg-cream'}`}>
          <h3 className="font-display font-extrabold text-lg text-navy leading-tight min-w-0 break-words">
            {FLAGS[cls?.language_code] || ''} {title}
            {cls?.level && <span className="ml-2 align-middle bg-white/70 border border-navy/25 rounded-full px-2 text-xs font-bold font-sans">{cls.level}</span>}
          </h3>
          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold border-2 border-navy ${statusTone}`}>{status}</span>
        </div>
        <div className="px-4 py-3">
          {open ? children : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-navy/65 text-sm min-w-0">{summary}</p>
            </div>
          )}
          <div className="flex justify-end mt-2">
            <button type="button" onClick={onToggle} aria-expanded={open}
              className="text-navy text-sm font-bold underline decoration-2 underline-offset-4">
              {open ? `▴ ${t('history.hide')}` : `▾ ${t('history.details')}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Timeline({ groups, render }) {
  return groups.map(group => (
    <section key={group.label} className="mb-6">
      <h2 className="font-display font-extrabold text-xl text-navy mb-3 first-letter:uppercase">{group.label}</h2>
      <div className="border-l-[3px] border-navy ml-2 pl-5 md:pl-6 space-y-4">
        {group.items.map(render)}
      </div>
    </section>
  ))
}

const BUTTON = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-3 py-1 text-sm font-bold text-navy bg-white hover:bg-cream transition-colors'

export default function History() {
  const router = useRouter()
  const { t, language } = useLanguage()
  // Month headings follow the site language, not the browser's.
  const monthLocale = (language || 'EN').toLowerCase()
  const [user, setUser] = useState(null)
  const [taken, setTaken] = useState([])
  const [taught, setTaught] = useState([])
  const [feedbackBySession, setFeedbackBySession] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('taken')
  const [reviews, setReviews] = useState({})
  // Which card is open, per tab. undefined = the default (the newest one).
  const [openTaken, setOpenTaken] = useState(undefined)
  const [openTaught, setOpenTaught] = useState(undefined)
  const [confirming, setConfirming] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = () => {
    const token = localStorage.getItem('token')
    return fetch(`${API}/api/enrollments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(enrollments => setTaken((Array.isArray(enrollments) ? enrollments : [])
        .filter(e => hasFinished(e.class_sessions?.session_date, e.class_sessions?.classes?.duration_minutes))
        .sort((a, b) => new Date(b.class_sessions.session_date) - new Date(a.class_sessions.session_date))))
      .catch(() => {})
  }

  // The same call the dashboard makes; the teacher is paid by it.
  const confirmAttendance = async (enrollmentId) => {
    setConfirming(enrollmentId)
    setNotice(null)
    try {
      const res = await fetch(`${API}/api/enrollments/${enrollmentId}/confirm`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json().catch(() => ({}))
      setNotice(res.ok ? { ok: true, key: 'dashboard.attendanceConfirmed' } : { ok: false, key: data.error || 'dashboard.errorConfirmAttendance' })
      if (res.ok) await load()
    } catch {
      setNotice({ ok: false, key: 'common.connectionError' })
    }
    setConfirming(null)
  }

  useEffect(() => {
    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!stored || !token) { router.push('/auth/login'); return }
    const me = JSON.parse(stored)
    setUser(me)
    // /history?tab=taught opens that tab; the dashboard's rating links use it.
    if (new URLSearchParams(window.location.search).get('tab') === 'taught') setTab('taught')

    const headers = { Authorization: `Bearer ${token}` }

    // Both lists come from endpoints the dashboard already uses — the only
    // thing this page adds is the past-only filter and the flattening of a
    // recurring class into one row per session.
    Promise.all([
      load(),
      fetch(`${API}/api/classes?teacher_id=${me.id}`).then(r => r.json()).catch(() => [])
    ]).then(([, classes]) => {

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

    fetch(`${API}/api/reviews/mine`, { headers })
      .then(r => r.json())
      .then(d => setReviews(Object.fromEntries((Array.isArray(d) ? d : []).map(r => [r.class_session_id, r]))))
      .catch(() => {})

    fetch(`${API}/api/student-feedback/mine`, { headers })
      .then(r => r.json())
      .then(d => setFeedbackBySession(Object.fromEntries((Array.isArray(d) ? d : []).map(f => [f.class_session_id, f]))))
      .catch(() => {})
  }, [])

  if (!user) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-navy/65 font-medium">{t('common.loading')}</div>
  )

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-display font-extrabold text-2xl md:text-3xl text-navy mb-2">{t('history.title')}</h1>
        <p className="text-navy/65 mb-8">{t('history.subtitle')}</p>

        {loading && <p className="text-navy/65 font-medium">{t('common.loading')}</p>}

        {!loading && (
          <>
            {/* Counts stay on the tabs themselves — the two lists were
                stacked, so the taught one started below however many
                classes you'd taken. */}
            <Tabs active={tab} onChange={setTab} tabs={[
              { key: 'taken', label: `${t('history.taken')} (${taken.length})` },
              { key: 'taught', label: `${t('history.taught')} (${taught.length})` }
            ]} />

            {notice && (
              <p className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border-2 ${notice.ok ? 'bg-brand-teal/10 text-brand-teal-dark border-brand-teal/30' : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>{t(notice.key)}</p>
            )}

            {tab === 'taken' && (taken.length === 0 ? (
              <p className="bg-white rounded-2xl p-6 border-2 border-navy text-navy/65 text-sm">{t('history.noneTaken')}</p>
            ) : (<>
              <Totals items={taken.map(e => ({ ...e, cancelled: e.status === 'cancelled' }))} t={t}
                minutesOf={e => e.class_sessions?.classes?.duration_minutes}
                languageOf={e => e.class_sessions?.classes?.language_code}
                hoursLabel={t('history.statPractised')}/>
              <Timeline groups={byMonth(taken, e => e.class_sessions.session_date, monthLocale)} render={(e, i) => {
                const session = e.class_sessions
                const cls = session.classes
                const teacher = cls?.teacher
                const classmates = session.classmates || []
                const received = feedbackBySession[e.class_session_id]
                const attended = e.status === 'attended'
                const open = (openTaken === undefined ? taken[0]?.id : openTaken) === e.id
                const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name || ''}`.trim() : ''
                return (
                  <ClassCard key={e.id} cls={cls} title={cls?.title || '-'} attended={attended} t={t}
                    open={open} onToggle={() => setOpenTaken(open ? null : e.id)}
                    status={e.status === 'cancelled' ? t('history.cancelled') : attended ? t('dashboard.attended') : t('history.notConfirmed')}
                    statusTone={attended ? 'bg-brand-green/25 text-navy' : e.status === 'cancelled' ? 'bg-brand-red/10 text-brand-red' : 'bg-white text-navy'}
                    summary={[formatInTimezone(session.session_date, user.timezone, user.time_format), teacherName,
                      classmates.length ? t('history.classmatesCount', { n: classmates.length }) : null,
                      cls?.lesson_plan_url ? '📄' : null, reviews[e.class_session_id] ? '★' : null].filter(Boolean).join(' · ')}>
                    <p className="text-navy/65 text-sm">
                      {formatInTimezone(session.session_date, user.timezone, user.time_format)}
                      {cls?.duration_minutes ? ` · ${t('history.minutesShort', { n: cls.duration_minutes })}` : ''}
                    </p>
                    <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
                      {teacher && (
                        <a href={`/teachers/${teacher.id}`} className="flex items-center gap-2 font-bold text-navy text-sm hover:underline">
                          <Avatar person={teacher}/> {teacherName}
                        </a>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="sr-only">{t('history.inThisClass')}</span>
                        {classmates.length > 0 ? (<>
                          <span className="flex">{classmates.slice(0, 5).map((c, k) => <Avatar key={c.id} person={c} color={AVATAR_COLORS[k % AVATAR_COLORS.length]}/>)}</span>
                          <span className="text-navy/65 text-xs">{classmates.map(c => c.first_name).join(', ')}</span>
                        </>) : <span className="text-navy/65 text-xs">{t('history.onlyYou')}</span>}
                      </div>
                    </div>
                    {cls?.materials && (
                      <div className="mt-3">
                        <p className="text-xs font-extrabold text-navy/65 uppercase tracking-wide mb-1">📝 {t('history.notes')}</p>
                        <p className="text-navy text-sm whitespace-pre-line break-words">{cls.materials}</p>
                      </div>
                    )}
                    {received && <FeedbackSummary feedback={received} t={t} />}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {cls?.lesson_plan_url && (
                        <a href={cls.lesson_plan_url} target="_blank" rel="noopener" className={BUTTON}>📄 {t('history.lessonPdf')}</a>
                      )}
                      {!attended && e.status !== 'cancelled' && (
                        <button type="button" onClick={() => confirmAttendance(e.id)} disabled={confirming === e.id}
                          className={`${BUTTON} bg-brand-green/25 disabled:opacity-50`}>✓ {t('history.iAttended')}</button>
                      )}
                      {teacher && <a href={`/teachers/${teacher.id}`} className={BUTTON}>{t('history.bookAgain')}</a>}
                    </div>
                    {attended && (
                      <RatingForm classSessionId={e.class_session_id} existingReview={reviews[e.class_session_id]}
                        onReviewed={r => setReviews(m => ({ ...m, [r.class_session_id]: r }))}/>
                    )}
                  </ClassCard>
                )
              }}/>
            </>))}

            {tab === 'taught' && (taught.length === 0 ? (
              <p className="bg-white rounded-2xl p-6 border-2 border-navy text-navy/65 text-sm">{t('history.noneTaught')}</p>
            ) : (<>
              <Totals items={taught.map(s => ({ ...s, cancelled: s.status === 'cancelled' }))} t={t}
                minutesOf={s => s.cls.duration_minutes}
                languageOf={s => s.cls.language_code}
                hoursLabel={t('history.statTaught')}/>
              <Timeline groups={byMonth(taught, s => s.session_date, monthLocale)} render={s => {
                const open = (openTaught === undefined ? taught[0]?.id : openTaught) === s.id
                const cancelled = s.status === 'cancelled'
                return (
                  <ClassCard key={s.id} cls={s.cls} title={s.cls.title} attended={!cancelled} t={t}
                    open={open} onToggle={() => setOpenTaught(open ? null : s.id)}
                    status={cancelled ? t('history.cancelled') : `✓ ${t('history.done')}`}
                    statusTone={cancelled ? 'bg-brand-red/10 text-brand-red' : 'bg-brand-green/25 text-navy'}
                    summary={[formatInTimezone(s.session_date, user.timezone, user.time_format), s.cls.lesson_plan_url ? '📄' : null].filter(Boolean).join(' · ')}>
                    <p className="text-navy/65 text-sm">
                      {formatInTimezone(s.session_date, user.timezone, user.time_format)}
                      {s.cls.duration_minutes ? ` · ${t('history.minutesShort', { n: s.cls.duration_minutes })}` : ''}
                    </p>
                    {s.cls.materials && (
                      <div className="mt-3">
                        <p className="text-xs font-extrabold text-navy/65 uppercase tracking-wide mb-1">📝 {t('history.notes')}</p>
                        <p className="text-navy text-sm whitespace-pre-line break-words">{s.cls.materials}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {s.cls.lesson_plan_url && (
                        <a href={s.cls.lesson_plan_url} target="_blank" rel="noopener" className={BUTTON}>📄 {t('history.lessonPdf')}</a>
                      )}
                      <a href={`/classes/${s.cls.id}`} className={BUTTON}>👥 {t('history.students')}</a>
                    </div>
                    {/* Students, and the feedback form for each of them. */}
                    {!cancelled && <div className="mt-3"><RateStudents sessionId={s.id} t={t} /></div>}
                  </ClassCard>
                )
              }}/>
            </>))}
          </>
        )}
      </div>
    </main>
  )
}
