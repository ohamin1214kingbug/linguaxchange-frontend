/** @type {import('next').NextConfig} */
const nextConfig = {
  // Study guides are served from linguaxchange.com/guides/... rather than
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
