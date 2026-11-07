'use client'
import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'firstClassChecklistDismissed'

// Teaching is the only way to earn bananas, and the last banana stays locked
// until a member has taught once — but nothing walked anyone through doing it.
// Shown until the member has earned once (the same "has taught" the backend's
// creditSpendGate uses), or until they hide it.
export default function FirstClassChecklist({ profile, teachingClasses, transactions, t }) {
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    try { setDismissed(!!localStorage.getItem(DISMISSED_KEY)) } catch (e) { setDismissed(false) }
  }, [])

  const hasTaught = transactions.some(tx => tx.type === 'earned')
  if (!profile || hasTaught || dismissed) return null

  const language = profile.teach_language
  const posted = teachingClasses.length > 0
  const createHref = `/classes/create${language ? `?language_code=${language}` : ''}`
  const requestsHref = `/classes?tab=requests${language ? `&language=${language}` : ''}`

  const steps = [
    { done: !!language, label: t('dashboard.firstClassLanguage'), href: '/profile', cta: t('dashboard.firstClassLanguageCta') },
    { done: posted, label: t('dashboard.firstClassPlan'), href: '/resources', cta: t('dashboard.firstClassPlanCta') },
    { done: posted, label: t('dashboard.firstClassPost'), href: createHref, cta: t('dashboard.firstClassPostCta'),
      extra: { href: requestsHref, text: t('dashboard.firstClassRequests') },
      note: !profile.is_approved && !posted ? t('dashboard.firstClassReviewNote') : null },
    { done: false, label: t('dashboard.firstClassTeach') },
  ]
  // The first unfinished step is the only one with a button, so there is one
  // obvious next thing to do.
  const current = steps.findIndex(s => !s.done)

  const hide = () => {
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch (e) {}
    setDismissed(true)
  }

  return (
    <section className="mb-6 bg-white border-2 border-navy rounded-2xl px-5 py-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="font-display font-bold text-lg text-navy">{t('dashboard.firstClassTitle')}</h2>
        <button type="button" onClick={hide} className="text-navy/65 hover:text-navy text-xs font-bold whitespace-nowrap">
          {t('dashboard.firstClassHide')}
        </button>
      </div>
      <p className="text-navy/65 text-sm mb-4">{t('dashboard.firstClassIntro')}</p>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 border-navy flex items-center justify-center text-xs font-bold ${
              step.done ? 'bg-brand-teal text-white' : i === current ? 'bg-brand-yellow text-navy' : 'bg-white text-navy/65'}`}>
              {step.done ? '✓' : i + 1}
            </span>
            <div className="flex-1">
              <p className={`text-sm font-bold ${step.done ? 'text-navy/65 line-through' : 'text-navy'}`}>{step.label}</p>
              {i === current && step.href && (
                <div className="flex items-center gap-3 flex-wrap mt-2">
                  <a href={step.href}
                    className="bg-navy text-white px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap hover:bg-navy/90 transition-colors">
                    {step.cta}
                  </a>
                  {step.extra && (
                    <a href={step.extra.href} className="text-navy/70 text-xs font-bold hover:text-navy underline">{step.extra.text}</a>
                  )}
                </div>
              )}
              {i === current && step.note && <p className="text-navy/65 text-xs mt-2">{step.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
