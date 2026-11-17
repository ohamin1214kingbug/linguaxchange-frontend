'use client'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { levelLabel } from '../lib/languages'
import { asUtcDate } from '../lib/timezone'

const FLAGS = { KO: '🇰🇷', ES: '🇪🇸', DE: '🇩🇪', EN: '🇬🇧', PT: '🇧🇷', FR: '🇫🇷', IT: '🇮🇹' }

// The next session still to come (with its booked count `taken`, from
// GET /api/classes). Outside components: it reads the clock.
export function nextSession(cls, now = new Date()) {
  return (cls?.class_sessions || [])
    .filter(s => s.status === 'scheduled' && asUtcDate(s.session_date) > now)
    .sort((a, b) => asUtcDate(a.session_date) - asUtcDate(b.session_date))[0] || null
}

// Weekday, day number and time for the date block, in the viewer's zone once
// mounted (UTC before, so the server and first client render agree).
export function dateParts(iso, { timezone, timeFormat, locale, mounted = true }) {
  const d = asUtcDate(iso)
  const base = { timeZone: mounted ? (timezone || undefined) : 'UTC' }
  const f = opts => new Intl.DateTimeFormat(locale, { ...base, ...opts }).format(d)
  return {
    weekday: f({ weekday: 'short' }),
    day: f({ day: 'numeric' }),
    time: f({ hour: 'numeric', minute: '2-digit', hour12: timeFormat ? timeFormat === '12h' : undefined }),
  }
}

// One class, the same everywhere (Explore, dashboard): date block, level and
// length, title and topic, a 48px photo with a name, the spots bar, then the
// caller's buttons. `person` replaces the teacher line (the teaching
// dashboard shows who booked instead of your own face); `status` replaces
// the spots text; `above` / `below` hold extras such as a live banner or the
// rating form.
export default function ClassCard({
  cls, session, user, mounted = true, person, status, statusTone = '', actions,
  countdown, showBar = true, above, below,
}) {
  const { t, language } = useLanguage()
  if (!cls) return null
  const when = session?.session_date && dateParts(session.session_date, {
    timezone: user?.timezone, timeFormat: user?.time_format, locale: (language || 'EN').toLowerCase(), mounted,
  })
  const max = cls.max_students || 0
  const taken = Math.min(session?.taken ?? 0, max)
  const left = max - taken
  const spots = left <= 0 ? t('classes.full') : left === 1 ? t('classes.oneSpotLeft', { max }) : t('classes.spotsLeft', { n: left, max })
  const spotsTone = left <= 0 ? 'text-brand-red font-bold' : left === 1 ? 'text-amber-700 font-bold' : 'text-navy/70'

  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 border-2 border-navy shadow-[4px_4px_0_var(--color-navy)]">
      {above}
      <div className="flex gap-3 md:gap-4 items-start">
        {when && (
          <div className="w-16 md:w-[72px] shrink-0 border-2 border-navy rounded-xl bg-brand-yellow/20 text-center py-1.5">
            <p className="text-[11px] font-bold uppercase text-navy">{when.weekday}</p>
            <p className="font-display font-extrabold text-2xl md:text-3xl text-navy leading-none">{when.day}</p>
            <p className="text-[11px] font-bold text-navy mt-0.5">{when.time}</p>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-brand-teal/15 text-brand-teal-dark px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/40">
              {FLAGS[cls.language_code] || ''} {levelLabel(cls.language_code, cls.level)}
            </span>
            {cls.duration_minutes && <span className="text-navy/55 text-xs font-medium">{cls.duration_minutes} {t('classes.min')}</span>}
            {countdown && <span className="text-amber-700 text-xs font-extrabold">· {countdown}</span>}
          </div>
          <h3 className="font-display font-extrabold text-navy text-lg md:text-xl leading-tight mt-1.5 break-words">
            <a href={`/classes/${cls.id}`} className="hover:text-brand-red transition-colors">{cls.title}</a>
          </h3>
          {cls.topic && <p className="text-navy/60 text-sm mt-0.5 break-words">{cls.topic}</p>}

          {person !== undefined ? <div className="mt-3">{person}</div> : cls.teacher && (
            <a href={`/teachers/${cls.teacher.id}`} className="inline-flex items-center gap-2.5 mt-3 group">
              <span className="w-12 h-12 rounded-full border-2 border-navy bg-brand-yellow/30 overflow-hidden flex items-center justify-center font-display font-extrabold text-navy text-lg shrink-0">
                {cls.teacher.photo_url
                  ? <img src={cls.teacher.photo_url} alt="" className="w-full h-full object-cover"/>
                  : (cls.teacher.first_name || '?')[0]}
              </span>
              <span className="font-bold text-navy text-sm group-hover:text-brand-red transition-colors">{cls.teacher.first_name} {cls.teacher.last_name}</span>
            </a>
          )}

          {showBar && max > 0 && (
            <div className="mt-3 h-2 rounded-full bg-navy/10 overflow-hidden" aria-hidden="true">
              <div className="h-full bg-brand-green border-r-2 border-navy" style={{ width: `${Math.max(4, (taken / max) * 100)}%` }}/>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 mt-2.5 flex-wrap">
            <p className={`text-sm ${status ? statusTone || 'text-navy/70' : spotsTone}`}>{status || spots}</p>
            {actions && <div className="flex flex-wrap gap-2 justify-end">{actions}</div>}
          </div>
          {below}
        </div>
      </div>
    </div>
  )
}
