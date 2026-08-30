const BASE = 'https://linguaxchange.com'
const API = 'https://linguaxchange-backend-production.up.railway.app'

// Only the pages a logged-out visitor can actually read. Everything else
// is behind login (dashboard, profile, history) or is an auth flow, so
// there's nothing for a crawler to index.
const STATIC_PATHS = ['', '/classes', '/resources', '/legal/privacy', '/legal/terms']

export const revalidate = 3600

export default async function sitemap() {
  const staticEntries = STATIC_PATHS.map(path => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
  }))

  // A published resource is a public page and belongs in the sitemap — this
  // is the mechanism by which the guides are actually discoverable. A failed
  // fetch degrades to the static list rather than breaking the sitemap
  // entirely, since a sitemap missing some URLs beats a sitemap that 500s.
  let resourceEntries = []
  try {
    const res = await fetch(`${API}/api/resources`, { next: { revalidate: 3600 } })
    const data = await res.json()
    resourceEntries = (Array.isArray(data) ? data : []).map(r => ({
      url: `${BASE}/resources/${r.language_code.toLowerCase()}/${r.level.toLowerCase()}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    }))
  } catch (e) {
    console.warn('sitemap: could not fetch resources', e.message)
  }

  return [...staticEntries, ...resourceEntries]
}
