'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '../../../components/Navbar'

// Opened from the button in the admin's "Someone couldn't get a phone code"
// email (backend utils/adminNotify.js). Sends that member the branded "your
// phone code works now" email from notifications@ (backend routes/admin.js,
// /blocked-reply; owner, 2026-11-27). Admin only; English like the rest of
// the admin pages. Nothing is sent until the admin presses Send.
const auth = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` })
const BTN = 'inline-flex items-center gap-1.5 border-2 border-navy rounded-full px-5 py-2 font-bold transition-colors disabled:opacity-40'

export default function BlockedReplyPage() {
  return <Suspense><BlockedReply/></Suspense>
}

function BlockedReply() {
  const t = useSearchParams().get('t') || ''
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    // The sign-in page has no return link, so say what to do instead.
    if (!localStorage.getItem('token')) { setError('Sign in with the admin account, then open the button in the email again.'); return }
    fetch(`/api/admin/blocked-reply?t=${encodeURIComponent(t)}`, { headers: auth() })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (r.status === 401 || r.status === 403) setError('Sign in with the admin account to use this page.')
        else if (!r.ok) setError(d.error || 'Could not open this link.')
        else { setInfo(d); setSent(d.sent) }
      })
      .catch(() => setError('Could not open this link.'))
  }, [t])

  const send = async () => {
    setBusy(true); setError('')
    const r = await fetch('/api/admin/blocked-reply', { method: 'POST', headers: auth(), body: JSON.stringify({ t }) }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    if (r?.ok || r?.status === 409) setSent(true)
    else setError(d.error || 'The email could not be sent. Try again in a minute.')
    setBusy(false)
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="font-display font-extrabold text-3xl text-navy">📵 Phone code blocked</h1>
        {error && <p className="text-brand-red font-bold mt-4">{error}</p>}
        {info && (
          <div className="bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] p-5 mt-5 text-navy">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="font-bold">Country</dt><dd>{info.country}</dd>
              <dt className="font-bold">Signed up with</dt><dd>{info.method}</dd>
              <dt className="font-bold">To</dt><dd className="break-all">{info.first_name ? `${info.first_name} · ` : ''}{info.email}</dd>
            </dl>
            {info.phone_verified && <p className="mt-3 text-sm font-bold">✅ Their phone is already verified, so they may not need this.</p>}
            <p className="mt-4 text-sm">
              They get <b>“Your phone code works now 📱”</b> with the GongbuLeng banner: sorry the code never reached them, text messages
              to {info.country} are switched on now, and a “Verify my phone” button. From notifications@gongbuleng.com.
            </p>
            <p className="mt-2 text-sm text-navy/70">Switch {info.country} on in Twilio (Verify → Fraud &amp; Geo Permissions → Geo Permissions) before sending.</p>
            {sent
              ? <p className="mt-5 font-bold">✅ Sent.</p>
              : <button onClick={send} disabled={busy} className={`${BTN} mt-5 bg-brand-red text-white hover:bg-brand-red-dark`}>{busy ? 'Sending…' : 'Send the email'}</button>}
          </div>
        )}
      </div>
    </main>
  )
}
