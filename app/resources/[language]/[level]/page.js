import { notFound } from 'next/navigation'
import { levelLabel, LANGUAGE_NAMES_EN } from '../../../../lib/languages'
import LevelQuiz from '../../../../components/LevelQuiz'
import GuideBody from '../../../../components/GuideBody'
import { readGuide } from '../../../../lib/guideSource'
import { guideLabels } from '../../../../lib/guideFormat.mjs'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const SITE = 'https://gongbuleng.com'

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
  if (!resource) return { title: 'Study guide — GongbuLeng' }

  const url = `${SITE}/resources/${language.toLowerCase()}/${level.toLowerCase()}`
  const description = resource.description || resource.title
  return {
    title: `${resource.title} — GongbuLeng`,
    description,
    alternates: { canonical: url },
    openGraph: { title: resource.title, description, url, type: 'article' },
  }
}

export default async function ResourceDetail({ params }) {
  const { language, level } = await params
  const resource = await getResource(language, level)
  if (!resource) notFound()
  // A rewritten guide shows its whole text here; older ones stay download-only.
  const guide = readGuide(language, level)
  // A guide written for speakers of another language names itself in it (en-*: Inglés).
  const languageName = guide?.meta.language || LANGUAGE_NAMES_EN[resource.language_code] || resource.language_code

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Gongbu<span className="text-brand-red">Leng</span></a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <a href="/resources" className="text-brand-red font-bold text-sm hover:underline">← All study guides</a>

        {guide ? (
          <>
            {/* Colour-block cover, like the guide sections below it. */}
            <div className="mt-6 mb-5 rounded-3xl border-[3px] border-navy shadow-[0_6px_0_#1a1a2e] overflow-hidden">
              <div className="bg-brand-red text-white px-6 pt-6 overflow-hidden">
                <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-[1.02]">
                  <span className="block text-xs font-extrabold uppercase tracking-[0.16em] text-white/85 mb-3">{languageName} {resource.level} · free study guide</span>
                  {guide.meta.title}
                </h1>
                <div className="flex items-end justify-between gap-3 mt-3">
                  <span className="mb-6 bg-navy text-white text-xs font-extrabold tracking-wide px-3.5 py-2 rounded-full whitespace-nowrap">{levelLabel(resource.language_code, resource.level)}</span>
                  <span aria-hidden="true" className="font-display font-extrabold text-[8rem] md:text-[10rem] leading-[0.75] -mb-3 tracking-tight">{resource.level}</span>
                </div>
              </div>
              {guide.meta.promise && <p className="bg-navy text-white px-6 py-4 leading-relaxed">{guide.meta.promise}</p>}
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href={resource.pdf_url}
                className="flex-1 min-w-36 text-center bg-brand-red text-white px-5 py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red/90 transition-colors">
                Download PDF
              </a>
              <a href="#level-check"
                className="flex-1 min-w-36 text-center bg-white text-navy px-5 py-3 rounded-full font-bold border-2 border-navy hover:bg-navy hover:text-white transition-colors">
                Check my level
              </a>
            </div>
            <p className="text-navy/65 text-sm mt-3 mb-6">
              {guide.meta.read ? `${guide.meta.read} min read · ` : ''}{guide.sections.length} sections · free, no account needed
            </p>
            <GuideBody guide={guide} />
          </>
        ) : (
          <>
            <div className="flex gap-2 mt-6 mb-3">
              <span className="bg-navy text-white text-xs font-bold px-3 py-1 rounded-full">{levelLabel(resource.language_code, resource.level)}</span>
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
          </>
        )}

        {resource.source_url && (
          // Subordinate to the download on purpose: our guide is the content,
          // the syllabus is the reference it aligns with.
          <p className="mt-5">
            <a href={resource.source_url} target="_blank" rel="noopener noreferrer"
              className="text-navy/65 text-sm hover:text-navy underline">
              Official exam syllabus ↗
            </a>
          </p>
        )}

        {guide?.meta.source && (
          <p className="mt-6 text-navy/65 text-xs leading-relaxed">{guideLabels(guide.meta.ui).writtenBy} {guide.meta.source}</p>
        )}
        {!guide && resource.attribution && (
          <p className="mt-6 text-navy/65 text-xs leading-relaxed">{resource.attribution}</p>
        )}

        {/* A reader who isn't sure the level fits gets a direction instead
            of a guess. Renders nothing for languages without a question set. */}
        <div id="level-check" className="scroll-mt-16" />
        <LevelQuiz language={resource.language_code}
          languageName={LANGUAGE_NAMES_EN[resource.language_code] || resource.language_code}
          currentLevel={resource.level} />

        {/* The reason this page is worth ranking. Someone reading about what
            to study at this level is the best-qualified visitor the site
            gets, and without this the page hands them a PDF and says
            goodbye. Pre-filtered to the level they were just reading about. */}
        <div className="mt-12 pt-8 border-t border-navy/10">
          <p className="font-display font-extrabold text-xl text-navy mb-2">
            Practise this level with a real person
          </p>
          <p className="text-navy/65 text-sm leading-relaxed mb-4">
            Reading about a grammar point is not the same as using it under pressure.
            GongbuLeng runs small group classes where you teach what you know and
            learn what you don&apos;t — no subscription.
          </p>
          <a href={`/classes?language=${resource.language_code}&level=${resource.level}`}
            className="inline-block bg-navy text-white px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-navy/90 transition-colors">
            See {levelLabel(resource.language_code, resource.level)} classes →
          </a>
        </div>

        {/* The other side of the same page: the site has learners asking for
            classes and few teachers posting them. A native speaker reading a
            guide in their own language already has a lesson plan in hand. */}
        <div className="mt-8 pt-8 border-t border-navy/10">
          <p className="font-display font-extrabold text-xl text-navy mb-2">
            Speak {LANGUAGE_NAMES_EN[resource.language_code] || resource.language_code}? Teach this level
          </p>
          <p className="text-navy/65 text-sm leading-relaxed mb-4">
            Use this guide as your lesson plan. We fill in the language, level and topic
            for you; you pick a time. Every student who joins earns you a banana to spend
            on your own classes.
          </p>
          <a href={`/classes/create?${new URLSearchParams({
              language_code: resource.language_code,
              level: resource.level,
              topic: `${resource.title.split(":")[0].trim()} practice`,
              guide: `${SITE}/resources/${language.toLowerCase()}/${level.toLowerCase()}`,
            })}`}
            className="inline-block border-2 border-navy text-navy px-6 py-3 rounded-full font-bold hover:bg-navy hover:text-white transition-colors">
            Teach a class with this guide →
          </a>
        </div>
      </div>
    </main>
  )
}
