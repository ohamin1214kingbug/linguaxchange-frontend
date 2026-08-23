// Pulled out of DateTimePicker.js once a second caller (the streak
// calendar) needed the exact same month-grid math — two implementations of
// "which 42 cells make up this month's view" is how they'd quietly drift.

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// 6x7 grid covering the full weeks touching this month, Monday-first.
export function buildCalendarGrid(viewDate) {
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
