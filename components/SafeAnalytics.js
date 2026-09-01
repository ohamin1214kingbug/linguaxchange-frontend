'use client'
import { Analytics } from '@vercel/analytics/next'

// Three pages carry a secret in their URL. /auth/reset-password and
// /university/confirm take one as ?token=<single-use credential>; the
// participation record carries it as a PATH segment, /record/<token>, and is
// the reason this handles both shapes rather than query params alone.
//
// Vercel Analytics reports the full URL of every page view, so the plain
// <Analytics /> POSTs those tokens to a third party while they are still
// valid — a password-reset token among them. Nothing about that is visible
// from reading either page; it happens in the layout, one component away.
//
// beforeSend runs on every event before it leaves the browser. Redacting here
// rather than in each page means a future page that accepts a token in its URL
// is covered without anyone having to remember.
export default function SafeAnalytics() {
  return (
    <Analytics
      beforeSend={event => {
        try {
          const url = new URL(event.url)
          let changed = false

          // ?token=… — password reset and university confirmation.
          if (url.searchParams.has('token')) {
            url.searchParams.set('token', 'redacted')
            changed = true
          }

          // /record/<token> — the participation record puts its credential in
          // the PATH, not the query string, so the check above misses it
          // entirely. Redacting only query params left this one leaking whole.
          if (/^\/record\/[^/]+/.test(url.pathname)) {
            url.pathname = '/record/redacted'
            changed = true
          }

          return changed ? { ...event, url: url.toString() } : event
        } catch (e) {
          // A URL that will not parse cannot be sanitised. Drop the event
          // rather than risk reporting a live token.
          return null
        }
      }}
    />
  )
}
