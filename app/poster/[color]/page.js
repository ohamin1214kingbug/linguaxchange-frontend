import { notFound } from 'next/navigation'
import PosterLanding from '../PosterLanding'

// Where the Filología poster QR codes land (owner, 2026-11-25): each poster
// opens a page in its own colours, red /poster/red, yellow /poster/yellow,
// so the scan continues what was on the wall. Separate URLs also show in
// the logs which poster gets scanned. Not indexed: /how-it-works is the
// page for search.
const COLORS = ['red', 'yellow']

export const dynamicParams = false
export function generateStaticParams() {
  return COLORS.map(color => ({ color }))
}

export const metadata = {
  title: 'GongbuLeng · Teach your language, learn another',
  description: 'Small live video classes between students, paid with bananas instead of money. 3 free classes when you sign up.',
  robots: { index: false, follow: true },
}

export default async function PosterPage({ params }) {
  const { color } = await params
  if (!COLORS.includes(color)) notFound()
  return <PosterLanding color={color} />
}
