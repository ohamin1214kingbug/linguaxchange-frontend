'use client'

// The flush two-up switcher: one bordered capsule, the active half filled
// navy. Resources and tandem had identical copies of it.
//
// Not the same thing as components/Tabs.js, and not a candidate for merging
// with it: Tabs is a wrapping row of separate pills for three or more
// sections, this is a binary either/or that reads as one control. Explore's
// switcher is a third look again (padded capsule, inner pills) and is left
// alone — making those match is a design decision, not a cleanup.
//
// `label` arrives already translated. `onChange` carries the URL mirroring
// both callers do, so the tab can be linked to.
export default function SegmentedTabs({ tabs, active, onChange, className = '' }) {
  return (
    <div role="tablist" className={`inline-flex border-2 border-navy rounded-full bg-white overflow-hidden ${className}`}>
      {tabs.map(tab => (
        <button key={tab.key} type="button" role="tab" aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-1.5 text-sm font-bold ${active === tab.key ? 'bg-navy text-white' : 'text-navy'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}
