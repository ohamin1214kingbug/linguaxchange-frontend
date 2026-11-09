// The study-guide format, read by both the website guide page and the PDF
// build (scripts/buildGuides.mjs), so the two always show the same text.
//
// A guide opts in with `layout: v2` in its front matter; older guides keep
// the plain format buildGuides.mjs has always printed.
//
//   ---                                   front matter, `key: value` lines
//   ## Title | short: Chip label | kicker: Grammar     a section
//   plain lines                           a paragraph
//   - item / - [ ] item                   a list / an "I can" checklist
//   | a | b //translation |               a table; " // " adds a translation line
//   :::examples   - target // translation
//   :::dialogue   - Speaker: target // translation
//   :::tip        text
//   :::mistake    - wrong => right, then explanation lines
//   :::practice   1. sentence with ___ = answer
//   :::
//
// Inline: **bold**, *italic*, ~~struck~~. Everything is HTML-escaped first,
// so a guide can never inject markup into the page.
//
// No markdown library: same trade as buildGuides.mjs, a handful of constructs
// is less work than a parser dependency.

// The fixed words around a guide's content. A guide written for speakers of
// another language sets `ui` in its front matter: the English guides are
// written in Spanish, so they use `ui: es`.
const LABELS = {
  en: {
    practice: 'Quick practice', show: 'Show answers', hide: 'Hide answers', answers: 'Answers',
    tip: '💡 Tip', mistake: '⚠️ Common mistake', tick: 'Tick them as you go; this device remembers.',
    writtenBy: 'Written by GongbuLeng.', freeGuide: 'Free study guide', realPerson: 'Practise with a real person: gongbuleng.com',
    liveClasses: 'gongbuleng.com · learn in small live classes',
  },
  es: {
    practice: 'Práctica rápida', show: 'Ver respuestas', hide: 'Ocultar respuestas', answers: 'Respuestas',
    tip: '💡 Consejo', mistake: '⚠️ Error frecuente', tick: 'Márcalas a medida que avances; este dispositivo las recuerda.',
    writtenBy: 'Escrita por GongbuLeng.', freeGuide: 'Guía de estudio gratuita', realPerson: 'Practica con una persona real: gongbuleng.com',
    liveClasses: 'gongbuleng.com · aprende en clases pequeñas en vivo',
  },
}
export const guideLabels = ui => LABELS[ui] || LABELS.en

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function inlineHtml(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>')
}

// "target // translation" -> { text, translation }
function split(line) {
  const i = line.indexOf(' // ')
  return i === -1 ? { text: line.trim(), translation: '' } : { text: line.slice(0, i).trim(), translation: line.slice(i + 4).trim() }
}

const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'section'

export function isGuideV2(source) {
  return /^---\n[\s\S]*?^layout:\s*v2\s*$/m.test(source.replace(/\r\n/g, '\n'))
}

export function parseGuide(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const meta = {}
  let i = 0
  if (lines[0] === '---') {
    for (i = 1; i < lines.length && lines[i] !== '---'; i++) {
      const m = /^(\w+):\s*(.*)$/.exec(lines[i])
      if (m) meta[m[1]] = m[2].trim()
    }
    i++
  }

  const sections = []
  const intro = []
  let target = intro
  let para = []
  const flushPara = () => { if (para.length) { target.push({ type: 'p', text: para.join(' ') }); para = [] } }

  for (; i < lines.length; i++) {
    const line = lines[i]
    const t = line.trim()

    if (t.startsWith('## ')) {
      flushPara()
      const [title, ...attrs] = t.slice(3).split(' | ')
      const section = { title: title.trim(), short: '', kicker: '', blocks: [] }
      for (const a of attrs) {
        const m = /^(\w+):\s*(.*)$/.exec(a.trim())
        if (m) section[m[1]] = m[2].trim()
      }
      section.short = section.short || section.title
      section.id = slug(section.short)
      sections.push(section)
      target = section.blocks
      continue
    }

    if (t.startsWith(':::') && t.length > 3) {
      flushPara()
      const kind = t.slice(3).trim()
      const body = []
      for (i++; i < lines.length && lines[i].trim() !== ':::'; i++) body.push(lines[i].trim())
      target.push(fenced(kind, body.filter(Boolean)))
      continue
    }

    if (t.startsWith('|')) {
      flushPara()
      const rows = []
      for (; i < lines.length && lines[i].trim().startsWith('|'); i++) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())
        if (cells.every(c => /^:?-{2,}:?$/.test(c) || c === '')) continue
        rows.push(cells.map(split))
      }
      i--
      const [head, ...body] = rows
      target.push({ type: 'table', head: head.map(c => c.text), rows: body })
      continue
    }

    if (t.startsWith('- ')) {
      flushPara()
      const items = []
      let checklist = false
      for (; i < lines.length && lines[i].trim().startsWith('- '); i++) {
        let item = lines[i].trim().slice(2)
        if (item.startsWith('[ ] ')) { checklist = true; item = item.slice(4) }
        items.push(item)
      }
      i--
      target.push({ type: checklist ? 'checklist' : 'list', items })
      continue
    }

    if (t === '') { flushPara(); continue }
    para.push(t)
  }
  flushPara()
  return { meta, intro, sections }
}

function fenced(kind, body) {
  const items = body.filter(l => l.startsWith('- ')).map(l => l.slice(2))
  switch (kind) {
    case 'examples':
      return { type: 'examples', items: items.map(split) }
    case 'dialogue':
      return {
        type: 'dialogue',
        lines: items.map(l => {
          const m = /^([^:]{1,24}):\s*(.*)$/.exec(l)
          return { speaker: m ? m[1].trim() : '', ...split(m ? m[2] : l) }
        }),
      }
    case 'mistake':
      return {
        type: 'mistake',
        pairs: items.map(l => { const [wrong, right] = l.split(' => '); return { wrong: (wrong || '').trim(), right: (right || '').trim() } }),
        text: body.filter(l => !l.startsWith('- ')).join(' '),
      }
    case 'practice':
      return {
        type: 'practice',
        items: body.filter(l => /^\d+\.\s/.test(l)).map(l => {
          const rest = l.replace(/^\d+\.\s*/, '')
          const at = rest.lastIndexOf(' = ')
          return at === -1 ? { question: rest, answer: '' } : { question: rest.slice(0, at), answer: rest.slice(at + 3) }
        }),
      }
    case 'tip':
    case 'note':
      return { type: kind, text: body.join(' ') }
    default:
      throw new Error(`Unknown guide block :::${kind}`)
  }
}
