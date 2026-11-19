'use client'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { useLanguage } from '../../../lib/i18n/LanguageContext'

const TEMPLATE = '/teach/gongbuleng-class-slides.pptx'
const H2 = 'font-display font-extrabold text-xl md:text-2xl text-navy mt-10 mb-3'
const BOX = 'bg-white border-2 border-navy rounded-2xl p-4'

// The class shape, in minutes, for a 60-minute class (owner-approved
// sample, 2026-11-19). The guide says these are a suggestion.
const PARTS = [
  ['partIntro', 7, 'bg-brand-coral/30'],
  ['partGoal', 2, 'bg-white'],
  ['partWords', 10, 'bg-brand-blue/25'],
  ['partPattern', 10, 'bg-brand-blue/25'],
  ['partSpeak', 26, 'bg-brand-green/30'],
  ['partRecap', 5, 'bg-brand-yellow/50'],
]
// The template's 10 slides; the ones with a speaking prompt get the green
// 🗣️ box, like in the .pptx.
const SLIDES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const SPEAK = new Set([3, 4, 8, 9])
const RULES = [1, 2, 3, 4, 5, 6, 7, 8]
const CHECKS = [1, 2, 3, 4, 5]

export default function SlidesGuideClient() {
  const { t } = useLanguage()
  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-navy">📊 {t('teachSlides.title')}</h1>
        <p className="text-navy/70 text-sm md:text-base mt-2">{t('teachSlides.intro')}</p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <a href={TEMPLATE} download className="bg-brand-red text-white border-2 border-navy rounded-full px-5 py-2.5 text-sm font-bold hover:bg-brand-red-dark transition-colors">⬇️ {t('teachSlides.download')}</a>
          <span className="text-navy/65 text-xs">{t('teachSlides.downloadNote')}</span>
        </div>

        <h2 className={H2}>1. {t('teachSlides.shapeTitle')}</h2>
        {/* Phones: a 3 x 2 grid; wider screens: one bar sized by minutes. */}
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-0 sm:border-2 sm:border-navy sm:rounded-2xl sm:overflow-hidden">
          {PARTS.map(([key, min, tone]) => (
            <div key={key} style={{ flex: Math.max(min, 6) }} className={`${tone} border-2 border-navy rounded-xl sm:rounded-none sm:border-0 sm:border-l-2 sm:first:border-l-0 px-2 py-2 min-w-0`}>
              <p className="font-bold text-navy text-xs md:text-sm leading-tight">{t(`teachSlides.${key}`)}</p>
              <p className="text-navy/70 text-[11px] md:text-xs">{t('teachSlides.min', { n: min })}</p>
            </div>
          ))}
        </div>
        <p className="text-navy/70 text-sm mt-2">{t('teachSlides.shapeNote')}</p>

        <h2 className={H2}>2. {t('teachSlides.slidesTitle')}</h2>
        <ol className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SLIDES.map(n => (
            <li key={n} className={`relative bg-white border-2 rounded-xl p-3 ${n === 3 || n === 4 ? 'border-brand-red' : 'border-navy'}`}>
              <span className="absolute top-2 right-2.5 text-[11px] font-extrabold text-navy/40">{n}</span>
              <p className="font-display font-extrabold text-navy text-sm leading-tight pr-4">{t(`teachSlides.s${n}`)}</p>
              <p className="text-navy/70 text-xs mt-1 leading-snug">{t(`teachSlides.s${n}Note`)}</p>
              {SPEAK.has(n) && <p className="mt-2 bg-brand-green/30 border-2 border-navy rounded-lg px-2 py-0.5 text-[11px] font-bold text-navy">🗣️ {t('teachSlides.speakTag')}</p>}
            </li>
          ))}
        </ol>
        <p className="text-navy/65 text-xs mt-2">{t('teachSlides.slidesCaption')}</p>

        <div className={`${BOX} mt-4`}>
          <p className="font-bold text-navy">👋 {t('teachSlides.introStepsTitle')}</p>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm text-navy/80">
            {[1, 2, 3, 4].map(n => <li key={n}>{t(`teachSlides.introStep${n}`)}</li>)}
          </ol>
        </div>

        <h2 className={H2}>3. {t('teachSlides.rulesTitle')}</h2>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {RULES.map(n => (
            <div key={n} className="bg-white border-2 border-navy/15 rounded-xl px-3 py-2.5">
              <p className="font-bold text-navy text-sm">{t(`teachSlides.r${n}`)}</p>
              <p className="text-navy/70 text-sm">{t(`teachSlides.r${n}Note`)}</p>
            </div>
          ))}
        </div>

        <h2 className={H2}>4. {t('teachSlides.contentTitle')}</h2>
        <div className={BOX}>
          <p className="text-navy text-sm">{t('teachSlides.contentBody')}</p>
          <Link href="/resources" className="inline-block mt-3 border-2 border-navy rounded-full px-4 py-1.5 text-sm font-bold text-navy hover:bg-cream">📚 {t('teachSlides.contentCta')}</Link>
        </div>

        <h2 className={H2}>5. {t('teachSlides.shareTitle')}</h2>
        <div className={BOX}><p className="text-navy text-sm">{t('teachSlides.shareBody')}</p></div>

        <h2 className={H2}>✓ {t('teachSlides.checkTitle')}</h2>
        <ul className="space-y-1.5">
          {CHECKS.map(n => <li key={n} className="text-navy text-sm">☐ {t(`teachSlides.c${n}`)}</li>)}
        </ul>

        <div className="flex flex-wrap gap-3 mt-8">
          <a href={TEMPLATE} download className="bg-brand-red text-white border-2 border-navy rounded-full px-5 py-2.5 text-sm font-bold hover:bg-brand-red-dark transition-colors">⬇️ {t('teachSlides.download')}</a>
          <Link href="/classes/create" className="bg-white text-navy border-2 border-navy rounded-full px-5 py-2.5 text-sm font-bold hover:bg-cream">{t('teachSlides.createCta')} →</Link>
        </div>
      </div>
    </main>
  )
}
