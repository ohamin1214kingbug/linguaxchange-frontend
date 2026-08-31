'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions, LEVELS } from '../../lib/languages'
import LanguageSwitcher from '../../components/LanguageSwitcher'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// Only the levels a guide could plausibly exist for. C1 and C2 are in the
// schema but showing empty columns for them would make the grid look
// abandoned rather than growing.
const GRID_LEVELS = LEVELS.slice(0, 4)

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
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <LanguageSwitcher />
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-navy mb-2">{t('resources.title')}</h1>
        <p className="text-navy/60 mb-10 max-w-xl">{t('resources.subtitle')}</p>

        {loading && <p className="text-navy/40">{t('common.loading')}</p>}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-navy/40 text-xs font-bold uppercase tracking-wide pb-3 pr-4"></th>
                  {GRID_LEVELS.map(level => (
                    <th key={level} className="text-navy/40 text-xs font-bold uppercase tracking-wide pb-3 px-2">{level}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {languages.map(lang => (
                  <tr key={lang.code} className="border-t border-navy/10">
                    <td className="py-3 pr-4 font-bold text-navy whitespace-nowrap">
                      <span className="mr-2">{lang.flag}</span>{lang.name}
                    </td>
                    {GRID_LEVELS.map(level => (
                      <td key={level} className="py-3 px-2 text-center">
                        {has(lang.code, level) ? (
                          <a href={`/resources/${lang.code.toLowerCase()}/${level.toLowerCase()}`}
                            className="inline-block bg-brand-yellow/20 text-navy border-2 border-navy px-4 py-1.5 rounded-full text-sm font-bold hover:bg-brand-yellow/40 transition-colors">
                            {level}
                          </a>
                        ) : (
                          // Greyed and unlinked rather than hidden, so sparse
                          // coverage reads as a grid still filling up instead
                          // of a broken page.
                          <span className="inline-block text-navy/20 text-xs px-2 py-1.5" title={t('resources.comingSoon')}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
