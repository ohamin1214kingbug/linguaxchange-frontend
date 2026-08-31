import ClassDetailClient from './ClassDetailClient'
import { LANGUAGE_NAMES_EN as LANGUAGE_NAMES } from '../../../lib/languages'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const SITE = 'https://linguaxchange.com'

// A class fills up, gets cancelled, or is edited, so a long cache would serve a
// stale seat count. Five minutes stays honest without making every crawl hit
// Railway.
export const revalidate = 300

async function getClass(id) {
  try {
    const res = await fetch(`${API}/api/classes/${id}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const data = await res.json()
    return data?.error ? null : data
  } catch (e) {
    // Falls through to the client component, which fetches on mount as it
    // always did — a page that renders slightly later beats one that 500s.
    return null
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const cls = await getClass(id)
  if (!cls) return { title: 'Class — LinguaXchange' }

  const language = LANGUAGE_NAMES[cls.language_code] || cls.language_code
  const teacher = cls.teacher?.first_name ? ` with ${cls.teacher.first_name}` : ''
  const title = `${cls.title} — ${language} ${cls.level} class${teacher}`

  // The class's own description is the honest summary. A generated fallback
  // beats an empty one, which search engines fill in themselves using whatever
  // text they happen to find first on the page.
  const description = cls.description?.trim()
    || `A live ${language} class at ${cls.level} level on LinguaXchange. Small group, no subscription.`

  const url = `${SITE}/classes/${id}`
  return {
    title: `${title} | LinguaXchange`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article' },
  }
}

export default async function ClassDetailPage({ params }) {
  const { id } = await params
  const cls = await getClass(id)
  return <ClassDetailClient initialClass={cls} />
}
