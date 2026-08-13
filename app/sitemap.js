const BASE = 'https://linguaxchange.com'

// Only the pages a logged-out visitor can actually read. Everything else
// is behind login (dashboard, profile, history) or is an auth flow, so
// there's nothing for a crawler to index.
export default function sitemap() {
  return ['', '/classes', '/legal/privacy', '/legal/terms'].map(path => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
  }))
}
