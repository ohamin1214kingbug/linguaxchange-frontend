import { notFound } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// Never cached: a record is read by someone deciding whether to trust it, and a
// stale one understates what the member has done since. It is also revocable,
// and a cached copy would outlive the revocation.
export const dynamic = 'force-dynamic'

// English only, like the guide and class pages: this is a server component and
// the translation layer is a client-side React context. It is also read mostly
// by university staff rather than by the member.
export const metadata = {
  title: 'Participation record | LinguaXchange',
  // The page names a real person and lists their activity. It is shared
  // deliberately by that person and must never enter a search index.
  robots: { index: false, follow: false },
}

const hours = mins => (mins / 60).toFixed(mins % 60 === 0 ? 0 : 1)
// timeZone pinned, not just locale. Without it the date is formatted in the
// SERVER's zone: a session at 00:30 UTC renders as the previous day on any
// host west of UTC. Vercel runs UTC today, so this changes nothing now — but
// on a document a university is meant to trust, the date should not depend on
// where the process happens to run.
const day = iso => (iso
  ? new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    })
  : null)

export default async function RecordPage({ params }) {
  const { token } = await params

  let record = null
  try {
    const res = await fetch(`${API}/api/records/${token}`, { cache: 'no-store' })
    if (res.ok) record = await res.json()
  } catch (e) {
    // Falls through to notFound below rather than showing a broken page.
  }
  if (!record) notFound()

  const rows = [
    ['Classes attended', record.attendedCount, `${hours(record.attendedMinutes)} h`],
    ['Classes taught', record.taughtCount, `${hours(record.taughtMinutes)} h`],
  ]

  return (
    <main className="min-h-screen bg-cream print:bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border-2 border-navy rounded-2xl p-8 print:border-0 print:p-0">
          <p className="text-navy/50 text-xs font-bold uppercase tracking-wide mb-1">Participation record</p>
          <h1 className="font-display font-extrabold text-3xl text-navy mb-2">{record.name}</h1>

          {record.university && (
            <p className="text-navy/70 mb-6">
              🎓 {record.university}
              {record.verifiedAt && <span className="text-navy/40"> · verified {day(record.verifiedAt)}</span>}
            </p>
          )}

          <table className="w-full mb-6">
            <tbody>
              {rows.map(([label, count, time]) => (
                <tr key={label} className="border-t border-navy/10">
                  <td className="py-3 text-navy/70">{label}</td>
                  <td className="py-3 text-right font-bold text-navy">{count}</td>
                  <td className="py-3 text-right text-navy/60 w-20">{time}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {record.languages.length > 0 && (
            <p className="text-navy/70 text-sm mb-1">
              <span className="font-bold">Languages:</span> {record.languages.join(', ')}
            </p>
          )}
          {record.levels.length > 0 && (
            <p className="text-navy/70 text-sm mb-1">
              <span className="font-bold">Levels:</span> {record.levels.join(', ')}
            </p>
          )}
          {record.firstActivity && (
            <p className="text-navy/70 text-sm">
              <span className="font-bold">Active:</span> {day(record.firstActivity)} – {day(record.lastActivity)}
            </p>
          )}

          {record.attendedCount === 0 && record.taughtCount === 0 && (
            /* An honest empty record is more credible than a broken page, and
               refusing to generate one would make the feature look broken for
               every new member. */
            <p className="text-navy/50 text-sm">No classes attended or taught yet.</p>
          )}

          <p className="text-navy/40 text-xs mt-8 pt-4 border-t border-navy/10">
            Generated {day(record.generatedAt)} by LinguaXchange · linguaxchange.com
          </p>
        </div>
      </div>
    </main>
  )
}
