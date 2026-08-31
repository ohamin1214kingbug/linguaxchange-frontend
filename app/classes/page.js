import ClassesBrowseClient from './ClassesBrowseClient'
import { hasUpcomingSession } from '../../lib/classSchedule'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const SITE = 'https://linguaxchange.com'

// The listings change as classes are created, filled and cancelled, so this is
// short. Long enough that a crawl doesn't hammer Railway, short enough that the
// page isn't advertising classes that already ended.
export const revalidate = 300

// Mirrors the filters ClassesBrowseClient reads off the URL, so the list the
// server renders is the list the client would have fetched. Only language and
// level are honoured here: search and teacher are refinements a visitor makes
// after arriving, not things a crawler or an inbound link needs.
async function getClasses(searchParams) {
  const params = new URLSearchParams()
  const language = searchParams?.language
  const level = searchParams?.level
  if (language) params.set('language_code', String(language).toUpperCase())
  if (level) params.set('level', String(level).toUpperCase())

  try {
    const res = await fetch(`${API}/api/classes?${params.toString()}`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    // The same filter the client applies. Without it the server would render
    // classes that already finished — pages advertising sessions a visitor
    // will never see, because the client drops them the moment it hydrates.
    // A crawler seeing listings a human doesn't is worse than seeing none.
    return (Array.isArray(data) ? data : []).filter(cls => hasUpcomingSession(cls))
  } catch (e) {
    // The client fetches on mount regardless, so a failure here costs the
    // crawler its content but never blocks a real visitor.
    console.warn('classes: server fetch failed', e.message)
    return []
  }
}

// English, like the class and guide pages: this runs on the server, where the
// translation context — a client-side React provider — does not exist. The
// visitor still sees their own language once the page hydrates.
export const metadata = {
  title: 'Browse language classes | LinguaXchange',
  description:
    'Small group language classes in Korean, Spanish, German, English, Portuguese, French and Italian. Teach what you know, learn what you don’t — no subscription.',
  alternates: { canonical: `${SITE}/classes` },
  openGraph: {
    title: 'Browse language classes',
    description: 'Small group language classes, taught by learners. No subscription.',
    url: `${SITE}/classes`,
    type: 'website',
  },
}

export default async function ClassesPage({ searchParams }) {
  const sp = await searchParams
  const classes = await getClasses(sp)
  return <ClassesBrowseClient initialClasses={classes} />
}
