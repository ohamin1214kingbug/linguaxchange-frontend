import ResourcesGridClient from './ResourcesGridClient'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const SITE = 'https://linguaxchange.com'

// Guides change rarely — a level's contents are stable for months — so this is
// the same hour the sitemap uses.
export const revalidate = 3600

// English, like the guide pages themselves: this runs on the server, where the
// translation context is a client-side React provider that does not exist. The
// visitor still gets their own language once the grid hydrates.
// The languages are named here on purpose — "Spanish B1 study guide" is what
// someone actually types — which means this string goes stale the moment a
// language is added. It already did once, staying Spanish-only after the
// Korean guides shipped. Adding a language means editing this line.
//
// The openGraph pair below is deliberately language-neutral for that reason:
// a shared link cannot go out of date, and the card has no search term to
// match anyway.
export const metadata = {
  title: 'Free Spanish and Korean study guides | LinguaXchange',
  description:
    'What to study at every CEFR level, written by LinguaXchange. Free PDF guides for Spanish A1 to B2 and Korean TOPIK 1 to 4 — no account needed.',
  alternates: { canonical: `${SITE}/resources` },
  openGraph: {
    title: 'Free study guides',
    description: 'What to study at every level. Free PDF guides, no account needed.',
    url: `${SITE}/resources`,
    type: 'website',
  },
}

export default async function ResourcesPage() {
  let resources = null
  try {
    const res = await fetch(`${API}/api/resources`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      resources = Array.isArray(data) ? data : []
    }
  } catch (e) {
    // The client refetches when the server never got an answer, so a failure
    // here costs the crawler its links but never blocks a visitor.
    console.warn('resources: server fetch failed', e.message)
  }
  // Same distinction the classes page needs: an empty result is not the same
  // as no result. Without it, a grid with no published guides would render its
  // loading state to crawlers rather than its empty state.
  return <ResourcesGridClient initialResources={resources || []} serverFetched={resources !== null} />
}
