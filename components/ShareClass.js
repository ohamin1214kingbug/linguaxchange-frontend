'use client'
import { useState } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { languageOptions } from '../lib/languages'
import { formatInTimezone } from '../lib/timezone'
import { userCode } from '../lib/userCode'

const SITE = 'https://gongbuleng.com'

// "Share this class" (owner plan 5, 2026-11-19). Phones get the phone's own
// share sheet (WhatsApp, Instagram, Telegram, whatever is installed);
// computers get WhatsApp, Telegram and Copy link. A signed-in sharer's link
// carries their invite code, so the existing invite reward applies
// (backend utils/referrals.js: a banana each after the friend's first
// class). The preview image is app/classes/[id]/opengraph-image.js.
export default function ShareClass({ cls, session, user, small = false }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const lang = languageOptions(t).find(l => l.code === cls.language_code)
  const link = `${SITE}/classes/${cls.id}${user?.id ? `?invite=${userCode(user.id)}` : ''}`
  const spots = session ? Math.max(0, (cls.max_students || 0) - (session.taken || 0)) : null
  const text = [
    t('share.message', { flag: lang?.flag || '', lang: lang?.name || cls.language_code }),
    [cls.title, session && formatInTimezone(session.session_date, user?.timezone, user?.time_format), spots ? t('share.spotsLeft', { n: spots }) : null].filter(Boolean).join(' · '),
  ].join('\n')

  const share = async () => {
    const phone = window.matchMedia?.('(pointer: coarse)').matches
    if (phone && navigator.share) {
      try { await navigator.share({ title: cls.title, text, url: link }); return } catch (e) {
        if (e?.name === 'AbortError') return
      }
    }
    setCopied(false)
    setOpen(true)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${text}\n${link}`); setCopied(true) } catch {}
  }

  const OPTION = 'flex flex-col items-center gap-1.5 text-xs font-bold text-navy'
  const ICON = 'w-12 h-12 rounded-2xl border-2 border-navy flex items-center justify-center text-2xl'

  return (
    <>
      <button type="button" onClick={share}
        className={small
          ? 'inline-flex items-center gap-1 bg-brand-red text-white border-2 border-navy rounded-full px-3 py-1.5 text-xs font-bold hover:bg-brand-red-dark transition-colors'
          : 'inline-flex items-center gap-1.5 bg-white text-navy border-2 border-navy rounded-full px-5 py-2 text-sm font-bold hover:bg-cream transition-colors'}>
        📣 {t(small ? 'share.short' : 'share.button')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-navy/40 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={t('share.button')} onClick={e => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border-2 border-navy p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-extrabold text-xl text-navy">{t('share.button')}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('share.close')} className="text-navy/65 text-xl font-bold px-2">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3 my-4">
              <a className={OPTION} href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`} target="_blank" rel="noopener noreferrer">
                <span className={`${ICON} bg-[#25d366]`} aria-hidden="true">💬</span>WhatsApp
              </a>
              <a className={OPTION} href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
                <span className={`${ICON} bg-[#dff1ff]`} aria-hidden="true">✈️</span>Telegram
              </a>
              <button type="button" className={OPTION} onClick={copy}>
                <span className={`${ICON} bg-white`} aria-hidden="true">{copied ? '✓' : '🔗'}</span>{copied ? t('share.copied') : t('share.copy')}
              </button>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-navy/55 mb-1">{t('share.messageLabel')}</p>
            <p className="bg-cream rounded-xl px-3 py-2 text-sm text-navy whitespace-pre-line break-words">{text}{'\n'}<span className="text-navy/65">{link}</span></p>
            {user?.id && <p className="text-navy/65 text-xs mt-3">🍌 {t('share.reward')}</p>}
          </div>
        </div>
      )}
    </>
  )
}
