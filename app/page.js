'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import Navbar from '../components/Navbar'
import Link from 'next/link'
import { LANGUAGE_COLORS } from '../lib/languages'

export default function Home() {
  const { t } = useLanguage()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(!!(localStorage.getItem('user') && localStorage.getItem('token')))
  }, [])

  const LANGUAGES = [
    // Greeting chips use the same per-language colour as LANGUAGE_COLORS,
    // with navy ink on the light ones (white on green or teal fails contrast).
    { code: 'KO', flag: '🇰🇷', name: t('home.langKorean'), greeting: '안녕하세요', ink: 'text-white' },
    { code: 'ES', flag: '🇪🇸', name: t('home.langSpanish'), greeting: 'Hola', ink: 'text-white' },
    { code: 'DE', flag: '🇩🇪', name: t('home.langGerman'), greeting: 'Hallo', ink: 'text-navy' },
    { code: 'EN', flag: '🇬🇧', name: t('home.langEnglish'), greeting: 'Hello', ink: 'text-white' },
    { code: 'PT', flag: '🇧🇷', name: t('home.langPortuguese'), greeting: 'Olá', ink: 'text-navy' },
    { code: 'FR', flag: '🇫🇷', name: t('home.langFrench'), greeting: 'Bonjour', ink: 'text-navy' },
    { code: 'IT', flag: '🇮🇹', name: t('home.langItalian'), greeting: 'Ciao', ink: 'text-navy' },
  ]

  const STEPS = [
    { n: '01', color: 'bg-brand-red', icon: '👤', title: t('home.step1Title'), text: t('home.step1Text') },
    { n: '02', color: 'bg-brand-blue', icon: '🌐', title: t('home.step2Title'), text: t('home.step2Text') },
    { n: '03', color: 'bg-brand-yellow', ink: 'text-navy', icon: '💬', title: t('home.step3Title'), text: t('home.step3Text') },
  ]

  return (
    <main className="min-h-screen bg-cream">

      {isLoggedIn ? (
        <Navbar />
      ) : (
        <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10">
          <a href="/" className="flex items-center gap-2">
            {/* Decorative only, and the first thing to go when the nav got a
                fourth item — the wordmark carries the brand on its own. */}
            <span className="hidden sm:inline text-2xl">🌐</span>
            <span className="font-display font-bold text-lg sm:text-xl text-navy">Gongbu<span className="text-brand-red">Leng</span></span>
          </a>
          <div className="flex gap-2 sm:gap-3 md:gap-6 items-center">
            <a href="/classes" className="hidden sm:block text-navy/70 font-medium hover:text-navy">{t('common.explore')}</a>
            {/* Not hidden below sm, unlike its neighbours: the homepage is
                where strangers land, and it is the one logged-out page that
                renders this nav instead of components/Navbar.js — so without
                a link here the study guides are reachable only by URL for
                exactly the audience they were written for. */}
            <a href="/resources" className="text-navy/70 font-medium hover:text-navy">{t('nav.resources')}</a>
            {/* Sign in and Join free trade places at the sm breakpoint,
                because five items do not fit at 375px and something has to
                give.

                Registering is already offered twice more on this page — the
                hero's "Get started free" sits about 200px below this bar, and
                the closing section repeats it. Signing in is offered nowhere
                else. So below sm the nav spends its slot on the action that
                has no other route, and a returning student on a phone can get
                back into their account from the page a link drops them on.
                Above sm both fit and both show. */}
            <a href="/auth/login" className="text-navy/70 font-medium hover:text-navy">{t('common.signIn')}</a>
            <LanguageSwitcher />
            <a href="/auth/register"
              className="hidden sm:block bg-brand-red text-white px-3 py-2 sm:px-4 md:px-5 md:py-2.5 rounded-full text-sm md:text-base font-bold whitespace-nowrap border-2 border-navy hover:bg-brand-red-dark transition-colors">
              {t('common.joinFree')}
            </a>
          </div>
        </nav>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden px-4 md:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{ backgroundImage: 'radial-gradient(circle, #1a1a2e22 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }}
        />
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
          <div className="inline-flex items-center gap-2 bg-white border-2 border-navy rounded-full px-4 py-1.5 mb-8 text-xs md:text-sm font-bold text-navy">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
            {t('home.heroBadge')}
          </div>

          <h1 className="font-display font-extrabold text-navy leading-[1.15] text-5xl sm:text-6xl md:text-5xl lg:text-6xl mb-6">
            {t('home.heroTitle1')}<span className="text-brand-red underline decoration-brand-yellow decoration-[6px] md:decoration-[8px] underline-offset-8">
              {t('home.heroTitle2')}
            </span><br/>
            {t('home.heroTitle3')}
          </h1>

          <p className="text-lg md:text-xl text-navy/65 mb-10 max-w-xl">
            {t('home.heroSubtext')}
          </p>

          <div className="flex flex-wrap gap-4">
            <a href={isLoggedIn ? '/classes/create' : '/auth/register'}
              className="bg-brand-red text-white px-8 py-4 rounded-full text-lg font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors inline-flex items-center gap-2">
              {isLoggedIn ? t('home.ctaTeachClass') : t('home.ctaGetStarted')}
            </a>
            <a href="/classes"
              className="bg-white text-navy px-8 py-4 rounded-full text-lg font-bold border-2 border-navy hover:bg-navy hover:text-white transition-colors">
              {t('home.ctaBrowseClasses')}
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-1.5">
            {LANGUAGES.map(lang => (
              <span key={lang.code} title={lang.name}
                className={`w-8 h-8 rounded-full border-2 border-navy flex items-center justify-center text-base ${LANGUAGE_COLORS[lang.code].tint}`}>
                {lang.flag}
              </span>
            ))}
            <span className="ml-2 text-sm text-navy/65">{t('home.languagesCount', { n: LANGUAGES.length })}</span>
          </div>
          </div>

          {/* The empty half of the hero now answers the first question a
              visitor has: what does it cost? Only the real rules (sign-up
              grant, join price, teacher pay) — no invented stats. The
              stickers are decoration, pinned to the card's corners rather
              than floating, and left out on phones to keep it calm. */}
          <div className="relative md:py-5 md:px-3">
            <span aria-hidden="true" className="hidden md:inline-block absolute top-0 left-0 z-10 bg-brand-blue text-white font-display font-bold text-sm px-3.5 py-1 rounded-full border-2 border-navy shadow-[2px_2px_0_var(--color-navy)] -rotate-3">Hola</span>
            <span aria-hidden="true" className="hidden md:inline-block absolute top-0 right-0 z-10 bg-brand-teal text-navy font-display font-bold text-sm px-3.5 py-1 rounded-full border-2 border-navy shadow-[2px_2px_0_var(--color-navy)] rotate-3">안녕하세요</span>
            <span aria-hidden="true" className="hidden md:inline-block absolute bottom-0 left-1 z-10 bg-brand-yellow text-navy font-display font-bold text-sm px-3.5 py-1 rounded-full border-2 border-navy shadow-[2px_2px_0_var(--color-navy)] rotate-2">Bonjour</span>
            <span aria-hidden="true" className="hidden md:inline-block absolute bottom-0 right-2 z-10 bg-brand-purple text-white font-display font-bold text-sm px-3.5 py-1 rounded-full border-2 border-navy shadow-[2px_2px_0_var(--color-navy)] -rotate-2">Ciao</span>

            <div className="bg-white border-2 border-navy rounded-2xl overflow-hidden shadow-[4px_4px_0_var(--color-navy)]">
              <h2 className="bg-brand-yellow border-b-2 border-navy px-5 py-3 font-display font-bold text-lg text-navy">🍌 {t('home.bananaCardTitle')}</h2>
              <ul>
                {[
                  { icon: '🎤', tint: 'bg-brand-green/20', title: t('home.bananaTeach'), sub: t('home.bananaTeachSub') },
                  { icon: '🎧', tint: 'bg-brand-blue/15', title: t('home.bananaJoin'), sub: t('home.bananaJoinSub') },
                  { icon: '🎁', tint: 'bg-brand-red/15', title: t('home.bananaStart'), sub: t('home.bananaStartSub') },
                ].map((row, i) => (
                  <li key={row.icon} className={`flex items-center gap-4 px-5 py-3.5 ${i ? 'border-t border-navy/10' : ''}`}>
                    <span aria-hidden="true" className={`w-10 h-10 shrink-0 rounded-full border-2 border-navy flex items-center justify-center text-lg ${row.tint}`}>{row.icon}</span>
                    <span>
                      <span className="block font-bold text-navy">{row.title}</span>
                      <span className="block text-sm text-navy/65">{row.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Nothing above the fold says there is anything below it. A plain
            anchor with scroll-smooth on <html> does the whole job: the
            browser animates the scroll, it still works with JS disabled, and
            it is a real link a keyboard reaches in tab order.

            Desktop only. On a 375x812 phone the buttons above end at 754px
            and this sits at 834 — below the fold, which is the one place a
            "there is more below" hint cannot do its job. Nothing short of
            reflowing the hero fits it in, and it is not needed there: on a
            phone the fold is not the hard stop it is on a wide screen.

            aria-label reuses the section's own eyebrow rather than adding a
            "scroll down" key to five locales — naming the destination is what
            a link's accessible name is for anyway. */}
        <a href="#how-it-works" aria-label={t('home.methodEyebrow')}
          className="hidden md:flex mt-20 md:mt-28 mx-auto w-12 h-12 rounded-full border-2 border-navy/20 bg-white/70 text-navy text-xl items-center justify-center hover:border-navy hover:bg-white transition-colors motion-safe:animate-bounce">
          ↓
        </a>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 md:px-8 py-16 md:py-24 max-w-5xl mx-auto scroll-mt-20">
        <p className="text-brand-red font-bold tracking-widest text-sm mb-3">{t('home.methodEyebrow')}</p>
        <h2 className="font-display font-extrabold text-navy text-4xl md:text-5xl mb-12 md:mb-16 leading-tight">
          {t('home.methodTitle1')}<br/>{t('home.methodTitle2')}
        </h2>

        {/* An arrow between the cards (sideways on wide screens, downwards on
            phones) so the three read as one sequence, not three features. */}
        <ol className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3 md:gap-4">
          {STEPS.map((step, i) => (
            <li key={step.n} className="contents">
              {i > 0 && <span aria-hidden="true" className="self-center justify-self-center text-2xl text-navy/30 rotate-90 md:rotate-0">→</span>}
              <div className="relative bg-white border-2 border-navy rounded-2xl p-6 shadow-[4px_4px_0_var(--color-navy)]">
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-14 h-14 rounded-xl ${step.color} border-2 border-navy flex items-center justify-center text-2xl`}>
                    {step.icon}
                  </div>
                  <div className={`w-10 h-10 rounded-full ${step.color} border-2 border-navy flex items-center justify-center ${step.ink || 'text-white'} font-display font-bold`}>
                    {Number(step.n)}
                  </div>
                </div>
                <h3 className="font-display font-bold text-xl text-navy mb-2">{step.title}</h3>
                <p className="text-navy/65 leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Second and last cue. The hero's earns its place because nothing
            above the fold hints at a page below it; this one carries a reader
            who has finished the three steps into the languages. A third would
            be noise — by then scrolling is established. */}
        <a href="#languages" aria-label={t('home.languagesEyebrow')}
          className="mt-16 md:mt-20 mx-auto w-12 h-12 rounded-full border-2 border-navy/20 bg-white/70 text-navy text-xl flex items-center justify-center hover:border-navy hover:bg-white transition-colors motion-safe:animate-bounce">
          ↓
        </a>
      </section>

      {/* Languages */}
      <section id="languages" className="bg-navy-dark px-4 md:px-8 py-16 md:py-24 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="text-brand-yellow font-bold tracking-widest text-sm mb-3">{t('home.languagesEyebrow')}</p>
            <h2 className="font-display font-extrabold text-white text-4xl md:text-5xl leading-tight">
              {t('home.languagesTitle1')}<br/>{t('home.languagesTitle2')}
            </h2>
          </div>

          {/* Four across, so seven languages plus "browse all" fill two
              rows; at three across Italian sat alone. Each tile leads to that
              language's classes and to its A1 guide, which every language has. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {LANGUAGES.map(lang => (
              <div key={lang.code} className="relative bg-navy border border-white/10 rounded-2xl p-5 pl-6 overflow-hidden">
                <span aria-hidden="true" className={`absolute left-0 inset-y-0 w-1.5 ${LANGUAGE_COLORS[lang.code].band}`} />
                <div className="flex items-start justify-between gap-2 mb-4">
                  <span className="text-3xl">{lang.flag}</span>
                  <span className={`${LANGUAGE_COLORS[lang.code].band} ${lang.ink} text-xs font-bold px-2.5 py-0.5 rounded-full`}>
                    {lang.greeting}
                  </span>
                </div>
                <p className="text-white font-display font-bold text-xl mb-1">{lang.name}</p>
                <p className="text-sm text-white/65">
                  <Link href={`/classes?language=${lang.code}`} className="hover:text-white">{t('classes.browseClasses')}</Link>
                  {' · '}
                  <Link href={`/resources/${lang.code.toLowerCase()}/a1`} className="hover:text-white">{t('nav.resources')}</Link>
                </p>
              </div>
            ))}
            <Link href="/classes" className="bg-brand-yellow border-2 border-brand-yellow rounded-2xl p-5 flex flex-col justify-between gap-4 text-navy hover:bg-brand-yellow/90 transition-colors">
              <span aria-hidden="true" className="text-3xl">🌍</span>
              <span className="font-display font-bold text-xl">{t('home.browseAllClasses')}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA — a sign-up pitch, so members never see it. Its button
          went to /auth/register even for someone already logged in. */}
      {!isLoggedIn && (
      <section className="px-4 md:px-8 py-20 md:py-28">
        <div className="relative max-w-4xl mx-auto bg-brand-yellow border-2 border-navy rounded-3xl px-6 py-12 md:px-12 md:py-16 text-center shadow-[6px_6px_0_var(--color-navy)]">
          <span aria-hidden="true" className="absolute -top-4 left-6 md:left-12 bg-brand-blue text-white font-display font-bold text-sm px-3.5 py-1 rounded-full border-2 border-navy -rotate-3">Hola</span>
          <span aria-hidden="true" className="absolute -top-4 right-6 md:right-12 bg-brand-teal text-navy font-display font-bold text-sm px-3.5 py-1 rounded-full border-2 border-navy rotate-3">안녕하세요</span>

          <p className="text-navy font-bold tracking-widest text-sm mb-4">{t('home.ctaJoinEyebrow')}</p>
          <h2 className="font-display font-extrabold text-navy text-4xl sm:text-5xl leading-tight mb-5 max-w-2xl mx-auto">
            {t('home.ctaJoinTitle')}
          </h2>
          <p className="text-navy/80 text-lg mb-8 max-w-xl mx-auto">
            {t('home.ctaJoinSubtext')}
          </p>
          {/* A second, softer door for visitors not ready to sign up: the
              guides need no account. */}
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/auth/register"
              className="bg-brand-red text-white px-8 py-3.5 rounded-full text-lg font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
              {t('home.ctaStartFree')}
            </Link>
            <Link href="/resources"
              className="bg-white text-navy px-8 py-3.5 rounded-full text-lg font-bold border-2 border-navy hover:bg-cream transition-colors">
              {t('resources.title')}
            </Link>
          </div>
        </div>
      </section>
      )}

      <footer className="text-center py-8 text-navy/65 text-sm border-t border-navy/10 space-y-2">
        <div className="flex justify-center gap-4">
          <a href="/resources" className="hover:text-navy/70">{t('nav.resources')}</a>
          <a href="/legal/privacy" className="hover:text-navy/70">Privacy Policy</a>
          <a href="/legal/terms" className="hover:text-navy/70">Terms of Service</a>
        </div>
        <div>{t('home.footer')}</div>
      </footer>

    </main>
  )
}
