// Builds public/teach/gongbuleng-class-slides.pptx, the 10-slide class
// template the "Make your class slides" guide (app/teach/slides) offers for
// download (owner request, 2026-11-19). Teachers replace the examples and
// keep either slide 3 (A1–A2) or slide 4 (B1 and up).
//
// Rebuild (pptxgenjs is not a site dependency):
//   mkdir -p /tmp/pptx && (cd /tmp/pptx && npm i pptxgenjs@3.12.0)
//   NODE_PATH=/tmp/pptx/node_modules node docs/teach/build-class-template.js
// The brand colours are written straight into the slides (no theme step),
// so the file looks the same in PowerPoint, Keynote and Google Slides.
const path = require('path')
const pptxgen = require('pptxgenjs')

const OUT = path.join(__dirname, '../../public/teach/gongbuleng-class-slides.pptx')
const NAVY = '1A1A2E', RED = 'DA1F33', CREAM = 'FDF3E7', WHITE = 'FFFFFF'
const GREEN = 'D9F5E1', BLUE = 'DDE8FF', YELLOW = 'FDE7A5', CORAL = 'FFD9CF', MUTED = '5A5A6E'
const FONT = 'Calibri'

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9' // 10 x 5.625 in
pres.title = 'GongbuLeng class template'
pres.author = 'GongbuLeng'
pres.theme = { headFontFace: FONT, bodyFontFace: FONT }

pres.defineSlideMaster({
  title: 'GL_DARK',
  background: { color: NAVY },
  objects: [
    { text: { text: 'GongbuLeng', options: { x: 0.5, y: 5.0, w: 3, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: CREAM, margin: 0 } } },
  ],
})
pres.defineSlideMaster({
  title: 'GL_LIGHT',
  background: { color: WHITE },
  objects: [
    { text: { text: 'GongbuLeng', options: { x: 0.5, y: 5.15, w: 3, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: MUTED, margin: 0 } } },
  ],
  slideNumber: { x: 9.1, y: 5.15, w: 0.4, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, align: 'right' },
})

// A fresh options object every call: pptxgenjs mutates them.
const shadow = () => ({ type: 'outer', color: NAVY, blur: 0, offset: 3, angle: 45, opacity: 1 })

function card(slide, { x, y, w, h, fill = WHITE, name }) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.14, fill: { color: fill }, line: { color: NAVY, width: 2 }, shadow: shadow(), objectName: name })
}
function text(slide, value, opts) {
  slide.addText(value, { fontFace: FONT, color: NAVY, isTextBox: true, margin: 0, valign: 'top', ...opts })
}
function title(slide, value, tag) {
  text(slide, value, { x: 0.5, y: 0.35, w: 7.0, h: 0.65, fontSize: 32, bold: true, valign: 'middle', objectName: 'Title' })
  if (tag) {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.6, y: 0.47, w: 1.9, h: 0.4, rectRadius: 0.2, fill: { color: RED }, line: { color: NAVY, width: 1.5 }, objectName: 'Level tag' })
    text(slide, tag, { x: 7.6, y: 0.47, w: 1.9, h: 0.4, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle' })
  }
}
// The green "students speak now" box the guide tells teachers to look for.
function speak(slide, value, { x = 0.5, y = 4.45, w = 9 } = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.5, rectRadius: 0.12, fill: { color: GREEN }, line: { color: NAVY, width: 1.5 }, objectName: 'Speaking prompt' })
  text(slide, `🗣️  ${value}`, { x: x + 0.2, y, w: w - 0.4, h: 0.5, fontSize: 15, bold: true, valign: 'middle' })
}
function circleIcon(slide, emoji, x, y, fill) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: 0.55, h: 0.55, fill: { color: fill }, line: { color: NAVY, width: 1.5 } })
  text(slide, emoji, { x, y, w: 0.55, h: 0.55, fontSize: 18, align: 'center', valign: 'middle' })
}

// 1 · Title
{
  const s = pres.addSlide({ masterName: 'GL_DARK' })
  text(s, 'Your class title', { x: 0.5, y: 1.55, w: 6, h: 1.1, fontSize: 44, bold: true, color: WHITE, valign: 'bottom', objectName: 'Class title' })
  text(s, 'Language · Level (e.g. A1) · with Your Name', { x: 0.5, y: 2.8, w: 6, h: 0.5, fontSize: 18, color: CREAM, objectName: 'Class details' })
  s.addShape(pres.shapes.OVAL, { x: 6.9, y: 1.2, w: 2.6, h: 2.6, fill: { color: CREAM }, line: { color: RED, width: 4 }, objectName: 'Flag or photo' })
  text(s, 'Your flag\nor a photo', { x: 6.9, y: 1.2, w: 2.6, h: 2.6, fontSize: 16, bold: true, align: 'center', valign: 'middle', color: MUTED })
  s.addNotes('Show this while people join. Say hello to each person by name as they arrive.')
}

