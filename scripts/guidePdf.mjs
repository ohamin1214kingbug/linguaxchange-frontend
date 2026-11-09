// The PDF design for guides in the v2 format (lib/guideFormat.mjs): an
// editorial, book-like layout on cream paper. Fraunces serif headings, a
// numbered section opener, ruled tables, and labels in a side column for
// examples, tips, mistakes and practice. Practice answers are printed under
// each exercise, since paper can't hide them.
//
// Page numbers use CSS page-margin boxes, which Chrome prints from version
// 131; the build already requires a local Chrome.

import { inlineHtml as h, guideLabels } from '../lib/guideFormat.mjs'

// English name for the cover line, and the language's own name for the
// vertical word on the cover.
const LANGUAGES = {
  ko: ['Korean', '한국어'], es: ['Spanish', 'Español'], de: ['German', 'Deutsch'], en: ['English', 'English'],
  pt: ['Portuguese', 'Português'], fr: ['French', 'Français'], it: ['Italian', 'Italiano'],
}
const LEVEL_WORD = {
  en: { a1: 'Beginner', a2: 'Elementary', b1: 'Intermediate', b2: 'Upper intermediate' },
  es: { a1: 'Principiante', a2: 'Elemental', b1: 'Intermedio', b2: 'Intermedio alto' },
}
const TOPIK = { a1: 1, a2: 2, b1: 3, b2: 4 }

let L = guideLabels('en')
const two = n => String(n).padStart(2, '0')
const cell = c => c.translation ? `${h(c.text)}<span class="tr">${h(c.translation)}</span>` : h(c.text)
// A block with its label in the side column.
const side = (label, body) => `<div class="side"><div class="lab">${label}</div><div>${body}</div></div>`

