'use client'
import { Analytics } from '@vercel/analytics/next'

// Two pages receive a secret in the query string: /auth/reset-password and
// /university/confirm both arrive as ?token=<single-use credential>.
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
          if (!url.searchParams.has('token')) return event
          url.searchParams.set('token', 'redacted')
          return { ...event, url: url.toString() }
        } catch (e) {
          // A URL that will not parse cannot be sanitised. Drop the event
          // rather than risk reporting a live token.
          return null
        }
      }}
    />
  )
}
