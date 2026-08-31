import { notFound } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const SITE = 'https://linguaxchange.com'

// Server-rendered rather than client-fetched: this is the page that has to be
// readable by a crawler with no JavaScript, which is the entire reason the
// feature was built first.
//
// revalidate rather than force-dynamic, because a guide changes a few times a
// year and a cached page is faster for everyone including the crawler.
export const revalidate = 3600

async function getResource(language, level) {
  try {
    const res = await fetch(`${API}/api/resources/${language}/${level}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

export async function generateMetadata({ params }) {
  const { language, level } = await params
  const resource = await getResource(language, level)
  if (!resource) return { title: 'Study guide — LinguaXchange' }

  const url = `${SITE}/resources/${language.toLowerCase()}/${level.toLowerCase()}`
  const description = resource.description || resource.title
  return {
    title: `${resource.title} — LinguaXchange`,
    description,
    alternates: { canonical: url },
    openGraph: { title: resource.title, description, url, type: 'article' },
  }
}

export default async function ResourceDetail({ params }) {
  const { language, level } = await params
  const resource = await getResource(language, level)
  if (!resource) notFound()

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <a href="/resources" className="text-brand-red font-bold text-sm hover:underline">← All study guides</a>

        <div className="flex gap-2 mt-6 mb-3">
          <span className="bg-navy text-white text-xs font-bold px-3 py-1 rounded-full">{resource.level}</span>
          <span className="bg-white text-navy border-2 border-navy/20 text-xs font-bold px-3 py-1 rounded-full">{resource.language_code}</span>
        </div>

        <h1 className="font-display font-extrabold text-3xl text-navy mb-3">{resource.title}</h1>
        {resource.description && (
          <p className="text-navy/70 leading-relaxed mb-8">{resource.description}</p>
        )}

        <a href={resource.pdf_url}
          className="inline-block bg-brand-red text-white px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red/90 transition-colors">
          Download PDF
        </a>

        {resource.source_url && (
          // Subordinate to the download on purpose: our guide is the content,
          // the syllabus is the reference it aligns with.
          <p className="mt-5">
            <a href={resource.source_url} target="_blank" rel="noopener noreferrer"
              className="text-navy/60 text-sm hover:text-navy underline">
              Official exam syllabus ↗
            </a>
          </p>
        )}

        {resource.attribution && (
          <p className="mt-6 text-navy/40 text-xs leading-relaxed">{resource.attribution}</p>
        )}

        {/* The reason this page is worth ranking. Someone reading about what
            to study at this level is the best-qualified visitor the site
            gets, and without this the page hands them a PDF and says
            goodbye. Pre-filtered to the level they were just reading about. */}
        <div className="mt-12 pt-8 border-t border-navy/10">
          <p className="font-display font-extrabold text-xl text-navy mb-2">
            Practise this level with a real person
          </p>
          <p className="text-navy/60 text-sm leading-relaxed mb-4">
            Reading about a grammar point is not the same as using it under pressure.
            LinguaXchange runs small group classes where you teach what you know and
            learn what you don&apos;t — no subscription.
          </p>
          <a href={`/classes?language=${resource.language_code}&level=${resource.level}`}
            className="inline-block bg-navy text-white px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-navy/90 transition-colors">
            See {resource.level} classes →
          </a>
        </div>
      </div>
    </main>
  )
}
