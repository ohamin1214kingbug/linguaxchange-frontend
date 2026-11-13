'use client'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions } from '../../lib/languages'

const STICKER = 'border-2 border-navy rounded-2xl shadow-[4px_4px_0_var(--color-navy)]'
const PRIMARY = 'inline-flex items-center justify-center bg-brand-red text-white px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors'
const SECONDARY = 'inline-flex items-center justify-center bg-white text-navy px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-cream transition-colors'

const REQUEST_STEPS = [['📝', 'req1'], ['📣', 'req2'], ['🎉', 'req3'], ['↩️', 'req4']]
const BANANAS = [['🎁', 'banStart', 'bg-brand-coral/25'], ['🎧', 'banJoin', 'bg-brand-blue/20'], ['🎤', 'banTeach', 'bg-brand-green/25']]
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
        <section className="mb-12">
          <p className="text-2xl mb-3" aria-hidden="true">{flags}</p>
          <h1 className="font-display font-extrabold text-4xl md:text-5xl text-navy leading-tight">{t('how.title')}</h1>
          <p className="text-navy/80 text-lg mt-4 max-w-2xl">{t('how.subtitle')}</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/auth/register" className={PRIMARY}>{t('how.ctaSignup')}</Link>
            <Link href="/classes" className={SECONDARY}>{t('how.ctaBrowse')}</Link>
          </div>
        </section>

        {/* The feature the owner wants students to notice first. */}
        <section className={`${STICKER} bg-brand-yellow p-6 md:p-8 mb-12`}>
          <span className="inline-block bg-navy text-white text-xs font-bold uppercase tracking-wide rounded-full px-3 py-1">{t('how.reqBadge')}</span>
          <h2 className="font-display font-extrabold text-3xl text-navy leading-tight mt-3">🙋 {t('how.reqTitle')}</h2>
          <p className="text-navy text-lg mt-2 max-w-2xl">{t('how.reqBody')}</p>
          <ol className="grid sm:grid-cols-2 gap-3 mt-6">
            {REQUEST_STEPS.map(([icon, key], i) => (
              <li key={key} className="bg-white border-2 border-navy rounded-xl p-4 flex gap-3">
                <span className="w-10 h-10 shrink-0 rounded-full border-2 border-navy bg-cream flex items-center justify-center text-lg" aria-hidden="true">{icon}</span>
                <div>
                  <p className="font-bold text-navy">{i + 1}. {t(`how.${key}T`)}</p>
                  <p className="text-navy/80 text-sm mt-0.5">{t(`how.${key}B`)}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/classes?tab=requests" className={`${PRIMARY} mt-6`}>{t('how.reqCta')}</Link>
        </section>

        <section className="mb-12">
          <h2 className="font-display font-extrabold text-3xl text-navy mb-5">🍌 {t('how.banTitle')}</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {BANANAS.map(([icon, key, tint]) => (
              <div key={key} className={`${STICKER} bg-white p-5`}>
                <span className={`w-12 h-12 rounded-full border-2 border-navy flex items-center justify-center text-xl ${tint}`} aria-hidden="true">{icon}</span>
                <p className="font-display font-extrabold text-xl text-navy mt-3">{t(`how.${key}`)}</p>
                <p className="text-navy/80 text-sm mt-1">{t(`how.${key}Sub`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-display font-extrabold text-3xl text-navy mb-5">{t('how.moreTitle')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(([icon, key, tint]) => (
              <div key={key} className={`${STICKER} bg-white p-5`}>
                <span className={`w-11 h-11 rounded-xl border-2 border-navy flex items-center justify-center text-lg ${tint}`} aria-hidden="true">{icon}</span>
                <p className="font-bold text-navy mt-3">{t(`how.${key}T`)}</p>
                <p className="text-navy/80 text-sm mt-1">{t(`how.${key}B`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${STICKER} bg-white p-6 md:p-8 text-center`}>
          <h2 className="font-display font-extrabold text-3xl text-navy">{t('how.endTitle')}</h2>
          <p className="text-navy/80 mt-2 max-w-xl mx-auto">{t('how.endBody')}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <Link href="/auth/register" className={PRIMARY}>{t('how.ctaSignup')}</Link>
            <Link href="/classes?tab=requests" className={SECONDARY}>🙋 {t('how.reqCta')}</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
