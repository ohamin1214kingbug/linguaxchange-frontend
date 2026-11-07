// An .ics file for one class, so it lands in whatever calendar the member
// uses (Apple, Google, Outlook all import it). Times are written in UTC with
// a Z suffix: the calendar app converts to the member's own zone, so this
// never has to know which zone that is.

const SITE = 'https://gongbuleng.com'

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

// RFC 5545 text: backslash, semicolon, comma and newline must be escaped.
function escapeText(text) {
  return String(text || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function buildClassIcs({ sessionId, title, start, durationMinutes, now = new Date() }) {
  const end = new Date(start.getTime() + (durationMinutes || 60) * 60 * 1000)
  const url = `${SITE}/classroom/${sessionId}`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GongbuLeng//Classes//EN',
    'BEGIN:VEVENT',
    `UID:session-${sessionId}@gongbuleng.com`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeText(`${title} · GongbuLeng`)}`,
    `DESCRIPTION:${escapeText(`Join the class: ${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Class starts in 10 minutes',
    'TRIGGER:-PT10M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

export function downloadClassIcs(details) {
  const blob = new Blob([buildClassIcs(details)], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'gongbuleng-class.ics'
  link.click()
  URL.revokeObjectURL(link.href)
}
