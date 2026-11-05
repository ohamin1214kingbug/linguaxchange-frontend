import ResourcesGridClient from './ResourcesGridClient'
import { languageOptions } from '../../lib/languages'
import { translations } from '../../lib/i18n/translations'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const SITE = 'https://gongbuleng.com'

// Guides change rarely — a level's contents are stable for months — so this is
// the same hour the sitemap uses.
export const revalidate = 3600

// English, like the guide pages themselves: this runs on the server, where the
// translation context is a client-side React provider that does not exist. The
// visitor still gets their own language once the grid hydrates.
//
// Built from the guides that actually exist. The languages are named on
// purpose — "Spanish B1 study guide" is what someone actually types — and this
// used to be a hand-written string that went stale twice: Spanish-only after
// the Korean guides shipped, then "Spanish and Korean" as five more languages
// arrived. Now it cannot disagree with the grid below it.
//
// The openGraph pair stays language-neutral: a shared link cannot go out of
// date, and the card has no search term to match anyway.
const englishName = key => key.split('.').reduce((o, part) => o?.[part], translations.EN)

async function loadResources() {
  try {
    const res = await fetch(`${API}/api/resources`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (e) {
    // The client refetches when the server never got an answer, so a failure
    // here costs the crawler its links but never blocks a visitor.
    console.warn('resources: server fetch failed', e.message)
    return null
  }
}

export async function generateMetadata() {
  const withGuides = new Set((await loadResources() || []).map(r => r.language_code))
  const names = languageOptions(englishName).filter(l => withGuides.has(l.code)).map(l => l.name)
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]
  return {
    title: names.length > 2
      ? `Free study guides in ${names.length} languages | GongbuLeng`
      : `Free ${list ? `${list} ` : ''}study guides | GongbuLeng`,
    description: `What to study at every CEFR level, written by GongbuLeng. Free PDF guides${list ? ` for ${list}` : ''}, A1 to B2 — no account needed.`,
    alternates: { canonical: `${SITE}/resources` },
    openGraph: {
      title: 'Free study guides',
      description: 'What to study at every level. Free PDF guides, no account needed.',
      url: `${SITE}/resources`,
      type: 'website',
    },
  }
}

export default async function ResourcesPage() {
  // Same request as generateMetadata; Next.js deduplicates it.
  const resources = await loadResources()
  // Same distinction the classes page needs: an empty result is not the same
  // as no result. Without it, a grid with no published guides would render its
  // loading state to crawlers rather than its empty state.
  return <ResourcesGridClient initialResources={resources || []} serverFetched={resources !== null} />
}
