'use client'
import { useLanguage } from '../lib/i18n/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Home() {
  const { t } = useLanguage()

  const LANGUAGES = [
    { code: 'KO', flag: '🇰🇷', name: t('home.langKorean'), greeting: '안녕하세요', color: 'bg-brand-red' },
    { code: 'ES', flag: '🇪🇸', name: t('home.langSpanish'), greeting: 'Hola', color: 'bg-brand-blue' },
    { code: 'DE', flag: '🇩🇪', name: t('home.langGerman'), greeting: 'Hallo', color: 'bg-brand-yellow' },
    { code: 'EN', flag: '🇬🇧', name: t('home.langEnglish'), greeting: 'Hello', color: 'bg-brand-teal' },
    { code: 'PT', flag: '🇧🇷', name: t('home.langPortuguese'), greeting: 'Olá', color: 'bg-brand-purple' },
  ]

  const STEPS = [
    { n: '01', color: 'bg-brand-red', icon: '👤', title: t('home.step1Title'), text: t('home.step1Text') },
    { n: '02', color: 'bg-brand-blue', icon: '🌐', title: t('home.step2Title'), text: t('home.step2Text') },
    { n: '03', color: 'bg-brand-yellow', icon: '💬', title: t('home.step3Title'), text: t('home.step3Text') },
  ]

  return (
    <main className="min-h-screen bg-cream">

      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10">
        <a href="/" className="flex items-center gap-2">
          <span className="text-2xl">🌐</span>
          <span className="font-display font-bold text-xl text-navy">Lingua<span className="text-brand-red">Xchange</span></span>
        </a>
        <div className="flex gap-3 md:gap-6 items-center">
          <a href="/classes" className="hidden sm:block text-navy/70 font-medium hover:text-navy">{t('common.explore')}</a>
          <a href="/auth/login" className="hidden sm:block text-navy/70 font-medium hover:text-navy">{t('common.signIn')}</a>
          <LanguageSwitcher />
          <a href="/auth/register"
            className="bg-brand-red text-white px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm md:text-base font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
            {t('common.joinFree')}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 md:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{ backgroundImage: 'radial-gradient(circle, #1a1a2e22 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }}
        />
        <div className="absolute top-10 right-4 md:right-16 w-48 h-48 md:w-64 md:h-64 rounded-full bg-brand-red/10 -z-10" />
        <div className="absolute bottom-0 right-24 w-24 h-24 rounded-full bg-brand-yellow/20 -z-10 hidden md:block" />

        <div className="max-w-5xl mx-auto relative">
          <span className="hidden md:inline-block absolute -top-16 left-4 bg-brand-blue text-white font-display font-bold px-4 py-2 rounded-full -rotate-6 shadow-sm">
            Hola
          </span>
          <span className="hidden md:inline-block absolute top-16 right-0 bg-brand-teal text-white font-display font-bold px-4 py-2 rounded-full rotate-6 shadow-sm">
            안녕하세요
          </span>

          <div className="inline-flex items-center gap-2 bg-white border-2 border-navy rounded-full px-4 py-1.5 mb-8 text-xs md:text-sm font-bold text-navy">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
            {t('home.heroBadge')}
          </div>

          <h1 className="font-display font-extrabold text-navy leading-[1.15] text-5xl sm:text-6xl md:text-7xl mb-6">
            {t('home.heroTitle1')}<span className="text-brand-red underline decoration-brand-yellow decoration-[6px] md:decoration-[8px] underline-offset-8">
              {t('home.heroTitle2')}
            </span><br/>
            {t('home.heroTitle3')}
          </h1>

          <p className="text-lg md:text-xl text-navy/60 mb-10 max-w-xl">
            {t('home.heroSubtext')}
          </p>

          <div className="flex flex-wrap gap-4">
            <a href="/auth/register"
              className="bg-brand-red text-white px-8 py-4 rounded-full text-lg font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors inline-flex items-center gap-2">
              {t('home.ctaGetStarted')}
            </a>
            <a href="/classes"
              className="bg-white text-navy px-8 py-4 rounded-full text-lg font-bold border-2 border-navy hover:bg-navy hover:text-white transition-colors">
              {t('home.ctaBrowseClasses')}
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 md:px-8 py-16 md:py-24 max-w-5xl mx-auto">
        <p className="text-brand-red font-bold tracking-widest text-sm mb-3">{t('home.methodEyebrow')}</p>
        <h2 className="font-display font-extrabold text-navy text-4xl md:text-5xl mb-12 md:mb-16 leading-tight">
          {t('home.methodTitle1')}<br/>{t('home.methodTitle2')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {STEPS.map(step => (
            <div key={step.n} className="relative bg-white border-2 border-navy rounded-2xl p-6 pt-10">
              <div className={`absolute -top-5 -right-3 w-11 h-11 rounded-full ${step.color} border-2 border-navy flex items-center justify-center text-white font-display font-bold text-sm`}>
                {step.n}
              </div>
              <div className={`w-14 h-14 rounded-xl ${step.color} border-2 border-navy flex items-center justify-center text-2xl mb-5`}>
                {step.icon}
              </div>
              <h3 className="font-display font-bold text-xl text-navy mb-2">{step.title}</h3>
              <p className="text-navy/60 leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Languages */}
      <section className="bg-navy-dark px-4 md:px-8 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-brand-yellow font-bold tracking-widest text-sm mb-3">{t('home.languagesEyebrow')}</p>
              <h2 className="font-display font-extrabold text-white text-4xl md:text-5xl leading-tight">
                {t('home.languagesTitle1')}<br/>{t('home.languagesTitle2')}
              </h2>
            </div>
            <a href="/classes" className="border-2 border-white text-white px-5 py-2.5 rounded-full font-bold hover:bg-white hover:text-navy-dark transition-colors inline-flex items-center gap-2">
              {t('home.browseAllClasses')}
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {LANGUAGES.map(lang => (
              <div key={lang.code} className="relative bg-navy border border-white/10 rounded-2xl p-6 overflow-hidden">
                <span className={`absolute top-4 right-4 ${lang.color} text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20`}>
                  {lang.greeting}
                </span>
                <div className="text-4xl mb-4">{lang.flag}</div>
                <p className="text-white font-display font-bold text-xl">{lang.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden px-4 md:px-8 py-20 md:py-28 text-center">
        <div className="absolute top-8 left-6 md:left-16 w-16 h-16 bg-brand-blue/10 rotate-45 -z-10" />
        <div className="absolute bottom-8 right-6 md:right-24 w-32 h-32 rounded-full bg-brand-red/10 -z-10" />

        <p className="text-brand-red font-bold tracking-widest text-sm mb-4">{t('home.ctaJoinEyebrow')}</p>
        <h2 className="font-display font-extrabold text-navy text-4xl sm:text-5xl md:text-6xl leading-tight mb-6 max-w-3xl mx-auto">
          {t('home.ctaJoinTitle')}
        </h2>
        <p className="text-navy/60 text-lg mb-10 max-w-xl mx-auto">
          {t('home.ctaJoinSubtext')}
        </p>
        <a href="/auth/register"
          className="inline-block bg-brand-red text-white px-10 py-4 rounded-full text-lg font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
          {t('home.ctaStartFree')}
        </a>
      </section>

      <footer className="text-center py-8 text-navy/40 text-sm border-t border-navy/10">
        {t('home.footer')}
      </footer>

    </main>
  )
}