// 2 · About me (the teacher)
{
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, 'About me')
  card(s, { x: 0.5, y: 1.25, w: 3.1, h: 3.5, fill: CREAM, name: 'Photo frame' })
  text(s, 'Your photo\n(drag it here)', { x: 0.5, y: 1.25, w: 3.1, h: 3.5, fontSize: 16, bold: true, color: MUTED, align: 'center', valign: 'middle' })
  const rows = [
    ['👋', 'Your name, and where you are from', CORAL],
    ['🎓', 'What you study or do', BLUE],
    ['🗣️', 'The languages you speak', GREEN],
    ['⭐', 'One fun fact about you', YELLOW],
  ]
  rows.forEach(([emoji, label, fill], i) => {
    const y = 1.3 + i * 0.85
    circleIcon(s, emoji, 4.0, y, fill)
    text(s, label, { x: 4.75, y, w: 4.75, h: 0.55, fontSize: 18, valign: 'middle', objectName: `About ${i + 1}` })
  })
  s.addNotes('You go first, about 1 minute. Keep it short and friendly: students copy what you do, so you are showing them how to introduce themselves.')
}

// 3 · Let's meet! (A1–A2)
{
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, "Let's meet!", 'A1–A2')
  ;['My name is ___', "I'm from ___", "I'm learning ___ because ___"].forEach((translation, i) => {
    const y = 1.2 + i * 1.02
    card(s, { x: 0.5, y, w: 9, h: 0.85, name: `Starter ${i + 1}` })
    text(s, 'Write this sentence in the language you teach', { x: 0.75, y: y + 0.1, w: 8.5, h: 0.36, fontSize: 18, bold: true, objectName: `Starter ${i + 1} sentence` })
    text(s, translation, { x: 0.75, y: y + 0.47, w: 8.5, h: 0.3, fontSize: 14, color: MUTED, objectName: `Starter ${i + 1} translation` })
  })
  speak(s, 'Each student, about 1 minute')
  s.addNotes('For A1–A2 classes: keep this slide and delete the next one. Call each student by name (the People tab in the video call shows who is there and their level). If someone gets stuck, help with one easy question.')
}

// 4 · Let's meet! (B1 and up)
{
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, "Let's meet!", 'B1 and up')
  card(s, { x: 1.5, y: 1.35, w: 7, h: 2.6, fill: CORAL, name: 'Introduce yourself' })
  text(s, 'Introduce yourself!', { x: 1.5, y: 1.75, w: 7, h: 1.1, fontSize: 40, bold: true, align: 'center', valign: 'middle', objectName: 'Prompt' })
  text(s, 'Write it in the language you teach. No set questions: students say whatever they like.', { x: 2.0, y: 2.9, w: 6, h: 0.7, fontSize: 14, color: MUTED, align: 'center' })
  speak(s, 'Each student, about 1 minute')
  s.addNotes('For B1 and up: keep this slide and delete the previous one. Just ask everyone to introduce themselves to the class, in the language you teach.')
}

// 5 · Today you'll be able to…
{
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, "Today you'll be able to…")
  ;['Goal 1\ne.g. order food in a café', 'Goal 2\ne.g. ask how much it costs', 'Goal 3\ne.g. say what you want'].forEach((goal, i) => {
    const x = 0.5 + i * 3.1
    card(s, { x, y: 1.4, w: 2.8, h: 2.7, name: `Goal ${i + 1}` })
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: 1.65, w: 0.6, h: 0.6, fill: { color: GREEN }, line: { color: NAVY, width: 1.5 } })
    text(s, '✓', { x: x + 0.25, y: 1.65, w: 0.6, h: 0.6, fontSize: 22, bold: true, align: 'center', valign: 'middle' })
    text(s, goal, { x: x + 0.25, y: 2.45, w: 2.3, h: 1.5, fontSize: 16, objectName: `Goal ${i + 1} text` })
  })
  text(s, '2–3 goals, not more. Students should be able to say "yes, I can do that now" at the end.', { x: 0.5, y: 4.4, w: 9, h: 0.4, fontSize: 12, color: MUTED })
  s.addNotes('About 2 minutes. Read the goals out loud; you will come back to them in the recap.')
}

// 6 · Key words
{
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, 'Key words')
  for (let i = 0; i < 6; i++) {
    const x = 0.5 + (i % 3) * 3.1, y = 1.25 + Math.floor(i / 3) * 1.55
    card(s, { x, y, w: 2.8, h: 1.3, fill: i % 2 ? WHITE : BLUE, name: `Word ${i + 1}` })
    text(s, `Word ${i + 1}`, { x: x + 0.25, y: y + 0.2, w: 2.3, h: 0.5, fontSize: 22, bold: true, objectName: `Word ${i + 1} word` })
    text(s, 'what it means', { x: x + 0.25, y: y + 0.72, w: 2.3, h: 0.4, fontSize: 14, color: MUTED, objectName: `Word ${i + 1} meaning` })
  }
  text(s, '5–8 words. A picture next to a word helps more than a translation.', { x: 0.5, y: 4.45, w: 9, h: 0.4, fontSize: 12, color: MUTED })
  s.addNotes('About 10 minutes. Say each word, students repeat it, then ask one student to use it in a sentence. Tip: take the words from the "Words to know" part of our study guide for your level.')
}

