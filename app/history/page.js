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

function Row({ flag, title, level, when, meta, badge, badgeTone }) {
  return (
    <div className="py-4 border-b border-navy/10 last:border-0 flex items-start justify-between gap-4">
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
                return (
                  <Row key={e.id}
                    flag={FLAGS[cls?.language_code] || ''}
                    title={cls?.title || '-'}
                    level={cls?.level}
                    when={formatInTimezone(e.class_sessions.session_date, user.timezone)}
                    meta={teacher ? t('history.withTeacher', { name: `${teacher.first_name} ${teacher.last_name || ''}`.trim() }) : ''}
                    badge={e.status === 'attended' ? t('dashboard.attended') : t('history.notConfirmed')}
                    badgeTone={e.status === 'attended'
                      ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'
                      : 'bg-navy/5 text-navy/40 border-navy/10'}
                  />
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
                <Row key={s.id}
                  flag={FLAGS[s.cls.language_code] || ''}
                  title={s.cls.title}
                  level={s.cls.level}
                  when={formatInTimezone(s.session_date, user.timezone)}
                  badge={s.status === 'cancelled' ? t('history.cancelled') : t('history.done')}
                  badgeTone={s.status === 'cancelled'
                    ? 'bg-brand-red/10 text-brand-red border-brand-red/30'
                    : 'bg-brand-teal/10 text-brand-teal border-brand-teal/30'}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
