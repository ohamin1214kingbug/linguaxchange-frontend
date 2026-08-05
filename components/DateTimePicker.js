'use client'
import { useState } from 'react'

const SLOT_INTERVAL_MINUTES = 30

function pad(n) {
  return String(n).padStart(2, '0')
}

// "YYYY-MM-DDTHH:mm" in local wall-clock time — same contract the native
// <input type="datetime-local"> this replaces used to produce, so the
// parent form's `new Date(value).toISOString()` submit logic needs no change.
export function toLocalValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// 6x7 grid covering the full weeks touching this month, Monday-first.
function buildCalendarGrid(viewDate) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  // getDay(): 0=Sun..6=Sat -> convert to Monday-first offset (0=Mon..6=Sun)
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - leadingBlanks)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    return { date: d, inCurrentMonth: d.getMonth() === month }
  })
}

function buildTimeSlots(selectedDate, now) {
  const slots = []
  for (let minutes = 0; minutes < 24 * 60; minutes += SLOT_INTERVAL_MINUTES) {
    const slot = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, minutes)
    if (isSameDay(selectedDate, now) && slot <= now) continue
    slots.push(slot)
  }
  return slots
}

export default function DateTimePicker({ value, onChange, t }) {
  const [open, setOpen] = useState(false)
  const parsedValue = value ? new Date(value) : null
  const [viewDate, setViewDate] = useState(() => parsedValue || new Date())

  const now = new Date()
  const today = startOfDay(now)
  const selectedDate = parsedValue ? startOfDay(parsedValue) : null

  const grid = buildCalendarGrid(viewDate)
  const weekdayLabels = grid.slice(0, 7).map(({ date }) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date))
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(viewDate)

  const timeSlots = selectedDate ? buildTimeSlots(selectedDate, now) : []

  const pickDate = (date) => {
    if (startOfDay(date) < today) return
    // Keep the previously-picked time if it's still valid for the new date, else clear it.
    if (parsedValue) {
      const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), parsedValue.getHours(), parsedValue.getMinutes())
      if (!(isSameDay(date, now) && candidate <= now)) {
        onChange(toLocalValue(candidate))
        return
      }
    }
    onChange(toLocalValue(startOfDay(date)))
  }

  const pickTime = (slot) => {
    onChange(toLocalValue(slot))
    setOpen(false)
  }

  const triggerLabel = parsedValue
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsedValue)
    : t('classes.pickDateTime')

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full text-left border-2 rounded-xl px-4 py-2.5 transition-colors ${
          parsedValue ? 'border-navy/20 text-navy' : 'border-navy/20 text-navy/40'} hover:border-navy/40`}>
        {triggerLabel}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 bg-white border-2 border-navy rounded-xl z-20 shadow-lg flex flex-col sm:flex-row overflow-hidden">
            <div className="p-4 w-72">
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream text-navy font-bold">‹</button>
                <span className="text-sm font-bold text-navy capitalize">{monthLabel}</span>
                <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream text-navy font-bold">›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-navy/40 mb-1">
                {weekdayLabels.map((w, i) => <div key={i}>{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map(({ date, inCurrentMonth }, i) => {
                  const isPast = startOfDay(date) < today
                  const isSelected = selectedDate && isSameDay(date, selectedDate)
                  const isToday = isSameDay(date, now)
                  const disabled = !inCurrentMonth || isPast
                  return (
                    <button key={i} type="button" disabled={disabled} onClick={() => pickDate(date)}
                      className={`h-8 w-8 rounded-full text-sm transition-colors ${
                        isSelected ? 'bg-brand-red text-white font-bold'
                        : disabled ? 'text-navy/20 cursor-not-allowed'
                        : isToday ? 'border-2 border-brand-red text-navy font-bold hover:bg-cream'
                        : 'text-navy hover:bg-cream'}`}>
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-navy/10 p-4 w-48 max-h-80 overflow-y-auto">
              {!selectedDate ? (
                <p className="text-sm text-navy/40 text-center mt-4">{t('classes.pickDateFirst')}</p>
              ) : timeSlots.length === 0 ? (
                <p className="text-sm text-navy/40 text-center mt-4">{t('classes.noTimesToday')}</p>
              ) : (
                <div className="space-y-1">
                  {timeSlots.map((slot, i) => {
                    const isSelected = parsedValue && slot.getTime() === parsedValue.getTime()
                    return (
                      <button key={i} type="button" onClick={() => pickTime(slot)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected ? 'bg-brand-red text-white font-bold' : 'text-navy hover:bg-cream'}`}>
                        {new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(slot)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
