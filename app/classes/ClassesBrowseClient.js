'use client'
import { levelLabel, LEVELS } from '../../lib/languages'
import { TandemGroupsStrip } from '../../components/TandemCard'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'
import ClassRequests from '../../components/ClassRequests'
import AssignmentBoard from '../../components/AssignmentBoard'
import { hasUpcomingSession } from '../../lib/classSchedule'
import { fetchJoinedClassIds } from '../../lib/enrollments'
import { rememberReturnPath } from '../../lib/auth'
import ClassAlertToggle from '../../components/ClassAlertToggle'
import ClassCard, { nextSession } from '../../components/ClassCard'

const API = ''
const LANG_CODES = ['KO', 'ES', 'DE', 'EN', 'PT', 'FR', 'IT']

// `initialClasses` comes from the server component in page.js, already
// filtered to whatever the URL asked for. Seeding state with it is what puts
// the listings into the server-rendered HTML — a client component is still
// prerendered on the server, but the useEffect that fetches them never runs
// during that pass, so this page used to ship an empty list to crawlers.
export default function ClassesBrowseClient({ initialClasses = [], serverFetched = false, initialLanguage = 'all', initialLevel = 'all', initialTab = 'classes' }) {
  const { t } = useLanguage()
  const [classes, setClasses] = useState(initialClasses)
  // Every upcoming class, unfiltered: the counts on the language chips and
  // the list of languages that have none.
  const [allUpcoming, setAllUpcoming] = useState(initialLanguage === 'all' && initialLevel === 'all' ? initialClasses : null)
  const [teacherOptions, setTeacherOptions] = useState([])
  const [loading, setLoading] = useState(!serverFetched)
  const [tab, setTab] = useState(initialTab)
  const [filter, setFilter] = useState(initialLanguage)
  const [levelFilter, setLevelFilter] = useState(initialLevel)
  const [teacherFilter, setTeacherFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [joining, setJoining] = useState(null)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [joinedClassIds, setJoinedClassIds] = useState(new Set())
  // Session times render in UTC on the server and on the first client render so
  // the two agree, then switch to the viewer's timezone once mounted.
  const [mounted, setMounted] = useState(false)
  // The server list now paints at hydration, before the enrollment check has
  // returned. Until it does, joinedClassIds is empty and a class you are
  // already in renders a Join button — clicking it fires a request the backend
  // correctly rejects, showing an error for a reasonable action.
  const [enrollmentsChecked, setEnrollmentsChecked] = useState(false)

  // Unfiltered, fetched once — used only to populate the teacher dropdown so
  // picking a teacher doesn't shrink the dropdown's own option list.
  useEffect(() => {
    fetch(`${API}/api/classes`)
      .then(res => res.json())
      .then(data => {
        setAllUpcoming((Array.isArray(data) ? data : []).filter(cls => hasUpcomingSession(cls)))
        const teachers = Array.isArray(data) ? data.map(c => c.teacher).filter(Boolean) : []
        const unique = Array.from(new Map(teachers.map(tch => [tch.id, tch])).values())
        setTeacherOptions(unique)
      })

    setMounted(true)

    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (stored && token) {
      const u = JSON.parse(stored)
      setCurrentUser(u)
      fetchJoinedClassIds(token)
        .then(setJoinedClassIds)
        .finally(() => setEnrollmentsChecked(true))
    } else {
      // Nobody to check for. Starting false rather than true is deliberate: the
      // server cannot know whether a token exists, so the safe default is the
      // one that is never wrongly enabled. The cost is that the button is
      // briefly disabled on first paint for everyone, cleared as soon as this
      // effect runs.
      setEnrollmentsChecked(true)
    }
  }, [])

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('language_code', filter)
      if (levelFilter !== 'all') params.set('level', levelFilter)
      if (teacherFilter !== 'all') params.set('teacher_id', teacherFilter)
      if (search.trim()) params.set('q', search.trim())

      fetch(`${API}/api/classes?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
          // The API deliberately returns finished classes too (they're still
          // valid search hits) — browse is the surface that drops them.
          //
          // Wrapped, not passed by reference: .filter hands the callback the
          // index as its second argument, which would land in `now` and make
          // every date compare greater than 0.
          setClasses((Array.isArray(data) ? data : []).filter(cls => hasUpcomingSession(cls)))
          setLoading(false)
        })
    }, 300)
    return () => clearTimeout(handle)
  }, [filter, levelFilter, teacherFilter, search])

  const joinClass = async (cls) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const token = localStorage.getItem('token')
    if (!user || !token) {
      // Back to these same filtered classes after signing up.
      const back = new URLSearchParams()
      if (filter !== 'all') back.set('language', filter)
      if (levelFilter !== 'all') back.set('level', levelFilter)
      const query = back.toString()
      rememberReturnPath(`/classes${query ? `?${query}` : ''}`)
      window.location.href = '/auth/register'
      return
    }
    if (!window.confirm(t('classes.confirmJoin'))) return
    setJoining(cls.id)
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
      if (!res.ok) {
        setMessage(data.error || 'classes.errorJoinClass')
        setMessageOk(false)
      } else {
        setMessage('classes.successfullyJoined')
        setMessageOk(true)
        window.dispatchEvent(new Event('credits-changed'))
        fetchJoinedClassIds(token).then(setJoinedClassIds)
      }
    } catch (e) {
      setMessage('common.connectionError')
      setMessageOk(false)
    }
    setJoining(null)
  }

  const LANGS = {
    KO: { flag: '🇰🇷', name: t('home.langKorean') },
    ES: { flag: '🇪🇸', name: t('home.langSpanish') },
    DE: { flag: '🇩🇪', name: t('home.langGerman') },
    EN: { flag: '🇬🇧', name: t('home.langEnglish') },
    PT: { flag: '🇧🇷', name: t('home.langPortuguese') },
    FR: { flag: '🇫🇷', name: t('home.langFrench') },
    IT: { flag: '🇮🇹', name: t('home.langItalian') },
  }

  // The level chips filter across every language at once, so they stay bare
  // CEFR until Korean is the selected language — "B1 · TOPIK 3" on a chip that
  // also matches Spanish classes would be claiming something false.

  // "Spanish B1", "Spanish", "B1", or empty when nothing is filtered — covers
  // every combination without needing a separate string for each.
  const emptyLabel = [
    filter !== 'all' ? LANGS[filter]?.name : null,
    levelFilter !== 'all' ? levelFilter : null,
  ].filter(Boolean).join(' ')

  // Carries whatever is filtered into the class form, so someone who can teach
  // this level starts with it already chosen. Empty values are left out rather
  // than sent blank.
  const teachThisHref = '/classes/create?' + new URLSearchParams(
    Object.fromEntries(Object.entries({
      language_code: filter !== 'all' ? filter : '',
      level: levelFilter !== 'all' ? levelFilter : '',
    }).filter(([, v]) => v))
  ).toString()

  const counts = Object.fromEntries(LANG_CODES.map(c => [c, (allUpcoming || []).filter(cls => cls.language_code === c).length]))
  const emptyLangs = allUpcoming ? LANG_CODES.filter(c => counts[c] === 0) : []
  const PILL_SELECT = 'border-2 border-navy rounded-full px-3 py-2 text-sm font-bold text-navy bg-white focus:border-brand-red focus:outline-none'

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-navy leading-tight">{t('classes.exploreTitle')}</h1>
            <p className="text-navy/65 text-sm md:text-base mt-1">{t('classes.exploreSub')}</p>
          </div>
          <a href="/classes/create" className="shrink-0 bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy whitespace-nowrap hover:bg-brand-red-dark transition-colors">+ {t('classes.createShort')}</a>
        </div>

        <TandemGroupsStrip />

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${messageOk ? 'bg-brand-teal/10 text-brand-teal-dark border-brand-teal/30' : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>
            {t(message)}
          </div>
        )}

        <div className="flex gap-1 mb-4 bg-white border-2 border-navy rounded-full p-1 w-fit max-w-full overflow-x-auto">
          {[['classes', t('requests.tabClasses')],
            ['requests', t('requests.tabRequests')],
            ['assignments', t('assignments.tab')]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 md:px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${tab === key ? 'bg-navy text-white' : 'text-navy/65 hover:text-navy'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* One scrolling row instead of two wrapping rows of buttons; the
            count says where the classes are before anyone clicks. */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none]">
          {['all', ...LANG_CODES].map(lang => (
            <button key={lang} onClick={() => setFilter(lang)} aria-pressed={filter === lang}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold border-2 whitespace-nowrap transition-colors ${filter === lang ? 'bg-navy text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
              {lang === 'all' ? t('classes.all') : `${LANGS[lang].flag} ${LANGS[lang].name}`}
              {allUpcoming && (
                <span className={`ml-1.5 font-semibold ${filter === lang ? 'text-white/60' : 'text-navy/45'}`}>
                  {lang === 'all' ? allUpcoming.length : counts[lang]}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'assignments' ? (
          <AssignmentBoard language={filter} currentUser={currentUser} langs={LANGS} />
        ) : tab === 'requests' ? (
          <ClassRequests language={filter} level={levelFilter} currentUser={currentUser} langs={LANGS} />
        ) : (
        <>
        <div className="flex gap-2 mb-6 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('classes.searchPlaceholder')} aria-label={t('classes.searchPlaceholder')}
            className="flex-1 min-w-[180px] border-2 border-navy/20 rounded-full px-4 py-2 text-sm bg-white focus:border-brand-red focus:outline-none transition-colors"/>
          <select aria-label={t('classes.allLevels')} value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className={PILL_SELECT}>
            <option value="all">{t('classes.levelAny')}</option>
            {LEVELS.map(level => <option key={level} value={level}>{levelLabel(filter, level)}</option>)}
          </select>
          <select aria-label={t('classes.filterByTeacher')} value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className={PILL_SELECT}>
            <option value="all">{t('classes.allTeachers')}</option>
            {teacherOptions.map(tch => (
              <option key={tch.id} value={tch.id}>{tch.first_name} {tch.last_name}</option>
            ))}
          </select>
        </div>

        {/* Keyed on the filter so it re-reads its state for each language. */}
        {mounted && filter !== 'all' && (
          <ClassAlertToggle key={`${filter}-${levelFilter}`} language={filter} level={levelFilter} label={emptyLabel} t={t} />
        )}

        {loading && classes.length === 0 && <p className="text-navy/65">{t('classes.loadingClasses')}</p>}

        <div className="space-y-4">
          {classes.map(cls => {
            const next = nextSession(cls)
            const full = (cls.max_students || 0) - (next?.taken ?? 0) <= 0
            return (
              <ClassCard key={cls.id} cls={cls} session={next} user={currentUser} mounted={mounted}
                actions={cls.teacher?.id === currentUser?.id ? (
                  <a href={`/classes/${cls.id}`}
                    className="bg-white text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-cream transition-colors">
                    {t('classes.yourClass')}
                  </a>
                ) : joinedClassIds.has(cls.id) ? (
                  <span className="bg-brand-teal/10 text-brand-teal-dark px-4 py-2 rounded-full text-sm font-bold border-2 border-brand-teal/30">
                    {t('classes.joined')}
                  </span>
                ) : (
                  <button onClick={() => joinClass(cls)}
                    disabled={joining === cls.id || !enrollmentsChecked || full}
                    className="bg-brand-red text-white px-5 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
                    {joining === cls.id ? t('classes.joining') : t('classes.joinBanana')}
                  </button>
                )}/>
            )
          })}

          {/* A guide page links straight here already filtered to its own
              language and level, so this is what its reader sees when nobody
              teaches that combination yet: ask for the class instead. */}
          {!loading && classes.length === 0 && (
            <div className="border-2 border-dashed border-navy rounded-2xl p-5 md:p-6 bg-brand-yellow/10">
              <p className="font-display font-extrabold text-navy text-lg">
                🙋 {emptyLabel ? t('classes.emptyFilteredTitle', { what: emptyLabel }) : t('classes.emptyTitle')}
              </p>
              <p className="text-navy/70 text-sm mt-1 mb-4">{t('classes.requestBody')}</p>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setTab('requests')}
                  className="bg-white text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-cream transition-colors">
                  {t('classes.emptyRequestCta')} →
                </button>
                <a href={teachThisHref} className="text-navy/70 text-sm font-bold hover:text-navy underline">{t('classes.emptyTeachCta')}</a>
              </div>
            </div>
          )}

          {/* Under the full list: the languages nobody teaches yet, in one box. */}
          {!loading && classes.length > 0 && filter === 'all' && emptyLangs.length > 0 && (
            <div className="border-2 border-dashed border-navy rounded-2xl p-5 bg-brand-yellow/10">
              <p className="font-bold text-navy">🙋 {t('classes.noClassesIn', { langs: emptyLangs.map(c => LANGS[c].name).join(', ') })}</p>
              <p className="text-navy/70 text-sm mt-1 mb-3">{t('classes.requestBody')}</p>
              <button onClick={() => setTab('requests')}
                className="bg-white text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-cream transition-colors">
                {t('classes.emptyRequestCta')} →
              </button>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </main>
  )
}
