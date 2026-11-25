'use client'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions } from '../../lib/languages'

const CARD = 'border-2 border-navy rounded-2xl shadow-[4px_4px_0_var(--color-navy)]'
const BTN = 'flex items-center justify-center w-full sm:w-auto sm:inline-flex px-7 py-3.5 rounded-full border-2 border-navy font-display font-extrabold text-xl shadow-[4px_4px_0_var(--color-navy)]'
const WRAP = 'max-w-3xl mx-auto px-4 md:px-8'

// Greetings are shown as written in each language, never translated.
const GREETINGS = [
  ['Hola', 'bg-brand-blue text-white', 'top-1 left-3 -rotate-6'],
  ['안녕하세요', 'bg-brand-teal text-navy', 'top-2 right-3 rotate-5'],
  ['Bonjour', 'bg-brand-purple text-white', 'top-14 left-[30%] rotate-3'],
  ['Ciao', 'bg-white text-navy', 'top-16 right-4 -rotate-4'],
  ['Hallo', 'bg-brand-red text-white', 'top-[104px] left-4 -rotate-3'],
  ['Hello', 'bg-white text-navy', 'top-[110px] left-[44%] -rotate-2'],
  ['Olá', 'bg-navy text-white', 'top-[106px] right-6 rotate-5'],
]
const STEP_ICONS = [['🎁', 'bg-brand-coral/25'], ['🎧', 'bg-brand-blue/20'], ['🎤', 'bg-brand-green/25']]
const REQ_ICONS = ['📝', '📣', '🎉', '↩️']
const FEATURE_ICONS = ['🎥', '📚', '⭐', '🔔', '💌', '🧑‍🏫']

