'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Navbar from '../../components/Navbar'
import ClassRequests from '../../components/ClassRequests'
import { formatInTimezone, utcLabel } from '../../lib/timezone'
import { hasUpcomingSession } from '../../lib/classSchedule'
import { fetchJoinedClassIds } from '../../lib/enrollments'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// `initialClasses` comes from the server component in page.js, already
// filtered to whatever the URL asked for. Seeding state with it is what puts
// the listings into the server-rendered HTML — a client component is still
// prerendered on the server, but the useEffect that fetches them never runs
// during that pass, so this page used to ship an empty list to crawlers.
export default function ClassesBrowseClient({ initialClasses = [] }) {
  const { t } = useLanguage()
  const [classes, setClasses] = useState(initialClasses)
  const [teacherOptions, setTeacherOptions] = useState([])
  const [loading, setLoading] = useState(!initialClasses.length)
  const [tab, setTab] = useState('classes')
  const [filter, setFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
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

  // Unfiltered, fetched once — used only to populate the teacher dropdown so
  // picking a teacher doesn't shrink the dropdown's own option list.
  useEffect(() => {
    fetch(`${API}/api/classes`)
      .then(res => res.json())
      .then(data => {
        const teachers = Array.isArray(data) ? data.map(c => c.teacher).filter(Boolean) : []
        const unique = Array.from(new Map(teachers.map(tch => [tch.id, tch])).values())
        setTeacherOptions(unique)
      })

    setMounted(true)

    // Arrived from a study guide, which links here already narrowed to that
    // language and level. Read off window.location rather than
    // useSearchParams(), which would drag a Suspense boundary into an
    // otherwise plain client page — the same call the class creation page
    // makes. Unknown values are harmless: they return no classes, and the
    // dropdowns still let the visitor widen the search.
    const params = new URLSearchParams(window.location.search)
    const lang = params.get('language')
    const level = params.get('level')
    if (lang) setFilter(lang.toUpperCase())
    if (level) setLevelFilter(level.toUpperCase())

    const stored = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (stored && token) {
      const u = JSON.parse(stored)
      setCurrentUser(u)
      fetchJoinedClassIds(token).then(setJoinedClassIds)
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
      window.location.href = '/auth/login'
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

  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="flex items-center justify-between gap-4 mb-6 md:mb-8">
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-navy">{t('classes.browseClasses')}</h1>
          <a href="/classes/create" className="bg-brand-red text-white px-3 md:px-4 py-2 rounded-full text-sm font-bold border-2 border-navy whitespace-nowrap">+ {t('classes.createClass')}</a>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm font-medium border-2 ${messageOk ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/30' : 'bg-brand-red/10 text-brand-red border-brand-red/30'}`}>
            {t(message)}
          </div>
        )}

        <div className="flex gap-1 mb-6 bg-white border-2 border-navy rounded-full p-1 w-fit">
          {[['classes', t('requests.tabClasses')], ['requests', t('requests.tabRequests')]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 md:px-5 py-2 rounded-full text-sm font-bold transition-colors ${tab === key ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          {['all', 'KO', 'ES', 'DE', 'EN', 'PT', 'FR', 'IT'].map(lang => (
            <button key={lang} onClick={() => setFilter(lang)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${filter === lang ? 'bg-brand-red text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
              {lang === 'all' ? t('classes.all') : `${LANGS[lang].flag} ${LANGS[lang].name}`}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', ...LEVELS].map(level => (
            <button key={level} onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${levelFilter === level ? 'bg-navy text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
              {level === 'all' ? t('classes.allLevels') : level}
            </button>
          ))}
        </div>

        {tab === 'requests' ? (
          <ClassRequests language={filter} level={levelFilter} currentUser={currentUser} langs={LANGS} />
        ) : (
        <>
        <div className="flex gap-3 mb-8 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('classes.searchPlaceholder')}
            className="flex-1 min-w-[200px] border-2 border-navy/20 rounded-full px-4 py-2 text-sm focus:border-brand-red focus:outline-none transition-colors"/>
          <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}
            className="border-2 border-navy/20 rounded-full px-4 py-2 text-sm text-navy focus:border-brand-red focus:outline-none transition-colors">
            <option value="all">{t('classes.allTeachers')}</option>
            {teacherOptions.map(tch => (
              <option key={tch.id} value={tch.id}>{tch.first_name} {tch.last_name}</option>
            ))}
          </select>
        </div>

        {loading && classes.length === 0 && <p className="text-navy/40">{t('classes.loadingClasses')}</p>}

        <div className="space-y-4">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl p-4 md:p-6 border-2 border-navy">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{LANGS[cls.language_code]?.flag}</span>
                    <span className="bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">{cls.level}</span>
                    <span className="bg-navy/5 text-navy/60 px-2 py-0.5 rounded-full text-xs font-medium">{cls.duration_minutes} {t('classes.min')}</span>
                  </div>
                  {/* The card's only link to the class for anyone who isn't its
                      teacher — the button on the right is a Join action, and
                      renders a link only for your own classes. Without this the
                      class pages have no inbound links at all and a crawler can
                      reach them only through the sitemap. */}
                  <h3 className="font-display font-bold text-navy text-lg mb-1">
                    <a href={`/classes/${cls.id}`} className="hover:text-brand-red transition-colors">{cls.title}</a>
                  </h3>
                  {cls.description && <p className="text-navy/60 text-sm mb-2">{cls.description}</p>}
                  {cls.class_sessions?.[0]?.session_date && (
                    <p className="text-brand-red text-xs font-bold mb-1">
                      🗓️ {mounted ? formatInTimezone(cls.class_sessions[0].session_date, currentUser?.timezone, currentUser?.time_format) : utcLabel(cls.class_sessions[0].session_date)}
                    </p>
                  )}
                  <p className="text-navy/40 text-xs">
                    {cls.topic} · {t('classes.maxStudents', { n: cls.max_students })}
                    {cls.teacher && (
                      <>
                        {' · '}
                        <a href={`/teachers/${cls.teacher.id}`}
                          className="text-brand-red font-bold hover:underline">
                          {cls.teacher.first_name} {cls.teacher.last_name}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {cls.teacher?.id === currentUser?.id ? (
                    <a href={`/classes/${cls.id}`}
                      className="bg-navy/5 text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-navy/10 transition-colors">
                      {t('classes.yourClass')}
                    </a>
                  ) : joinedClassIds.has(cls.id) ? (
                    <span className="bg-brand-teal/10 text-brand-teal px-4 py-2 rounded-full text-sm font-bold border-2 border-brand-teal/30">
                      {t('classes.joined')}
                    </span>
                  ) : (
                    <>
                      <span className="text-navy/70 text-sm font-bold">{t('classes.oneCredit')}</span>
                      <button onClick={() => joinClass(cls)}
                        disabled={joining === cls.id}
                        className="bg-brand-red text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark disabled:opacity-50 transition-colors">
                        {joining === cls.id ? t('classes.joining') : t('classes.joinClass')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!loading && classes.length === 0 && (
            <p className="text-navy/40 text-center py-12">
              {(filter !== 'all' || levelFilter !== 'all' || teacherFilter !== 'all' || search.trim())
                ? t('classes.noClassesMatch')
                : t('classes.noClassesYet')}
            </p>
          )}
        </div>
        </>
        )}
      </div>
    </main>
  )
}
