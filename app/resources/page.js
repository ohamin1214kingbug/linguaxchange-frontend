import ResourcesGridClient from './ResourcesGridClient'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const SITE = 'https://linguaxchange.com'

// Guides change rarely — a level's contents are stable for months — so this is
// the same hour the sitemap uses.
export const revalidate = 3600

// English, like the guide pages themselves: this runs on the server, where the
// translation context is a client-side React provider that does not exist. The
// visitor still gets their own language once the grid hydrates.
export const metadata = {
  title: 'Free Spanish study guides | LinguaXchange',
  description:
    'What to study at every CEFR level, written by LinguaXchange. Free PDF guides for Spanish A1 to B2 — no account needed.',
  alternates: { canonical: `${SITE}/resources` },
  openGraph: {
    title: 'Free study guides',
    description: 'What to study at every level. Free PDF guides, no account needed.',
    url: `${SITE}/resources`,
    type: 'website',
  },
}

export default async function ResourcesPage() {
  let resources = []
  try {
    const res = await fetch(`${API}/api/resources`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      resources = Array.isArray(data) ? data : []
    }
  } catch (e) {
    // The client fetches on mount when handed an empty list, so a failure here
    // costs the crawler its links but never blocks a visitor.
    console.warn('resources: server fetch failed', e.message)
  }
  return <ResourcesGridClient initialResources={resources} />
}
