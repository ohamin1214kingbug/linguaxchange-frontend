'use client'
import { useLanguage } from '../lib/i18n/LanguageContext'

export default function FeedbackView({ request, feedback, canAcknowledge, onAcknowledge }) {
  const { t } = useLanguage()

  return (
    <div>
      <div className="bg-white border-2 border-navy rounded-2xl p-5 whitespace-pre-wrap leading-relaxed mb-4">
        {request.body}
      </div>

      {(feedback.annotations || []).map((a, i) => (
        <div key={i} className="border-l-4 border-brand-red pl-3 mb-4">
          <p className="text-navy font-bold text-sm">“{request.body.slice(a.start, a.end)}”</p>
          <p className="text-brand-red text-xs font-bold mt-0.5">
            {t(`assignments.category.${a.category}`)}
          </p>
          <p className="text-navy/70 text-sm mt-1">{a.note}</p>
        </div>
      ))}

      {feedback.overall && (
        <div className="bg-brand-yellow/20 border-2 border-navy rounded-2xl p-4 mb-4">
          <p className="text-navy text-sm">{feedback.overall}</p>
        </div>
      )}

      {/* The reviewer's university badge, where they have one. This is what
          makes the feature demonstrable to an institution without the badge
          being a permission that would starve supply. */}
      {feedback.reviewer?.university_domain && (
        <p className="text-navy/60 text-xs mb-4">
          🎓 {feedback.reviewer.university_domain}
        </p>
      )}

      {canAcknowledge && (
        <button onClick={onAcknowledge}
          className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy">
          {t('assignments.acknowledge')}
        </button>
      )}
    </div>
  )
}
