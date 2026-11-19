'use client'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { formatInTimezone } from '../lib/timezone'
import ShareClass from './ShareClass'

// Shown right after joining a class (Explore and the class page; owner plan
// 6, 2026-11-19): the moment people care most about a class is when to ask
// them to bring a friend. Share carries the invite code (ShareClass).
export default function JoinedShare({ cls, session, user, onClose }) {
  const { t } = useLanguage()
  return (
    <div className="bg-brand-green/20 border-2 border-navy rounded-2xl p-4 mb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-extrabold text-navy text-lg leading-tight">🎉 {t('invite.joinedTitle', { title: cls.title })}</p>
          <p className="text-navy/65 text-sm mt-0.5">{session ? `${formatInTimezone(session.session_date, user?.timezone, user?.time_format)} · ` : ''}{t('invite.onDashboard')}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('share.close')} className="text-navy/65 font-bold text-lg px-1">✕</button>
      </div>
      <div className="bg-white border-2 border-navy rounded-xl p-3 mt-3">
        <p className="font-bold text-navy text-sm">👫 {t('invite.bringFriend')}</p>
        <p className="text-navy/70 text-sm mt-0.5">{t('invite.bringFriendNote')}</p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <ShareClass cls={cls} session={session} user={user} small/>
          <button type="button" onClick={onClose} className="border-2 border-navy rounded-full px-3 py-1.5 text-xs font-bold text-navy bg-white hover:bg-cream">{t('tandem.notNow')}</button>
        </div>
      </div>
    </div>
  )
}
