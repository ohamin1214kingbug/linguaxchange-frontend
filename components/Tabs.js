'use client'

// The pill tab bar settings, history, profile and admin had each hand-rolled
// with slightly different padding and colours.
//
// Wraps instead of scrolling horizontally: the sideways-scrolling version
// this replaced hid four of settings' six sections past the edge of a phone,
// with nothing on screen to say they were there.
//
// `label` arrives already translated — keeps this free of i18n so it can be
// used for admin's hardcoded English labels too.
//
// Two ways to get the red active state, because they mean different things:
// `danger` on a single tab marks the one destructive section (settings'
// Delete account), while tone="red" colours the whole bar, which is how the
// admin screen has always looked and how the owner wants it kept.
const RED = 'bg-brand-red text-white border-navy'
const NAVY = 'bg-navy text-white border-navy'

export default function Tabs({ tabs, active, onChange, tone }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map(tab => (
        <button key={tab.key} type="button" onClick={() => onChange(tab.key)}
          className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-sm whitespace-nowrap border-2 transition-colors ${
            active === tab.key
              ? tab.danger || tone === 'red' ? RED : NAVY
              : 'bg-white text-navy/65 border-navy/20 hover:border-navy hover:text-navy'
          }`}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}
