const BASE = 'https://linguaxchange.com'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      // Logged-in areas and auth flows have nothing to index. Teacher
      // profiles are left out too — they're real people's names, photos
      // and bios, so putting them in search results should be a
      // deliberate decision, not a side effect of adding a sitemap.
      disallow: [
        '/admin',
        '/dashboard',
        '/profile',
        '/history',
        '/saved-teachers',
        '/auth/',
        '/classroom/',
        '/teachers/',
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
