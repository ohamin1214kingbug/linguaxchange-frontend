// One foldable dashboard section. <details>, not state: the browser already
// does the opening, keyboard and screen-reader parts. Folded, the header
// still says what is inside (`note`), so a closed panel is not a blank one.
// Each section has its own colour chip so they stop looking alike.
export default function Panel({ id, icon, tone, title, note, badge, open, children }) {
  return (
    <details id={id} open={open} className="group bg-white rounded-2xl border-2 border-navy shadow-[4px_4px_0_var(--color-navy)] mb-4 overflow-hidden scroll-mt-24">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:bg-cream/60">
        <span aria-hidden="true" className={`w-10 h-10 shrink-0 rounded-xl border-2 border-navy flex items-center justify-center text-lg ${tone}`}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-extrabold text-navy text-lg leading-tight">{title}</span>
          {note && <span className="block text-navy/65 text-sm truncate">{note}</span>}
        </span>
        {badge > 0 && <span className="bg-brand-red text-white text-xs font-bold rounded-full min-w-6 h-6 px-1.5 inline-flex items-center justify-center">{badge}</span>}
        <span aria-hidden="true" className="text-navy text-lg transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="px-4 pb-4 pt-3 border-t-2 border-navy/10">{children}</div>
    </details>
  )
}