function block(b) {
  switch (b.type) {
    case 'p': return `<p>${h(b.text)}</p>`
    case 'list': return `<ul class="list">${b.items.map(i => `<li>${h(i)}</li>`).join('')}</ul>`
    case 'checklist': return `<ul class="cando">${b.items.map(i => `<li><span class="box"></span>${h(i)}</li>`).join('')}</ul>`
    case 'table':
      return `<table class="tbl"><thead><tr>${b.head.map(x => `<th>${h(x)}</th>`).join('')}</tr></thead><tbody>${
        b.rows.map(r => `<tr>${r.map(cell).map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    case 'examples':
      return side(L.inUse, `<ul class="ex">${b.items.map(e => `<li><span class="t">${h(e.text)}</span>${e.translation ? `<span class="tr">${h(e.translation)}</span>` : ''}</li>`).join('')}</ul>`)
    case 'dialogue':
      return `<ul class="dlg">${b.lines.map(l => `<li class="side"><div class="lab">${h(l.speaker)}</div><div><span class="t">${h(l.text)}</span>${l.translation ? `<span class="tr">${h(l.translation)}</span>` : ''}</div></li>`).join('')}</ul>`
    case 'tip': case 'note':
      return side(L.tip, `<div class="tip">${h(b.text)}</div>`)
    case 'mistake':
      return side(L.mistake, `<div class="mis">${b.pairs.map(p => `<div><s>${h(p.wrong)}</s> → <b>${h(p.right)}</b></div>`).join('')}${b.text ? `<div class="why">${h(b.text)}</div>` : ''}</div>`)
    case 'practice':
      return side(L.practice, `<ol class="drill">${b.items.map(i => {
        const [before, after = ''] = i.question.split('___')
        return `<li>${h(before)}<span class="blank"></span>${h(after)}</li>`
      }).join('')}</ol><div class="ans">${L.answers}: ${b.items.map((i, n) => `${n + 1} ${h(i.answer)}`).join(' · ')}</div>`)
    default: return ''
  }
}

export function guidePdfHtml(guide, name) {
  const [code, level] = name.split('-')
  L = guideLabels(guide.meta.ui)
  const [englishName, native] = LANGUAGES[code] || [code.toUpperCase(), '']
  // A guide written for speakers of another language names itself in it (en-*: Inglés).
  const language = guide.meta.language || englishName
  const words = guide.meta.title.split(' ')
  const title = `${h(words.slice(0, -1).join(' '))} <em>${h(words.at(-1))}</em>`
  const levelLine = code === 'ko' ? `TOPIK ${TOPIK[level]}` : (LEVEL_WORD[guide.meta.ui] || LEVEL_WORD.en)[level] || ''
  const lang = code === 'en' ? 'es' : 'en'
  const LV = level.toUpperCase()

  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><title>${language} ${LV} · GongbuLeng</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,400&family=Inter:wght@400;500;700&family=Noto+Serif+KR:wght@500;700&family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root { --paper:#f7f1e6; --ink:#1a1a2e; --red:#d7263d; --muted:#6b6b7b; --rule:rgba(26,26,46,.18); }
  @page { size: A4; margin: 20mm 17mm 20mm; background: #f7f1e6;
    @top-left { content: "${language} ${LV}"; font: 500 7pt Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #6b6b7b; }
    @top-right { content: "GongbuLeng"; font: 500 7pt Inter, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #6b6b7b; }
    @bottom-left { content: "${L.realPerson}"; font: 500 7.5pt Inter, sans-serif; color: #6b6b7b; }
    @bottom-right { content: counter(page); font: 600 9pt Fraunces, serif; color: #1a1a2e; } }
  @page :first { margin: 0; @top-left { content: none } @top-right { content: none } @bottom-left { content: none } @bottom-right { content: none } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: var(--paper); }
  body { font-family: Inter, "Noto Sans KR", sans-serif; color: var(--ink); font-size: 10pt; line-height: 1.5; word-break: keep-all; }
  .serif, h2, .cover h1, p, .t, .tbl td, .drill li, .num { font-family: Fraunces, "Noto Serif KR", serif; }
  .tr, .why, .tip { font-family: Fraunces, "Noto Serif KR", serif; font-style: italic; color: #4a4a5c; }

  /* Cover: masthead, the level in outline, the title, the contents */
  .cover { width: 210mm; height: 297mm; padding: 15mm 17mm 9mm; display: flex; flex-direction: column; break-after: page; }
  .mast { display: flex; justify-content: space-between; align-items: baseline; border-bottom: .6mm solid var(--ink); padding-bottom: 2.6mm; }
  .mast b { font-family: Fraunces, serif; font-weight: 800; font-size: 19pt; }
  .mast b span { color: var(--red); }
  .mast i, .eyebrow, .lab, .tbl th, .kick { font-style: normal; font-family: Inter, sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
  .mast i { color: var(--muted); font-weight: 500; }
  .art { position: relative; height: 112mm; }
  .native { position: absolute; left: 0; top: 10mm; writing-mode: vertical-rl; font-family: "Noto Serif KR", Fraunces, serif; font-weight: 700; font-size: 34pt; color: var(--red); letter-spacing: .1em; }
  .big { position: absolute; right: -4mm; top: 2mm; font-family: Fraunces, serif; font-weight: 800; font-size: 300pt; line-height: 1; color: transparent; -webkit-text-stroke: .5mm var(--ink); letter-spacing: -.04em; }
  .eyebrow { color: var(--red); }
  .cover h1 { font-weight: 600; font-size: 62pt; line-height: .95; letter-spacing: -.02em; margin: 4mm 0 5mm; }
  .cover h1 em { font-weight: 400; }
  .promise { font-size: 14pt; line-height: 1.4; color: #3b3b4f; max-width: 150mm; }
  .grow { flex: 1; }
  .toc { columns: 2; column-gap: 10mm; font-size: 9.5pt; border-top: .25mm solid var(--rule); padding-top: 4mm; }
  .toc div { padding: 1.2mm 0; break-inside: avoid; display: flex; gap: 3mm; }
  .toc b { font-family: Fraunces, serif; color: var(--red); width: 6mm; flex-shrink: 0; }
  .cfoot { display: flex; justify-content: space-between; font-size: 7.5pt; color: var(--muted); border-top: .25mm solid var(--rule); padding-top: 3mm; margin-top: 6mm; }

  /* Inside */
  .intro p { font-size: 13pt; line-height: 1.5; margin-bottom: 8mm; }
  section { margin-bottom: 9mm; }
  .head { display: grid; grid-template-columns: 30mm 1fr; align-items: end; break-after: avoid; margin-bottom: 4mm; }
  .num { font-weight: 800; font-size: 54pt; line-height: .8; color: var(--red); }
  .kick { color: var(--muted); margin-bottom: 1.5mm; }
  h2 { font-weight: 600; font-size: 25pt; line-height: 1.05; }
  p { font-size: 11pt; margin-bottom: 3mm; }
  p b, .t b { color: var(--red); }
  .tbl { width: 100%; border-collapse: collapse; margin: 2mm 0 5mm; break-inside: avoid; }
  .tbl th { text-align: left; color: var(--muted); padding: 0 3mm 2mm 0; border-bottom: .5mm solid var(--ink); }
  .tbl td { padding: 2.4mm 3mm 2.4mm 0; border-bottom: .25mm solid var(--rule); vertical-align: top; font-size: 10.5pt; }
  .tbl td:first-child { font-weight: 700; }
  .tr { display: block; font-size: 9pt; font-weight: 400; }
  .side { display: grid; grid-template-columns: 30mm 1fr; margin: 3mm 0 4mm; break-inside: avoid; }
  .lab { color: var(--red); padding-top: 1mm; padding-right: 3mm; }
  .ex { list-style: none; }
  .ex li { margin-bottom: 2.2mm; }
  .t { display: block; font-size: 11pt; }
  .tip { font-size: 10.5pt; border-left: .6mm solid var(--red); padding-left: 3.5mm; }
  .mis { border: .4mm solid var(--ink); padding: 3mm 4mm; font-family: Fraunces, "Noto Serif KR", serif; font-size: 10.5pt; }
  .mis s { color: var(--muted); }
  .why { font-size: 9.5pt; margin-top: 1mm; }
  .cando, .list { list-style: none; margin: 1mm 0 3mm; }
  .cando li { display: flex; gap: 3.5mm; align-items: flex-start; margin-bottom: 2.4mm; font-family: Fraunces, "Noto Serif KR", serif; font-size: 11pt; }
  .cando .box { flex: 0 0 4mm; height: 4mm; border: .35mm solid var(--ink); margin-top: 1mm; }
  .list li { padding-left: 5mm; position: relative; margin-bottom: 1mm; font-family: Fraunces, "Noto Serif KR", serif; font-size: 10.5pt; }
  .list li::before { content: "—"; position: absolute; left: 0; color: var(--red); }
  .drill { list-style: none; counter-reset: q; }
  .drill li { counter-increment: q; font-size: 10.5pt; margin-bottom: 1.8mm; }
  .drill li::before { content: counter(q) "."; color: var(--red); font-weight: 800; margin-right: 2.5mm; }
  .blank { display: inline-block; width: 22mm; border-bottom: .3mm solid var(--ink); margin: 0 1mm; }
  .ans { font-size: 7.5pt; color: var(--muted); margin-top: 1mm; }
  .dlg { list-style: none; margin: 2mm 0 4mm; }
  .dlg .side { margin: 0 0 2.5mm; }
  .dlg .lab { color: var(--ink); font-size: 9pt; letter-spacing: .02em; text-transform: none; }
  .source { font-size: 7.5pt; color: var(--muted); margin-top: 8mm; border-top: .25mm solid var(--rule); padding-top: 3mm; }
</style></head><body>
<div class="cover">
  <div class="mast"><b>Gongbu<span>Leng</span></b><i>${L.studyGuides} · ${language} · ${LV}</i></div>
  <div class="art"><div class="native">${native}</div><div class="big">${LV}</div></div>
  <div class="eyebrow">${levelLine} · ${L.freeGuide}</div>
  <h1>${title}</h1>
  ${guide.meta.promise ? `<p class="promise">${h(guide.meta.promise)}</p>` : ''}
  <div class="grow"></div>
  <div class="toc">${guide.sections.map((s, i) => `<div><b>${two(i + 1)}</b>${h(s.title)}</div>`).join('')}</div>
  <div class="cfoot"><span>gongbuleng.com</span><span>${L.liveClasses}</span></div>
</div>
${guide.intro.length ? `<div class="intro">${guide.intro.map(block).join('')}</div>` : ''}
${guide.sections.map((s, i) => `<section><div class="head"><div class="num">${two(i + 1)}</div><div>${s.kicker ? `<div class="kick">${h(s.kicker)}</div>` : ''}<h2>${h(s.title)}</h2></div></div>${s.blocks.map(block).join('')}</section>`).join('\n')}
${guide.meta.source ? `<p class="source">${L.writtenBy} ${h(guide.meta.source)}</p>` : ''}
</body></html>`
}
