/** @type {import('next').NextConfig} */
const nextConfig = {
  // Study guides are served from gongbuleng.com/guides/... rather than
  // from the Supabase project hostname they are actually stored on.
  //
  // A rewrite, not a redirect: the address bar stays on our domain, so a
  // guide someone links to or bookmarks builds authority for this site
  // rather than for supabase.co. The guides are the SEO asset — they are in
  // the sitemap and submitted to Search Console — and pointing that at a
  // storage provider's domain gives the benefit away.
  //
  // Uploading is unchanged: the admin panel still writes to the same bucket.
  // Only the address people see is different.
  // Until 2026-09 the site sent only HSTS; the API already had helmet's set.
  //
  // - frame-ancestors / X-Frame-Options: no other site may frame these
  //   pages, which closes clickjacking (an invisible framed "Join class" or
  //   "Delete account" under a decoy button). Nothing here frames its own
  //   pages. This does not touch the Jitsi video iframe the classroom embeds:
  //   these govern who may frame us, not what we frame.
  // - nosniff: a response is only ever run as the type it declares.
  // - Referrer-Policy: other sites get the origin, never the path. The
  //   participation record's URL is its credential (/record/<token>), so a
  //   full-URL referrer would hand the token to every third party the page
  //   loads. Modern browsers default to this; the header makes it a floor.
  //
  // Deliberately absent: Permissions-Policy (the classroom iframe needs
  // camera, microphone and screen share delegated to 8x8.vc) and a full CSP
  // (inline Next scripts, Supabase, Google sign-in, analytics and Jitsi
  // would all need allow-listing — a separate, testable change).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: '/guides/:file',
        destination:
          'https://shrsxgzrdbxlptwzuevb.supabase.co/storage/v1/object/public/resources/:file',
      },
    ]
  },
};

export default nextConfig;
