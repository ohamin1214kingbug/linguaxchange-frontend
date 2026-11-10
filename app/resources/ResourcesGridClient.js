'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions, LEVELS, LANGUAGE_COLORS } from '../../lib/languages'
import Link from 'next/link'
import Navbar from '../../components/Navbar'

const API = ''

// Only the levels a guide could plausibly exist for. C1 and C2 are in the
// schema but showing empty columns for them would make the grid look
// abandoned rather than growing.
const GRID_LEVELS = LEVELS.slice(0, 4)

const CARD = 'border-2 border-navy rounded-2xl overflow-hidden shadow-[4px_4px_0_var(--color-navy)]'

// `initialResources` comes from the server component in page.js. Without it
// the whole grid sat behind a `loading` gate, so the server HTML was the word
// "Loading" and contained no link to any guide — leaving the four
// server-rendered guide pages with no internal inbound links at all, findable
// only through the sitemap.
export default function ResourcesGridClient({ initialResources = [], serverFetched = false }) {
  const { t } = useLanguage()
  const [resources, setResources] = useState(initialResources)
  const [loading, setLoading] = useState(!serverFetched)

  useEffect(() => {
    // The server already fetched this; refetching would only repeat a request
    // whose answer is already on screen.
    if (serverFetched) return
    fetch(`${API}/api/resources`)
      .then(r => r.json())
      .then(d => setResources(Array.isArray(d) ? d : []))
      .catch(e => console.warn('resources: could not load', e.message))
      .finally(() => setLoading(false))
  }, [])

  const languages = languageOptions(t)
  const has = (code, level) =>
    resources.some(r => r.language_code === code && r.level === level)

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-12">
        <div className="flex flex-wrap gap-2 mb-4 text-sm font-bold text-navy">
          <span className="bg-brand-yellow border-2 border-navy rounded-full px-3 py-0.5">{t('resources.badgeFree')}</span>
          <span className="bg-brand-blue/15 border-2 border-navy rounded-full px-3 py-0.5">A1 → B2</span>
          <span className="bg-white border-2 border-navy rounded-full px-3 py-0.5" aria-hidden="true">{languages.map(l => l.flag).join(' ')}</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-navy mb-2">{t('resources.title')}</h1>
        <p className="text-navy/65 mb-8 max-w-xl">{t('resources.subtitle')}</p>

        {loading && <p className="text-navy/65">{t('common.loading')}</p>}

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {languages.map(lang => {
              const color = LANGUAGE_COLORS[lang.code]
              const count = GRID_LEVELS.filter(level => has(lang.code, level)).length
              return (
                <section key={lang.code} className={`${CARD} bg-white`}>
                  <div className={`h-2.5 border-b-2 border-navy ${color.band}`} />
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`w-12 h-12 shrink-0 rounded-full border-2 border-navy flex items-center justify-center text-2xl ${color.tint}`} aria-hidden="true">{lang.flag}</span>
                      <div>
                        <h2 className="font-display font-bold text-lg text-navy leading-tight">{lang.name}</h2>
                        <p className="text-navy/65 text-sm">{t('resources.guideCount', { n: count })}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {GRID_LEVELS.map(level => has(lang.code, level) ? (
                        <a key={level} href={`/resources/${lang.code.toLowerCase()}/${level.toLowerCase()}`}
                          aria-label={`${lang.name} ${level}`}
                          className={`flex-1 text-center text-navy border-2 border-navy py-1.5 rounded-full text-sm font-bold transition-colors ${color.tint} ${color.hover}`}>
                          {level}
                        </a>
                      ) : (
                        // Shown, not hidden, so sparse coverage reads as a
                        // grid still filling up instead of a broken page.
                        <span key={level} title={t('resources.comingSoon')}
                          className="flex-1 text-center text-navy/65 border-2 border-dashed border-navy/30 py-1.5 rounded-full text-sm font-bold">
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              )
            })}

            {/* The guides are how most visitors arrive; this sends them on
                to the thing the site is actually for. */}
            <section className={`${CARD} bg-brand-yellow`}>
              <div className="h-2.5 border-b-2 border-navy bg-navy" />
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-navy leading-tight">{t('resources.ctaTitle')} 🍌</h2>
                  <p className="text-navy text-sm mt-1">{t('resources.ctaBody')}</p>
                </div>
                <Link href="/classes" className="self-start bg-brand-red text-white border-2 border-navy rounded-full px-5 py-2 text-sm font-bold hover:bg-brand-red-dark transition-colors">
                  {t('common.explore')}
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
