'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { userCode } from '../lib/userCode'

// "How to get more bananas" in the dashboard's banana panel (owner plan 6,
// 2026-11-19). Amounts match the backend rules: invite (utils/referrals.js,
// +1 each after the friend's first class), teaching (+1 per student who
// attends; teaching once also unlocks the last banana, creditSpendGate.js),
// writing feedback (+1, assignmentCredits.js) and the survey (+1 once).
// "Running low" shows at 0–1 bananas; the survey row goes once it's done.
export default function EarnBananas({ credits, userId }) {
  const { t } = useLanguage()
  const [surveyDone, setSurveyDone] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/survey/me', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => (r.ok ? r.json() : null)).then(d => setSurveyDone(!d || Boolean(d.completed_at))).catch(() => {})
  }, [])

  const copy = async () => {
    try { await navigator.clipboard.writeText(`https://gongbuleng.com/?invite=${userCode(userId)}`); setCopied(true) } catch {}
  }
  const openSurvey = () => {
    try { localStorage.removeItem('surveyHiddenUntil') } catch {}
    window.location.reload()
  }

  const ROW = 'flex items-center justify-between gap-3 border-t-2 border-dashed border-navy/10 py-2.5 text-sm text-navy'
  const PLUS = 'text-brand-teal-dark font-extrabold text-sm whitespace-nowrap'
  const SMALL = 'border-2 border-navy rounded-full px-3 py-1 text-xs font-bold text-navy bg-white hover:bg-cream'

  return (
    <div className="mt-4">
      {credits !== null && credits <= 1
        ? <p className="text-amber-700 text-xs font-extrabold mb-1">{t('earn.runningLow')}</p>
        : <p className="text-navy/65 text-xs font-extrabold mb-1">{t('earn.title')}</p>}
      <div className={ROW}>
        <span>💌 <b>{t('earn.invite')}</b><span className="block text-navy/65 text-xs">{t('earn.inviteNote')}</span></span>
        <span className="flex flex-col items-end gap-1"><span className={PLUS}>{t('earn.plusEach')}</span>
          <button type="button" onClick={copy} className={SMALL}>{copied ? t('dashboard.inviteCopied') : t('dashboard.inviteCopy')}</button></span>
      </div>
      <div className={ROW}>
        <span>🧑‍🏫 <b>{t('earn.teach')}</b><span className="block text-navy/65 text-xs">{t('earn.teachNote')}</span></span>
        <span className="flex flex-col items-end gap-1"><span className={PLUS}>{t('earn.plusPerStudent')}</span>
          <Link href="/classes/create" className={SMALL}>{t('earn.teachCta')}</Link></span>
      </div>
      <div className={ROW}>
        <span>✍️ <b>{t('earn.feedback')}</b><span className="block text-navy/65 text-xs">{t('earn.feedbackNote')}</span></span>
        <span className="flex flex-col items-end gap-1"><span className={PLUS}>{t('earn.plusEach')}</span>
          <Link href="/classes?tab=assignments" className={SMALL}>{t('earn.feedbackCta')}</Link></span>
      </div>
      {!surveyDone && (
        <div className={ROW}>
          <span>🗳️ <b>{t('earn.survey')}</b><span className="block text-navy/65 text-xs">{t('earn.surveyNote')}</span></span>
          <span className="flex flex-col items-end gap-1"><span className={PLUS}>{t('earn.plusOnce')}</span>
            <button type="button" onClick={openSurvey} className={SMALL}>{t('earn.surveyCta')}</button></span>
        </div>
      )}
    </div>
  )
}