export default function PosterLanding({ color }) {
  const { t } = useLanguage()
  const flags = languageOptions(t).map(l => l.flag).join(' ')
  const signup = <Link href="/auth/register" className={`${BTN} bg-brand-red text-white`}>{t('how.ctaSignup')} →</Link>

  if (color === 'red') return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <section className="bg-brand-red text-white">
        <div className={`${WRAP} py-8 md:py-12`}>
          <span className="inline-block bg-brand-yellow text-navy border-2 border-navy rounded-full px-3 py-1 font-display font-extrabold text-sm">{t('poster.badge')}</span>
          <h1 className="font-display font-extrabold text-5xl md:text-6xl leading-[0.98] mt-4">{t('poster.redT1')}<br /><span className="text-brand-yellow">{t('poster.redT2')}</span></h1>
          <p className="text-lg font-semibold mt-4 max-w-xl">{t('poster.sub')}</p>
          <Link href="/auth/register" className={`${BTN} bg-brand-yellow text-navy mt-6`}>{t('how.ctaSignup')} →</Link>
          <Link href="/classes" className="block sm:inline-block sm:ml-6 text-center mt-4 font-bold underline underline-offset-4">{t('how.ctaBrowse')}</Link>
        </div>
      </section>
      <p className="bg-brand-yellow border-y-2 border-navy px-4 py-3.5 text-center font-display font-extrabold text-2xl text-navy">{t('poster.free3')}</p>

      <section className={`${WRAP} py-8`}>
        <h2 className="font-display font-extrabold text-3xl text-navy">{t('poster.howTitle')}</h2>
        <ol className="flex flex-col gap-3.5 mt-4">
          {STEP_ICONS.map(([icon, tint], i) => (
            <li key={icon} className={`${CARD} bg-white p-4 flex gap-3.5 items-start`}>
              <span className={`w-12 h-12 shrink-0 rounded-full border-2 border-navy flex items-center justify-center text-2xl ${tint}`} aria-hidden="true">{icon}</span>
              <div>
                <p className="font-display font-extrabold text-xl text-navy leading-tight">{i + 1}. {t(`how.s${i + 1}T`)}</p>
                <p className="text-navy/80 mt-0.5">{t(`how.s${i + 1}B`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-navy text-white">
        <div className={`${WRAP} py-8`}>
          <span className="inline-block bg-brand-yellow text-navy rounded-full px-3 py-1 font-display font-extrabold text-sm">{t('how.reqBadge')}</span>
          <h2 className="font-display font-extrabold text-3xl leading-tight mt-3">🙋 {t('how.reqTitle')}</h2>
          <p className="text-lg mt-2">{t('how.reqBody')}</p>
          <ul className="mt-4 flex flex-col gap-2 font-semibold">
            {['req1B', 'req2B', 'req4B'].map(k => <li key={k}><span className="text-brand-yellow" aria-hidden="true">✓ </span>{t(`how.${k}`)}</li>)}
          </ul>
          <Link href="/classes?tab=requests" className={`${BTN} bg-brand-yellow text-navy mt-6`}>{t('how.reqCta')}</Link>
        </div>
      </section>

      <section className={`${WRAP} py-10 text-center`}>
        <h2 className="font-display font-extrabold text-3xl text-navy">{t('how.endTitle')}</h2>
        <p className="text-navy/80 mt-2">{t('how.endBody')}</p>
        <div className="mt-5">{signup}</div>
        <p className="mt-5 text-navy/70 font-semibold"><span aria-hidden="true">{flags}</span><br />{t('how.f2T')}</p>
      </section>
    </main>
  )

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <section className="bg-brand-yellow text-navy">
        <div className={WRAP}>
          <div className="relative h-40" aria-hidden="true">
            {GREETINGS.map(([word, colors, place]) => (
              <span key={word} className={`absolute ${place} ${colors} border-2 border-navy rounded-full px-3 py-0.5 font-display font-extrabold text-xl shadow-[3px_3px_0_var(--color-navy)]`}>{word}</span>
            ))}
          </div>
          <div className="pb-8 md:pb-12">
            <h1 className="font-display font-extrabold text-5xl md:text-6xl leading-[0.98]">{t('poster.yelT')}</h1>
            <p className="font-display font-extrabold text-2xl md:text-3xl text-brand-red leading-tight mt-2">{t('poster.yelSub')}</p>
            <p className="text-lg mt-3 max-w-xl">{t('poster.sub')}</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {signup}
              <Link href="/classes" className={`${BTN} bg-white text-navy`}>{t('how.ctaBrowse')}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y-2 border-navy">
        <div className={`${WRAP} py-8`}>
          <h2 className="font-display font-extrabold text-3xl text-navy">🍌 {t('how.banTitle')}</h2>
          <ul className="flex flex-col gap-4 mt-5">
            {[['3', 'bg-brand-yellow', 'how.banStartSub', 'poster.noCard'], ['1', 'bg-brand-blue/20', 'poster.perClass', 'how.banJoinSub'], ['+1', 'bg-brand-green/25', 'poster.perStudent', 'poster.whenTeach']].map(([n, tint, a, b]) => (
              <li key={n} className="flex items-center gap-4">
                <span className={`w-16 h-16 shrink-0 rounded-full border-2 border-navy flex items-center justify-center font-display font-extrabold text-3xl text-navy ${tint}`}>{n}</span>
                <div><p className="font-display font-extrabold text-xl text-navy leading-tight">{t(a)}</p><p className="text-navy/75">{t(b)}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-brand-red text-white">
        <div className={`${WRAP} py-8`}>
          <h2 className="font-display font-extrabold text-3xl leading-tight">🙋 {t('how.reqTitle')}</h2>
          <ol className="flex flex-col gap-2.5 mt-4">
            {REQ_ICONS.map((icon, i) => (
              <li key={icon} className={`${CARD} bg-white text-navy p-3.5 flex gap-3 items-start`}>
                <span className="w-10 h-10 shrink-0 rounded-full border-2 border-navy bg-cream flex items-center justify-center" aria-hidden="true">{icon}</span>
                <div><p className="font-bold">{t(`how.req${i + 1}T`)}</p><p className="text-navy/80 text-sm">{t(`how.req${i + 1}B`)}</p></div>
              </li>
            ))}
          </ol>
          <Link href="/classes?tab=requests" className={`${BTN} bg-brand-yellow text-navy mt-6`}>{t('how.reqCta')}</Link>
        </div>
      </section>

      <section className={`${WRAP} py-8`}>
        <h2 className="font-display font-extrabold text-3xl text-navy">{t('how.moreTitle')}</h2>
        <ul className="grid grid-cols-2 gap-2.5 mt-4">
          {FEATURE_ICONS.map((icon, i) => <li key={icon} className={`${CARD} bg-white p-3 font-bold text-navy text-sm`}><span aria-hidden="true">{icon} </span>{t(`how.f${i + 1}T`)}</li>)}
        </ul>
        <div className={`${CARD} bg-brand-yellow p-6 mt-8 text-center`}>
          <h2 className="font-display font-extrabold text-3xl text-navy">{t('how.endTitle')}</h2>
          <div className="mt-4">{signup}</div>
        </div>
      </section>
    </main>
  )
}
