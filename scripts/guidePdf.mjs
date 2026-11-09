// The PDF design for guides in the v2 format (lib/guideFormat.mjs): a cover
// page, then each section in the website's look (navy, red, yellow and cream,
// Baloo 2 headings) laid out for A4. Practice answers are printed under each
// exercise, since paper can't hide them.
//
// Page numbers use CSS page-margin boxes, which Chrome prints from version
// 131; the build already requires a local Chrome.

import { inlineHtml as h } from '../lib/guideFormat.mjs'

const LANGUAGES = {
  ko: ['Korean', '🇰🇷'], es: ['Spanish', '🇪🇸'], de: ['German', '🇩🇪'], en: ['English', '🇬🇧'],
  pt: ['Portuguese', '🇧🇷'], fr: ['French', '🇫🇷'], it: ['Italian', '🇮🇹'],
}
const LEVEL_WORD = { a1: 'Beginner', a2: 'Elementary', b1: 'Intermediate', b2: 'Upper intermediate' }
const TOPIK = { a1: 1, a2: 2, b1: 3, b2: 4 }

const cell = c => c.translation ? `<b>${h(c.text)}</b><span class="tr">${h(c.translation)}</span>` : h(c.text)

function block(b) {
  switch (b.type) {
    case 'p': return `<p>${h(b.text)}</p>`
    case 'list': return `<ul class="list">${b.items.map(i => `<li>${h(i)}</li>`).join('')}</ul>`
    case 'checklist': return `<ul class="cando">${b.items.map(i => `<li><span class="box"></span>${h(i)}</li>`).join('')}</ul>`
    case 'table':
      return `<table class="tbl"><thead><tr>${b.head.map(x => `<th>${h(x)}</th>`).join('')}</tr></thead><tbody>${
        b.rows.map(r => `<tr>${r.map(cell).map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    case 'examples':
      return `<ul class="ex">${b.items.map(e => `<li><span class="t">${h(e.text)}</span>${e.translation ? `<span class="tr">${h(e.translation)}</span>` : ''}</li>`).join('')}</ul>`
    case 'dialogue':
      return `<ul class="dlg">${b.lines.map((l, i) => `<li class="${i % 2 ? 'b' : 'a'}"><span class="who">${h(l.speaker)}</span><span class="say"><span class="t">${h(l.text)}</span>${l.translation ? `<span class="tr">${h(l.translation)}</span>` : ''}</span></li>`).join('')}</ul>`
    case 'tip': case 'note':
      return `<div class="call tip"><span class="lab">💡 Tip</span>${h(b.text)}</div>`
    case 'mistake':
      return `<div class="call mis"><span class="lab">⚠️ Common mistake</span>${b.pairs.map(p => `<div><s>${h(p.wrong)}</s> → <b>${h(p.right)}</b></div>`).join('')}${b.text ? `<div class="why">${h(b.text)}</div>` : ''}</div>`
    case 'practice':
      return `<div class="prac"><div class="ph">Quick practice</div><ol>${b.items.map(i => {
        const [before, after = ''] = i.question.split('___')
        return `<li>${h(before)}<span class="blank"></span>${h(after)}</li>`
      }).join('')}</ol><div class="ans">Answers: ${b.items.map((i, n) => `${n + 1} ${h(i.answer)}`).join(' · ')}</div></div>`
    default: return ''
  }
}

export function guidePdfHtml(guide, name) {
  const [code, level] = name.split('-')
  const [language, flag] = LANGUAGES[code] || [code.toUpperCase(), '']
  const words = guide.meta.title.split(' ')
  const title = `${h(words.slice(0, -1).join(' '))} <span>${h(words.at(-1))}</span>`
  const levelLine = code === 'ko' ? `TOPIK ${TOPIK[level]}` : LEVEL_WORD[level] || ''
  const lang = code === 'en' ? 'es' : 'en'

  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><title>${language} ${level.toUpperCase()} · GongbuLeng</title>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Inter:wght@400;600;700;800&family=Noto+Sans+KR:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root { --cream:#fdf3e7; --navy:#1a1a2e; --red:#da1f33; --yellow:#f4a623; --teal:#2ec4b6; --muted:rgba(26,26,46,.66); }
  @page { size: A4; margin: 18mm 17mm 20mm;
    @bottom-left { content: "GongbuLeng · ${language} ${level.toUpperCase()}"; font: 600 8pt Inter, sans-serif; color: #6b6b7b; }
    @bottom-right { content: "Practise with a real person: gongbuleng.com   " counter(page); font: 600 8pt Inter, sans-serif; color: #6b6b7b; } }
  @page :first { margin: 0; @bottom-left { content: none } @bottom-right { content: none } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Inter, "Noto Sans KR", sans-serif; color: var(--navy); font-size: 10.5pt; line-height: 1.5; word-break: keep-all; }
  .display, h2, .cover h1 { font-family: "Baloo 2", "Noto Sans KR", sans-serif; font-weight: 800; letter-spacing: -.01em; }

  /* Cover */
  .cover { position: relative; width: 210mm; height: 297mm; background: var(--cream); overflow: hidden; break-after: page; }
  .blob { position: absolute; border-radius: 50%; }
  .logo { position: absolute; left: 17mm; top: 16mm; font-family: "Baloo 2"; font-weight: 800; font-size: 22pt; }
  .logo span, .cover h1 span { color: var(--red); }
  .lvl { position: absolute; left: 17mm; top: 58mm; width: 44mm; height: 44mm; border-radius: 9mm; background: var(--red); border: 1.2mm solid var(--navy); box-shadow: 0 2mm 0 var(--navy); color: #fff; transform: rotate(-6deg); display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .lvl b { font-family: "Baloo 2"; font-size: 54pt; line-height: .9; }
  .lvl i { font-style: normal; font-weight: 800; font-size: 10pt; letter-spacing: .08em; text-transform: uppercase; }
  .flag { position: absolute; right: 17mm; top: 52mm; width: 60mm; height: 60mm; border-radius: 50%; background: var(--yellow); border: 1.2mm solid var(--navy); box-shadow: 0 2mm 0 var(--navy); display: flex; align-items: center; justify-content: center; font-size: 72pt; }
  .ctitle { position: absolute; left: 17mm; right: 17mm; top: 130mm; }
  .kick { color: var(--red); font-weight: 800; font-size: 9pt; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 2mm; }
  .cover h1 { font-size: 50pt; line-height: 1; }
  .cover .promise { font-size: 13pt; color: var(--muted); margin-top: 5mm; max-width: 150mm; }
  .toc { position: absolute; left: 17mm; right: 17mm; top: 222mm; columns: 2; column-gap: 8mm; font-weight: 700; font-size: 10pt; }
  .toc div { display: flex; gap: 3mm; align-items: center; margin-bottom: 2.4mm; break-inside: avoid; }
  .toc i { font-style: normal; width: 6.5mm; height: 6.5mm; border-radius: 50%; background: var(--navy); color: #fff; font-size: 8pt; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .cfoot { position: absolute; left: 17mm; right: 17mm; bottom: 12mm; border-top: .3mm solid rgba(26,26,46,.15); padding-top: 3mm; display: flex; justify-content: space-between; font-size: 8pt; color: var(--muted); }
  .cfoot b { font-family: "Baloo 2"; font-size: 11pt; color: var(--navy); }
  .cfoot b span { color: var(--red); }

  /* Inside */
  .intro { font-size: 11.5pt; margin-bottom: 6mm; color: var(--navy); }
  section { margin-bottom: 8mm; }
  section .kick { margin-bottom: 1mm; }
  h2 { font-size: 22pt; line-height: 1.05; margin-bottom: 3mm; break-after: avoid; }
  p { margin-bottom: 3mm; }
  .tbl { width: 100%; border-collapse: separate; border-spacing: 0; border: .6mm solid var(--navy); border-radius: 3.5mm; overflow: hidden; margin: 2mm 0 4mm; font-size: 9.5pt; break-inside: avoid; }
  .tbl th { background: var(--navy); color: #fff; text-align: left; padding: 2mm 3mm; font-size: 7.5pt; letter-spacing: .05em; text-transform: uppercase; }
  .tbl td { padding: 2.2mm 3mm; border-top: .25mm solid rgba(26,26,46,.12); vertical-align: top; }
  .tbl tr:first-child td { border-top: 0; }
  .tbl td:first-child { font-family: "Baloo 2", "Noto Sans KR"; font-weight: 800; font-size: 12pt; color: var(--red); }
  .tr { display: block; color: var(--muted); font-size: 8.5pt; font-weight: 400; font-family: Inter, sans-serif; }
  .ex { list-style: none; border-left: 1.2mm solid var(--teal); padding-left: 3.5mm; margin: 2mm 0 4mm; break-inside: avoid; }
  .ex li { margin-bottom: 2mm; }
  .ex .t, .dlg .t { font-weight: 700; display: block; }
  .ex .t b { color: var(--red); }
  .call { border: .6mm solid var(--navy); border-radius: 3.5mm; padding: 3mm 4mm; margin: 3mm 0; font-size: 9.5pt; break-inside: avoid; }
  .call .lab { display: block; font-weight: 800; font-size: 7.5pt; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 1mm; }
  .tip { background: #fff4d9; }
  .mis { background: #fdecee; }
  .mis s { color: var(--red); font-weight: 700; }
  .mis .why { color: var(--muted); margin-top: 1mm; }
  .cando, .list { list-style: none; margin: 1mm 0 3mm; }
  .list li { padding-left: 4mm; position: relative; margin-bottom: 1mm; }
  .list li::before { content: "•"; position: absolute; left: 0; color: var(--red); }
  .cando li { display: flex; gap: 3mm; align-items: flex-start; margin-bottom: 2mm; }
  .cando .box { flex: 0 0 4.5mm; height: 4.5mm; border: .5mm solid var(--navy); border-radius: 1.2mm; margin-top: .5mm; }
  .prac { margin: 3mm 0; break-inside: avoid; }
  .prac .ph { font-weight: 800; font-size: 9.5pt; margin-bottom: 1.5mm; }
  .prac ol { padding-left: 5mm; }
  .prac li { margin-bottom: 1.5mm; }
  .blank { display: inline-block; width: 16mm; border-bottom: .4mm dashed var(--navy); margin: 0 1mm; }
  .ans { font-size: 8pt; color: var(--muted); margin-top: 1mm; }
  .dlg { list-style: none; margin: 2mm 0 4mm; }
  .dlg li { display: flex; gap: 3mm; margin-bottom: 2mm; break-inside: avoid; }
  .dlg .who { flex: 0 0 22mm; font-weight: 800; font-size: 8.5pt; padding-top: .6mm; }
  .dlg li.a .who { color: #0f8f84; }
  .dlg li.b .who { color: #b06d00; }
  .source { font-size: 8pt; color: var(--muted); margin-top: 6mm; }
</style></head><body>
<div class="cover">
  <div class="blob" style="width:140mm;height:140mm;left:-50mm;top:170mm;background:rgba(244,166,35,.22)"></div>
  <div class="blob" style="width:110mm;height:110mm;right:-38mm;top:10mm;background:rgba(46,196,182,.16)"></div>
  <div class="logo">Gongbu<span>Leng</span></div>
  <div class="lvl"><b>${level.toUpperCase()}</b><i>${levelLine}</i></div>
  <div class="flag">${flag}</div>
  <div class="ctitle">
    <div class="kick">Free study guide · ${language}</div>
    <h1>${title}</h1>
    ${guide.meta.promise ? `<p class="promise">${h(guide.meta.promise)}</p>` : ''}
  </div>
  <div class="toc">${guide.sections.map((s, i) => `<div><i>${i + 1}</i>${h(s.title)}</div>`).join('')}</div>
  <div class="cfoot"><b>Gongbu<span>Leng</span></b><span>gongbuleng.com · learn in small live classes</span></div>
</div>
${guide.intro.map(b => `<div class="intro">${block(b)}</div>`).join('')}
${guide.sections.map(s => `<section>${s.kicker ? `<div class="kick">${h(s.kicker)}</div>` : ''}<h2>${h(s.title)}</h2>${s.blocks.map(block).join('')}</section>`).join('\n')}
${guide.meta.source ? `<p class="source">Written by GongbuLeng. ${h(guide.meta.source)}</p>` : ''}
</body></html>`
}
