'use client'
import { useRef } from 'react'

// When2meet-style grid for class requests (owner, 2026-11-27; backend
// utils/availability.js): the next 7 days, 8:00 to 23:00, one cell per hour,
// in the viewer's own time zone. Each cell is the UTC start of that hour.
//
// mode 'paint': tap or drag to mark free hours (value = Set of ISO strings).
// mode 'heat': read-only colour map from cells [{slot, count, names?}];
// tapping an hour calls onPick(slot).
export const FIRST_HOUR = 8
export const LAST_HOUR = 23
const DAYS = 7
const SHADES = ['bg-[#f6f1ea]', 'bg-[#d6f3e3]', 'bg-[#9fe0bd]', 'bg-[#5fcb92]', 'bg-[#2fa868]']

// Wall-clock parts of an instant in a zone.
function partsIn(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(date).map(x => [x.type, x.value]))
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute }
}

// The UTC instant when the clock in `tz` shows y-m-d h:00. Two passes cover
// a daylight-saving change between the guess and the answer.
function instantAt(y, m, d, h, tz) {
  const want = Date.UTC(y, m - 1, d, h)
  let t = want
  for (let i = 0; i < 2; i++) {
    const p = partsIn(new Date(t), tz)
    t += want - Date.UTC(p.y, p.m - 1, p.d, p.h, p.min)
  }
  // Offsets like +5:45 land off the half hour; the backend keeps :00/:30.
  return new Date(Math.round(t / 1800000) * 1800000)
}

export function buildGrid(tz, locale, now = new Date()) {
  const today = partsIn(now, tz)
  // Once today's last hour has started, start from tomorrow, so the grid
  // always offers 7 days (still inside the backend's 7-day window).
  const skip = today.h >= LAST_HOUR ? 1 : 0
  const days = []
  for (let i = skip; i < DAYS + skip; i++) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d + i))
    const y = base.getUTCFullYear(), m = base.getUTCMonth() + 1, d = base.getUTCDate()
    const label = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short', day: 'numeric' }).format(base)
    const hours = []
    for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
      const at = instantAt(y, m, d, h, tz)
      hours.push({ h, slot: at.toISOString(), past: at.getTime() <= now.getTime() })
    }
    days.push({ label, hours })
  }
  return days
}

export default function FreeHoursGrid({ tz, locale, mode = 'paint', value, onChange, cells = [], picked, onPick }) {
  const drag = useRef(null)
  // The selection as of the last change, not the last render: a fast drag
  // fires several moves before React re-renders, and building each change
  // from the render's `value` dropped all but the last cell.
  const current = useRef(value)
  current.current = value
  const days = buildGrid(tz, locale)
  const heat = Object.fromEntries(cells.map(c => [c.slot, c]))
  const max = Math.max(1, ...cells.map(c => c.count))

  const apply = (slot, on) => {
    const next = new Set(current.current)
    if (on) next.add(slot); else next.delete(slot)
    current.current = next
    onChange(next)
  }
  // Pointer events cover mouse and touch alike. The cell under the finger
  // is found from the pointer position, because a touch keeps firing on the
  // element where it started.
  const slotAt = e => document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]')
  const down = e => {
    const el = slotAt(e)
    if (!el || el.dataset.past) return
    drag.current = !current.current.has(el.dataset.slot)
    apply(el.dataset.slot, drag.current)
  }
  const move = e => {
    if (drag.current === null) return
    const el = slotAt(e)
    if (el && !el.dataset.past && current.current.has(el.dataset.slot) !== drag.current) apply(el.dataset.slot, drag.current)
  }
  const up = () => { drag.current = null }
  const cols = { gridTemplateColumns: `2.6rem repeat(${DAYS}, minmax(0, 1fr))` }

  return (
    <div className="select-none">
      <div className="grid gap-[2px]" style={cols}>
        <div />
        {days.map(d => <div key={d.label} className="text-[11px] font-bold text-navy/65 text-center leading-tight pb-1">{d.label}</div>)}
      </div>
      <div className="grid gap-[2px]" style={cols}
        onPointerDown={mode === 'paint' ? down : undefined} onPointerMove={mode === 'paint' ? move : undefined}
        onPointerUp={up} onPointerLeave={up} onPointerCancel={up}>
        {days[0].hours.map((_, hi) => [
          <div key={`t${hi}`} className="text-[10px] text-navy/65 text-right pr-1 leading-6">{FIRST_HOUR + hi}:00</div>,
          ...days.map(d => {
            const c = d.hours[hi]
            if (mode === 'paint') {
              const on = value.has(c.slot)
              return <div key={c.slot} data-slot={c.slot} data-past={c.past ? '1' : undefined} role="checkbox" aria-checked={on}
                aria-label={`${d.label} ${c.h}:00`}
                className={`h-6 rounded border ${c.past ? 'bg-navy/5 border-transparent' : on ? 'bg-[#3fbf7f] border-[#2a8f5c]' : 'bg-[#f6f1ea] border-navy/10'}`}
                style={{ touchAction: 'none' }} />
            }
            const n = heat[c.slot]?.count || 0
            const shade = SHADES[n === 0 ? 0 : Math.max(1, Math.round((n / max) * 4))]
            return <button key={c.slot} type="button" disabled={c.past || n === 0} onClick={() => onPick?.(c.slot)}
              aria-label={`${d.label} ${c.h}:00: ${n}`}
              className={`h-6 rounded border ${c.past ? 'bg-navy/5 border-transparent' : `${shade} border-navy/10`} ${picked === c.slot ? 'outline outline-[3px] outline-brand-red -outline-offset-1' : ''}`} />
          }),
        ])}
      </div>
    </div>
  )
}