// 7 · One pattern
{
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, 'One pattern')
  card(s, { x: 0.5, y: 1.2, w: 9, h: 1.35, fill: YELLOW, name: 'Pattern' })
  text(s, 'The pattern   →   what it means', { x: 0.8, y: 1.3, w: 8.4, h: 0.75, fontSize: 30, bold: true, valign: 'middle', objectName: 'Pattern text' })
  text(s, 'e.g. "___, please" when you ask for something', { x: 0.8, y: 2.0, w: 8.4, h: 0.4, fontSize: 14, color: MUTED })
  ;[['Example 1', 'A short, real sentence that uses the pattern'], ['Example 2', "Another one, with one of today's words"]].forEach(([head, body], i) => {
    const x = 0.5 + i * 4.6
    card(s, { x, y: 2.85, w: 4.4, h: 1.35, name: head })
    text(s, head, { x: x + 0.25, y: 3.0, w: 3.9, h: 0.4, fontSize: 18, bold: true })
    text(s, body, { x: x + 0.25, y: 3.45, w: 3.9, h: 0.6, fontSize: 14, color: MUTED })
  })
  s.addNotes('About 10 minutes. One pattern only. If you can explain it in one sentence, the slide is right. The "Watch out for" part of our study guides lists common mistakes.')
}

// 8 · Practice
{
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, 'Practice')
  card(s, { x: 0.5, y: 1.2, w: 9, h: 0.9, fill: CREAM, name: 'Situation' })
  text(s, 'Situation: e.g. You are in a café in a city where your language is spoken.', { x: 0.8, y: 1.2, w: 8.4, h: 0.9, fontSize: 18, bold: true, valign: 'middle', objectName: 'Situation text' })
  ;[['Person A', 'e.g. You are the customer. Order something to eat and drink.', CORAL], ['Person B', 'e.g. You work in the café. Take the order and say the price.', BLUE]].forEach(([head, body, fill], i) => {
    const x = 0.5 + i * 4.6
    card(s, { x, y: 2.35, w: 4.4, h: 1.8, fill, name: head })
    text(s, head, { x: x + 0.25, y: 2.5, w: 3.9, h: 0.45, fontSize: 20, bold: true })
    text(s, body, { x: x + 0.25, y: 3.0, w: 3.9, h: 1.0, fontSize: 15 })
  })
  speak(s, 'In pairs, about 3 minutes, then swap roles')
  s.addNotes('Part of the 26 minutes of speaking practice. In a group call, let pairs take turns while the others listen. Students should talk much more than you here.')
}

// 9 · Your turn
{
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, 'Your turn')
  card(s, { x: 1.0, y: 1.3, w: 8, h: 2.75, fill: GREEN, name: 'Open question' })
  text(s, "An open question that uses today's words", { x: 1.4, y: 1.55, w: 7.2, h: 1.3, fontSize: 30, bold: true, align: 'center', valign: 'middle', objectName: 'Question' })
  text(s, 'e.g. "What did you eat yesterday? Use three new words."', { x: 1.4, y: 2.95, w: 7.2, h: 0.5, fontSize: 15, color: MUTED, align: 'center' })
  speak(s, 'Open talk: everyone answers')
  s.addNotes("The rest of the speaking time. Ask a follow-up question to each answer. Correct gently, and only the mistakes about today's pattern.")
}

// 10 · Recap
{
  const s = pres.addSlide({ masterName: 'GL_DARK' })
  text(s, 'Today we learned', { x: 0.5, y: 0.45, w: 9, h: 0.7, fontSize: 36, bold: true, color: WHITE, objectName: 'Recap title' })
  ;[['3 words', 'The three most useful words from today'], ['The pattern', 'Write the pattern again, with one example'], ['Try at home', 'One small thing to try this week']].forEach(([head, body], i) => {
    const x = 0.5 + i * 3.1
    card(s, { x, y: 1.45, w: 2.8, h: 2.35, fill: CREAM, name: head })
    text(s, head, { x: x + 0.25, y: 1.65, w: 2.3, h: 0.5, fontSize: 20, bold: true })
    text(s, body, { x: x + 0.25, y: 2.2, w: 2.3, h: 1.3, fontSize: 15, color: MUTED })
  })
  text(s, 'Thank you! See you next class 👋', { x: 0.5, y: 4.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: CREAM })
  s.addNotes('About 5 minutes. Go back to the goals from slide 5 and ask: can you do these now? Then remind everyone to rate the class.')
}

pres.writeFile({ fileName: OUT }).then(f => console.log('wrote', f))
