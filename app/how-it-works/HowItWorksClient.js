'use client'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions } from '../../lib/languages'

const STICKER = 'border-2 border-navy rounded-2xl shadow-[4px_4px_0_var(--color-navy)]'
const PRIMARY = 'inline-flex items-center justify-center bg-brand-red text-white px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors'
const SECONDARY = 'inline-flex items-center justify-center bg-white text-navy px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-cream transition-colors'

// Three steps as full-width colour bands, like the campus posters the QR
// codes on this page come from (owner picked the short version, 2026-11-25).
const STEPS = [
  ['s1', 'bg-brand-red text-white', 'text-white'],
  ['s2', 'bg-brand-yellow text-navy', 'text-navy'],
  ['s3', 'bg-navy text-white', 'text-brand-yellow'],
]
const FEATURES = [
  ['🎥', 'f1', 'bg-brand-blue/20'], ['📚', 'f2', 'bg-brand-purple/20'], ['⭐', 'f3', 'bg-brand-yellow/40'],
  ['🔔', 'f4', 'bg-brand-teal/25'], ['💌', 'f5', 'bg-brand-coral/25'], ['🧑‍🏫', 'f6', 'bg-brand-green/25'],
]

export default function HowItWorksClient() {
  const { t } = useLanguage()
  const flags = languageOptions(t).map(l => l.flag).join(' ')

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <section>
          <p className="text-2xl mb-3" aria-hidden="true">{flags}</p>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-navy leading-tight">
            {/* Same slogan and look as the home hero (owner, 2026-11-25). */}
            {t('home.heroTitle1')}<span className="text-brand-red underline decoration-brand-yellow decoration-[6px] md:decoration-[8px] underline-offset-8">{t('home.heroTitle2')}</span><br/>
            {t('home.heroTitle3')}
          </h1>
          <p className="text-navy/80 text-lg mt-4 max-w-2xl">{t('how.subtitle')}</p>
          <Link href="/auth/register" className={`${PRIMARY} mt-6 w-full sm:w-auto text-lg`}>{t('how.ctaSignup')} →</Link>
        </section>
      </div>

      <ol className="border-t-2 border-navy">
        {STEPS.map(([key, band, num], i) => (
          <li key={key} className={`${band} border-b-2 border-navy`}>
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 flex items-center gap-4">
              <span className={`font-display font-extrabold text-6xl leading-none w-12 shrink-0 ${num}`} aria-hidden="true">{i + 1}</span>
              <div>
                <p className="font-display font-extrabold text-2xl md:text-3xl leading-tight">{t(`how.${key}T`)}</p>
                <p className="font-semibold mt-0.5">{t(`how.${key}B`)}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <section className={`${STICKER} bg-white p-5 md:p-6`}>
          <h2 className="font-display font-extrabold text-2xl text-navy leading-tight">🙋 {t('how.reqShort')}</h2>
          <p className="text-navy/80 mt-1">{t('how.reqShortB')}</p>
          <Link href="/classes?tab=requests" className={`${SECONDARY} mt-4 w-full sm:w-auto`}>{t('how.reqCta')}</Link>
        </section>

        <Link href="/auth/register" className={`${PRIMARY} mt-8 w-full sm:w-auto text-lg`}>{t('how.ctaSignup')} →</Link>

        {/* The rest of the old page, one tap away instead of three screens. */}
        <details className="mt-6">
          <summary className="cursor-pointer font-bold text-navy underline underline-offset-4">{t('how.more')}</summary>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {FEATURES.map(([icon, key, tint]) => (
              <div key={key} className={`${STICKER} bg-white p-5`}>
                <span className={`w-11 h-11 rounded-xl border-2 border-navy flex items-center justify-center text-lg ${tint}`} aria-hidden="true">{icon}</span>
                <p className="font-bold text-navy mt-3">{t(`how.${key}T`)}</p>
                <p className="text-navy/80 text-sm mt-1">{t(`how.${key}B`)}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </main>
  )
}
