'use client'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { INTERESTS, MAX_INTERESTS, interestEmoji } from '../lib/interests'

// Picking interests: welcome step 3 and the profile page.
export function InterestPicker({ value = [], onChange }) {
  const { t } = useLanguage()
  const toggle = key => {
    if (value.includes(key)) onChange(value.filter(k => k !== key))
    else if (value.length < MAX_INTERESTS) onChange([...value, key])
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map(([key, emoji]) => {
          const on = value.includes(key)
          return (
            <button key={key} type="button" onClick={() => toggle(key)} aria-pressed={on}
              disabled={!on && value.length >= MAX_INTERESTS}
              className={`border-2 border-navy rounded-full px-3 py-1.5 text-sm font-bold transition-colors disabled:opacity-40 ${on ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-cream'}`}>
              {emoji} {t(`interests.${key}`)}
            </button>
          )
        })}
      </div>
      <p className="text-sm font-bold text-navy mt-2">{t('interests.picked', { n: value.length, max: MAX_INTERESTS })}</p>
    </div>
  )
}

// Showing someone's interests; with `mine`, shared ones are highlighted and
// summed up ("You both like …").
export function InterestChips({ interests = [], mine, small = true }) {
  const { t } = useLanguage()
  if (!interests?.length) return null
  const shared = mine ? interests.filter(k => mine.includes(k)) : []
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {interests.map(k => (
          <span key={k} className={`rounded-full border-2 font-semibold ${small ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'} ${shared.includes(k) ? 'bg-brand-yellow border-navy text-navy' : 'bg-cream border-navy/15 text-navy'}`}>
            {interestEmoji(k)} {t(`interests.${k}`)}
          </span>
        ))}
      </div>
      {shared.length > 0 && (
        <p className="text-sm font-bold text-navy mt-1">✨ {t('interests.bothLike', { list: shared.map(k => t(`interests.${k}`)).join(', ') })}</p>
      )}
    </div>
  )
}
