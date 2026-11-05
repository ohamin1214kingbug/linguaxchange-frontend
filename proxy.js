import { NextResponse } from 'next/server'

// The browser calls the API at gongbuleng.com/api/..., and this forwards it to
// Railway. UCM's campus DNS blocks Railway hostnames (both the default
// *.up.railway.app host and api.gongbuleng.com, which points at one), so on
// university Wi-Fi a direct call never left the browser. gongbuleng.com
// itself resolves there, and the API can't be blocked without the site.
//
// API_ORIGIN is overridable only so the proxy can be tried against a local
// server; production uses the default.
const API_ORIGIN = process.env.API_ORIGIN || 'https://linguaxchange-backend-production.up.railway.app'

export function proxy(request) {
  const headers = new Headers(request.headers)
  // Vercel overwrites X-Forwarded-For with the visitor's real address, so the
  // browser can't choose it. The backend keys its rate limits on x-client-ip,
  // but only when x-proxy-secret matches (middleware/rateLimit.js) — every
  // proxied request otherwise looks like it comes from Vercel.
  headers.delete('x-client-ip')
  headers.delete('x-proxy-secret')
  const clientIp = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  if (clientIp) headers.set('x-client-ip', clientIp)
  if (process.env.API_PROXY_SECRET) headers.set('x-proxy-secret', process.env.API_PROXY_SECRET)

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, API_ORIGIN)
  return NextResponse.rewrite(target, { request: { headers } })
}

// Uploads skip this function: Vercel caps a function's request body at 4.5MB,
// and a base64 PDF or photo is often bigger. They go through the plain
// rewrite in next.config.mjs instead, which has no such cap. Those routes
// carry no rate limit, so they don't need the visitor IP this adds.
// Keep this list in sync with UPLOAD_ROUTES there.
export const config = {
  matcher: '/api/((?!classes/[^/]+/materials-pdf$|resources/[^/]+/pdf$|users/[^/]+/avatar$|reports$).*)',
}
