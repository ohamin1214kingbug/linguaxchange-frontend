'use client'

// The pill tab bar settings, classes and admin had each hand-rolled with
// slightly different padding and colours. Shared once the dashboard and
// history needed one too, rather than writing a fifth near-copy.
//
// Wraps instead of scrolling horizontally: settings' overflow-x-auto version
// clips its first tab mid-word and leaves a scrollbar sitting under the row.
//
// `label` arrives already translated — keeps this free of i18n so it can be
// used for admin's hardcoded English labels too.
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map(tab => (
        <button key={tab.key} type="button" onClick={() => onChange(tab.key)}
          className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap border-2 transition-colors ${
            active === tab.key
              ? 'bg-navy text-white border-navy'
              : 'bg-white text-navy/60 border-navy/20 hover:border-navy hover:text-navy'
          }`}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}
