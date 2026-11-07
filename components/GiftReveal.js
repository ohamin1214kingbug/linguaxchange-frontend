'use client'
import { useState, useEffect } from 'react'

// A banana someone was given (an invite reward, an admin grant) arrives as a
// 'credit_added' notification. Instead of one more line in the bell menu it
// opens as a gift: the box waits, the member taps it, it bursts and the
// banana comes out. Collecting marks the notification read, so each gift is
// opened once; several in a row open one after another.
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * 2 * Math.PI
  const distance = 110 + (i % 3) * 30
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance)}px`,
    color: ['#f4a623', '#da1f33', '#2ec4b6', '#ffffff'][i % 4],
  }
})

function GiftBox() {
  return (
    <svg viewBox="0 0 120 120" className="w-40 h-40 drop-shadow-[0_10px_0_rgba(0,0,0,0.25)]" aria-hidden="true">
      <rect x="14" y="52" width="92" height="60" rx="8" fill="#da1f33" stroke="#1a1a2e" strokeWidth="5" />
      <rect x="8" y="36" width="104" height="22" rx="6" fill="#e84a5a" stroke="#1a1a2e" strokeWidth="5" />
      <rect x="51" y="36" width="18" height="76" fill="#f4a623" stroke="#1a1a2e" strokeWidth="5" />
      <path d="M60 36 C 40 8, 18 22, 36 36 Z" fill="#f4a623" stroke="#1a1a2e" strokeWidth="5" strokeLinejoin="round" />
      <path d="M60 36 C 80 8, 102 22, 84 36 Z" fill="#f4a623" stroke="#1a1a2e" strokeWidth="5" strokeLinejoin="round" />
      <path d="M22 62 h20" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export default function GiftReveal({ gift, onCollect, t }) {
  const [stage, setStage] = useState('closed') // closed | shaking | open
  useEffect(() => { setStage('closed') }, [gift?.id])
  if (!gift) return null
  // Invite gifts are one banana; an admin grant says how many ("You received 3 credits").
  const amount = Number(/received (\d+)/.exec(gift.message || '')?.[1]) || 1

  const open = () => {
    if (stage !== 'closed') return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setStage(reduced ? 'open' : 'shaking')
    if (!reduced) setTimeout(() => setStage('open'), 700)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t('nav.giftTitle')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/90 px-4 overflow-hidden">
      <div className="gift-rays absolute w-[900px] h-[900px] max-w-none pointer-events-none" />

      <div className="relative flex flex-col items-center text-center">
        <p className="font-display font-extrabold text-3xl md:text-4xl text-white mb-6 drop-shadow-[0_3px_0_#1a1a2e]">
          {stage === 'open' ? t('nav.giftOpenedTitle') : t('nav.giftTitle')}
        </p>

        <div className="relative w-48 h-48 flex items-center justify-center">
          {stage !== 'open' ? (
            <button type="button" onClick={open} aria-label={t('nav.giftTap')}
              className={`${stage === 'shaking' ? 'gift-shake' : 'gift-idle'} cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow rounded-2xl`}>
              <GiftBox />
            </button>
          ) : (
            <>
              <div className="gift-flash absolute inset-[-40%] rounded-full bg-white pointer-events-none" />
              {SPARKS.map((s, i) => (
                <span key={i} className="gift-spark absolute w-3 h-3 rounded-full pointer-events-none"
                  style={{ background: s.color, '--dx': s.dx, '--dy': s.dy }} />
              ))}
              <span className="gift-pop text-[120px] leading-none drop-shadow-[0_8px_0_rgba(0,0,0,0.3)]" aria-hidden="true">🍌</span>
            </>
          )}
        </div>

        {stage === 'open' ? (
          <div className="gift-rise flex flex-col items-center">
            <p className="font-display font-extrabold text-4xl text-brand-yellow mt-4 drop-shadow-[0_3px_0_#1a1a2e]">{t('nav.giftAmount', { n: amount })}</p>
            <p className="text-white/85 text-base mt-2 max-w-xs">{gift.message}</p>
            <button type="button" onClick={onCollect} autoFocus
              className="mt-6 bg-brand-yellow text-navy font-extrabold text-lg px-10 py-3 rounded-full border-4 border-navy shadow-[0_5px_0_#1a1a2e] hover:translate-y-0.5 hover:shadow-[0_3px_0_#1a1a2e] transition-all">
              {t('nav.giftCollect')}
            </button>
          </div>
        ) : (
          <p className="text-white/85 font-bold mt-4 animate-pulse">{t('nav.giftTap')}</p>
        )}
      </div>
    </div>
  )
}
