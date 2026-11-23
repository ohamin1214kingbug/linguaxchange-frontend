// Builds the two ready-made Korean lesson decks offered under
// Guides → For teachers → Ready lesson decks (owner request, 2026-11-23):
//   public/teach/korean-hangeul-1.pptx  "Read Hangeul: the 24 basic letters"
//   public/teach/korean-hangeul-2.pptx  "Hangeul part 2: sounds that change"
// Both follow the 60-minute class shape from the slides guide and carry
// speaker notes (timing, what to say, what to ask) on every slide.
// Romanization is the official Revised Romanization; pronunciations in
// [brackets] follow the standard pronunciation rules. The owner checks the
// Korean before each release.
//
// Rebuild (pptxgenjs is not a site dependency):
//   mkdir -p /tmp/pptx && (cd /tmp/pptx && npm i pptxgenjs@3.12.0)
//   NODE_PATH=/tmp/pptx/node_modules node docs/teach/build-korean-hangeul-decks.js
// Hangul is set in the same font as the rest; PowerPoint, Keynote and Google
// Slides fall back to their own Korean font for those characters, so no
// font has to be installed.
const path = require('path')
const pptxgen = require('pptxgenjs')

const OUT_DIR = path.join(__dirname, '../../public/teach')
const NAVY = '1A1A2E', RED = 'DA1F33', CREAM = 'FDF3E7', WHITE = 'FFFFFF'
const GREEN = 'D9F5E1', BLUE = 'DDE8FF', YELLOW = 'FDE7A5', CORAL = 'FFD9CF', PURPLE = 'EADCFF', MUTED = '5A5A6E'
const FONT = 'Calibri'
const SH = new pptxgen().shapes

function newDeck(title) {
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_16x9' // 10 x 5.625 in
  pres.title = title
  pres.author = 'GongbuLeng'
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT }
  pres.defineSlideMaster({
    title: 'GL_DARK',
    background: { color: NAVY },
    objects: [{ text: { text: 'GongbuLeng', options: { x: 0.5, y: 5.0, w: 3, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: CREAM, margin: 0 } } }],
  })
  pres.defineSlideMaster({
    title: 'GL_LIGHT',
    background: { color: WHITE },
    objects: [{ text: { text: 'GongbuLeng · Korean', options: { x: 0.5, y: 5.15, w: 3, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: MUTED, margin: 0 } } }],
    slideNumber: { x: 9.1, y: 5.15, w: 0.4, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, align: 'right' },
  })
  return pres
}

// A fresh options object every call: pptxgenjs mutates them.
const shadow = () => ({ type: 'outer', color: NAVY, blur: 0, offset: 3, angle: 45, opacity: 1 })
const card = (s, { x, y, w, h, fill = WHITE, flat }) =>
  s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: NAVY, width: flat ? 1.5 : 2 }, shadow: flat ? undefined : shadow() })
const text = (s, value, opts) =>
  s.addText(value, { fontFace: FONT, color: NAVY, isTextBox: true, margin: 0, valign: 'top', ...opts })
function title(s, value, tag) {
  text(s, value, { x: 0.5, y: 0.3, w: tag ? 7.0 : 9, h: 0.65, fontSize: 30, bold: true, valign: 'middle' })
  if (tag) {
    s.addShape(SH.ROUNDED_RECTANGLE, { x: 7.6, y: 0.42, w: 1.9, h: 0.4, rectRadius: 0.2, fill: { color: RED }, line: { color: NAVY, width: 1.5 } })
    text(s, tag, { x: 7.6, y: 0.42, w: 1.9, h: 0.4, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle' })
  }
}
// The green "students speak now" box the slides guide tells teachers about.
function speak(s, value, { x = 0.5, y = 4.45, w = 9 } = {}) {
  s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w, h: 0.5, rectRadius: 0.12, fill: { color: GREEN }, line: { color: NAVY, width: 1.5 } })
  text(s, `🗣️  ${value}`, { x: x + 0.2, y, w: w - 0.4, h: 0.5, fontSize: 15, bold: true, valign: 'middle' })
}
// A grid of cards: a big line (usually Korean) over a small caption.
function tiles(s, items, { x = 0.5, y = 1.2, w = 9, cols, h = 1.1, gap = 0.18, fill = WHITE, big = 30, small = 12, split = 0.62 }) {
  const cw = (w - gap * (cols - 1)) / cols
  items.forEach(([top, bottom, color], i) => {
    const cx = x + (i % cols) * (cw + gap), cy = y + Math.floor(i / cols) * (h + gap)
    card(s, { x: cx, y: cy, w: cw, h, fill: color || fill, flat: true })
    text(s, top, { x: cx, y: cy + 0.06, w: cw, h: h * split, fontSize: big, bold: true, align: 'center', valign: 'middle' })
    if (bottom) text(s, bottom, { x: cx + 0.05, y: cy + h * (split + 0.02), w: cw - 0.1, h: h * (0.96 - split), fontSize: small, color: MUTED, align: 'center', valign: 'middle', fit: 'shrink' })
  })
}
function table(s, rows, { x = 0.5, y = 1.15, w = 9, colW, rowH = 0.38, fontSize = 15, head = true }) {
  const data = rows.map((row, r) => row.map(cell => ({
    text: cell,
    options: { bold: head && r === 0, fill: { color: head && r === 0 ? CREAM : WHITE }, fontSize: head && r === 0 ? 12 : fontSize },
  })))
  s.addTable(data, { x, y, w, colW, rowH, fontFace: FONT, color: NAVY, align: 'center', valign: 'middle', margin: 0.03, border: { type: 'solid', pt: 1, color: 'C9C9D1' } })
}
function bullets(s, lines, { x = 0.5, y = 1.2, w = 9, h = 3, fontSize = 17 } = {}) {
  text(s, lines.map(l => ({ text: l, options: { breakLine: true } })), { x, y, w, h, fontSize, paraSpaceAfter: 8 })
}
function titleSlide(pres, kicker, big, korean, notes) {
  const s = pres.addSlide({ masterName: 'GL_DARK' })
  text(s, kicker, { x: 0.5, y: 0.9, w: 6, h: 0.35, fontSize: 13, bold: true, color: YELLOW, charSpacing: 1 })
  text(s, big, { x: 0.5, y: 1.35, w: 6, h: 1.6, fontSize: 40, bold: true, color: WHITE, valign: 'bottom' })
  text(s, 'Korean · A1 · with Your Name', { x: 0.5, y: 3.1, w: 6, h: 0.45, fontSize: 18, color: CREAM })
  s.addShape(SH.OVAL, { x: 6.9, y: 1.15, w: 2.6, h: 2.6, fill: { color: CREAM }, line: { color: RED, width: 4 } })
  text(s, korean, { x: 6.9, y: 1.15, w: 2.6, h: 2.6, fontSize: 60, bold: true, align: 'center', valign: 'middle' })
  s.addNotes(notes)
}
function aboutMe(pres) {
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, 'About me')
  card(s, { x: 0.5, y: 1.2, w: 3.1, h: 3.55, fill: CREAM })
  text(s, 'Your photo\n(drag it here)', { x: 0.5, y: 1.2, w: 3.1, h: 3.55, fontSize: 16, bold: true, color: MUTED, align: 'center', valign: 'middle' })
  ;[['👋', 'Your name, and where in Korea you are from', CORAL], ['🎓', 'What you study or do', BLUE], ['🗣️', 'The languages you speak', GREEN], ['⭐', 'One fun fact about you', YELLOW]].forEach(([emoji, label, fill], i) => {
    const y = 1.3 + i * 0.85
    s.addShape(SH.OVAL, { x: 4.0, y, w: 0.55, h: 0.55, fill: { color: fill }, line: { color: NAVY, width: 1.5 } })
    text(s, emoji, { x: 4.0, y, w: 0.55, h: 0.55, fontSize: 18, align: 'center', valign: 'middle' })
    text(s, label, { x: 4.75, y, w: 4.75, h: 0.55, fontSize: 18, valign: 'middle' })
  })
  s.addNotes('About 1 minute. You go first; students copy what you do, so keep it short and friendly. Replace the four lines with your own.')
}
function goals(pres, items, notes) {
  const s = pres.addSlide({ masterName: 'GL_LIGHT' })
  title(s, "Today you'll be able to…")
  items.forEach((goal, i) => {
    const x = 0.5 + i * 3.1
    card(s, { x, y: 1.35, w: 2.8, h: 2.75 })
    s.addShape(SH.OVAL, { x: x + 0.25, y: 1.6, w: 0.6, h: 0.6, fill: { color: GREEN }, line: { color: NAVY, width: 1.5 } })
    text(s, '✓', { x: x + 0.25, y: 1.6, w: 0.6, h: 0.6, fontSize: 22, bold: true, align: 'center', valign: 'middle' })
    text(s, goal, { x: x + 0.25, y: 2.4, w: 2.3, h: 1.55, fontSize: 17 })
  })
  s.addNotes(notes)
}
function recap(pres, items, notes) {
  const s = pres.addSlide({ masterName: 'GL_DARK' })
  text(s, 'Today we learned', { x: 0.5, y: 0.45, w: 9, h: 0.7, fontSize: 36, bold: true, color: WHITE })
  items.forEach(([head, body], i) => {
    const x = 0.5 + i * 3.1
    card(s, { x, y: 1.45, w: 2.8, h: 2.5, fill: CREAM })
    text(s, head, { x: x + 0.25, y: 1.65, w: 2.3, h: 0.5, fontSize: 20, bold: true })
    text(s, body, { x: x + 0.25, y: 2.2, w: 2.3, h: 1.6, fontSize: 15, color: MUTED })
  })
  text(s, '감사합니다! Thank you! 👋', { x: 0.5, y: 4.2, w: 9, h: 0.5, fontSize: 20, bold: true, color: CREAM })
  s.addNotes(notes)
}

// Hangul syllable from jamo indexes (Unicode: 0xAC00 + (initial * 21 + vowel) * 28 + final).
const INITIAL = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const VOWEL = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const syllable = (c, v) => String.fromCharCode(0xac00 + (INITIAL.indexOf(c) * 21 + VOWEL.indexOf(v)) * 28)

// ───────────────────────── Lesson 1 ─────────────────────────
function lesson1() {
  const pres = newDeck('Korean · Lesson 1 · Read Hangeul: the 24 basic letters')

  // 1
  titleSlide(pres, 'KOREAN · A1 · LESSON 1', 'Read Hangeul:\nthe 24 basic letters', '한글',
    'Show this while people join. Greet each person by name as they arrive. Put your name in the line under the title. Total plan: 60 minutes, timings are in the notes of each slide.')

  // 2
  aboutMe(pres)

  // 3
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, "Let's meet!", 'A1')
    ;[
      ['안녕하세요! 저는 ___예요/이에요.', 'Annyeonghaseyo! Jeoneun ___(i)eyo.  ·  Hello! I\'m ___.'],
      ['___에서 왔어요.', '___eseo wasseoyo.  ·  I\'m from ___.'],
      ['한국어를 배우고 있어요.', 'Hangugeoreul baeugo isseoyo.  ·  I\'m learning Korean.'],
    ].forEach(([ko, help], i) => {
      const y = 1.15 + i * 1.03
      card(s, { x: 0.5, y, w: 9, h: 0.88 })
      text(s, ko, { x: 0.75, y: y + 0.08, w: 8.5, h: 0.42, fontSize: 20, bold: true })
      text(s, help, { x: 0.75, y: y + 0.5, w: 8.5, h: 0.3, fontSize: 13, color: MUTED })
    })
    speak(s, 'Each student, about 1 minute')
    s.addNotes('About 6 minutes. Students cannot read Hangeul yet, so they use the grey line; say each sentence first and let them repeat. After a name ending in a vowel use 예요 (마리아예요), after a consonant 이에요. Call each student by name (the People tab in the call shows who is there). Tell them: by the end of today they will read the top line themselves.')
  }

  // 4
  goals(pres, ['Read the 24 basic letters of Hangeul', 'Build and read any simple block, like 가, 고 or 강', 'Read 10 everyday words and write your name'],
    'About 1 minute. Read the goals out loud; come back to them in the recap.')

  // 5
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Hangeul in one minute')
    bullets(s, [
      '✏️  Created by King Sejong in 1443, so that everyone, not only scholars, could read.',
      '🔤  24 basic letters: 14 consonants + 10 vowels.',
      '🧱  Letters are grouped into syllable blocks:  한 + 글 = 한글',
      '👀  Inside a block you read left → right, then top → bottom.',
    ], { y: 1.2, h: 3.0, fontSize: 19 })
    speak(s, 'Ask: which alphabets can you already read?')
    s.addNotes('About 2 minutes. Hangeul was created in 1443 and announced in 1446; Korea celebrates Hangeul Day on 9 October. The key idea for today: it is an alphabet, not pictures, and the letters are logical. Most people can read it after a few hours.')
  }

  // 6
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Why the consonants look like that')
    tiles(s, [
      ['ㄱ', 'back of the tongue touches the roof of the mouth', CORAL],
      ['ㄴ', 'tongue tip touches behind the top teeth', CORAL],
      ['ㅁ', 'the shape of the closed lips', CORAL],
      ['ㅅ', 'the shape of a tooth', CORAL],
      ['ㅇ', 'the shape of the open throat', CORAL],
    ], { y: 1.15, cols: 5, h: 1.75, big: 44, small: 11 })
    card(s, { x: 0.5, y: 3.15, w: 9, h: 1.05, fill: YELLOW, flat: true })
    text(s, 'Add a stroke → a stronger sound', { x: 0.75, y: 3.2, w: 8.5, h: 0.4, fontSize: 16, bold: true })
    text(s, 'ㄱ → ㅋ      ㄴ → ㄷ → ㅌ      ㅁ → ㅂ → ㅍ      ㅅ → ㅈ → ㅊ      ㅇ → ㅎ', { x: 0.75, y: 3.6, w: 8.5, h: 0.5, fontSize: 22, bold: true })
    s.addNotes('About 4 minutes. Ask students to say "g", "n", "m" and feel where the tongue and lips are, then look at the letter. The five base letters were drawn from the mouth; the others add strokes for a stronger or breathier sound. ㄹ (r/l) is the one exception that does not follow the pattern. This makes the 14 consonants much easier to remember.')
  }

  // 7
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Vowels from 3 strokes')
    tiles(s, [['·', 'the sky', BLUE], ['ㅡ', 'the flat ground', BLUE], ['ㅣ', 'a standing person', BLUE]], { y: 1.15, cols: 3, h: 1.35, big: 44, small: 13 })
    table(s, [
      ['dot on the right of ㅣ', 'dot on the left of ㅣ', 'dot above ㅡ', 'dot below ㅡ'],
      ['ㅏ  a', 'ㅓ  eo', 'ㅗ  o', 'ㅜ  u'],
    ], { y: 2.75, rowH: 0.45, fontSize: 22 })
    text(s, 'Today the dot is written as a short stroke. Two short strokes add a "y":  ㅏ → ㅑ   ㅓ → ㅕ   ㅗ → ㅛ   ㅜ → ㅠ', { x: 0.5, y: 3.85, w: 9, h: 0.6, fontSize: 15 })
    s.addNotes('About 3 minutes. Every vowel is a long line (ㅡ or ㅣ) plus short strokes. Draw ㅣ, add a stroke on the right: ㅏ. Ask them to guess ㅓ before you show it. Then the y-versions: one more stroke = add a "y" sound.')
  }

  // 8
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'The 10 basic vowels')
    tiles(s, [
      ['ㅏ', 'a · "a" in father'], ['ㅓ', 'eo · open, between a and o'], ['ㅗ', 'o · round lips'], ['ㅜ', 'u · lips forward'], ['ㅡ', 'eu · say u while smiling'],
      ['ㅑ', 'ya'], ['ㅕ', 'yeo'], ['ㅛ', 'yo'], ['ㅠ', 'yu'], ['ㅣ', 'i · "ee" in see'],
    ].map(([k, c], i) => [k, c, i < 5 ? BLUE : WHITE]), { y: 1.15, cols: 5, h: 1.4, big: 34, small: 12, split: 0.52 })
    text(s, 'A vowel never stands alone: write it with a silent ㅇ in front →  아 어 오 우 으 이', { x: 0.5, y: 4.35, w: 9, h: 0.5, fontSize: 16, bold: true })
    s.addNotes('About 5 minutes. Say each vowel, students repeat. The two that need practice: ㅓ (mouth open, sound from further back than ㅏ) and ㅡ (lips flat, like a "u" with a smile). Show your mouth on camera. Romanization is the official Revised Romanization, so "eo" and "eu" are one sound each, not two.')
  }

  // 9
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Practice: point and say')
    tiles(s, ['오', '이', '어', '우', '아', '으', '요', '여', '유', '야'].map(k => [k, '', YELLOW]), { y: 1.15, cols: 5, h: 1.3, big: 44 })
    speak(s, 'Teacher points, the class says it. Then students take turns pointing for each other')
    s.addNotes('About 4 minutes. Answers in order: o, i, eo, u, a, eu, yo, yeo, yu, ya. Go faster each round. Listen for ㅓ vs ㅗ and ㅡ vs ㅜ, the usual mix-ups.')
  }

  // 10
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'The 14 basic consonants')
    tiles(s, [['ㄱ', 'g / k'], ['ㄴ', 'n'], ['ㄷ', 'd / t'], ['ㄹ', 'r / l'], ['ㅁ', 'm'], ['ㅂ', 'b / p'], ['ㅅ', 's'],
      ['ㅇ', 'silent / ng'], ['ㅈ', 'j'], ['ㅊ', 'ch'], ['ㅋ', 'k'], ['ㅌ', 't'], ['ㅍ', 'p'], ['ㅎ', 'h']].map(([k, c]) => [k, c, CORAL]),
    { y: 1.15, cols: 7, h: 1.25, big: 34, small: 12 })
    text(s, 'ㅇ is silent at the start of a block (아 = a) and says "ng" at the end (강 = gang).', { x: 0.5, y: 4.0, w: 9, h: 0.4, fontSize: 15, bold: true })
    text(s, 'ㄱ ㄷ ㅂ sound softer than English k t p: close to g d b, especially between vowels.', { x: 0.5, y: 4.4, w: 9, h: 0.4, fontSize: 14, color: MUTED })
    s.addNotes('About 5 minutes. Go row by row; students repeat. Link back to slide 6: ㅋ is ㄱ with a stroke, ㅌ is ㄷ with a stroke, and so on. Do not explain the difference between ㄱ/ㅋ/ㄲ in depth today; that is lesson 2.')
  }

  // 11
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Writing the letters')
    bullets(s, [
      '1.  Top → bottom, left → right, always.',
      '2.  ㅇ is one circle: start at the top and go round to the left.',
      '3.  Lines are straight, corners are sharp: ㄱ ㄴ ㄷ, not curves.',
      '4.  Keep every block the same size, like a square.',
    ], { y: 1.2, h: 2.4, fontSize: 19 })
    speak(s, 'On paper: write ㄱ to ㅎ once, then show your page to the camera')
    s.addNotes('About 3 minutes. Write on your screen or on paper in front of the camera while students copy. Students who are on a phone can write with a finger in the chat drawing or just on paper.')
  }

  // 12
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Build a block')
    ;[
      ['Tall vowel → on the right', 'ㅏ ㅑ ㅓ ㅕ ㅣ', '가  너  미', BLUE],
      ['Flat vowel → below', 'ㅗ ㅛ ㅜ ㅠ ㅡ', '고  누  그', YELLOW],
      ['Last consonant → at the bottom', 'ㄱ + ㅏ + ㅇ', '강  문  밥', GREEN],
    ].forEach(([head, rule, ex, fill], i) => {
      const x = 0.5 + i * 3.1
      card(s, { x, y: 1.15, w: 2.8, h: 2.9, fill })
      text(s, head, { x: x + 0.2, y: 1.3, w: 2.4, h: 0.6, fontSize: 16, bold: true })
      text(s, rule, { x: x + 0.2, y: 1.95, w: 2.4, h: 0.45, fontSize: 18, color: MUTED })
      text(s, ex, { x: x + 0.1, y: 2.6, w: 2.6, h: 1.1, fontSize: 36, bold: true, align: 'center', valign: 'middle' })
    })
    text(s, 'Every block starts with a consonant. No sound at the start? Use the silent ㅇ.', { x: 0.5, y: 4.3, w: 9, h: 0.45, fontSize: 15, bold: true })
    s.addNotes('About 4 minutes. Read the examples together: ga, neo, mi · go, nu, geu · gang, mun, bap. Ask a student to build a block you say out loud, e.g. "na", "so", "bam". The last consonant (받침, batchim) gets its own lesson next time; today only the easy ones.')
  }

  // 13 · the syllable chart, computed so it cannot have a typo
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Syllable chart: read across')
    const cons = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split(''), vows = 'ㅏㅓㅗㅜㅣ'.split('')
    table(s, [['', ...vows], ...cons.map(c => [c, ...vows.map(v => syllable(c, v))])],
      { x: 0.5, y: 1.0, w: 6.0, rowH: 0.262, fontSize: 13 })
    card(s, { x: 6.85, y: 1.0, w: 2.65, h: 3.95, fill: GREEN, flat: true })
    text(s, '🗣️ In pairs', { x: 7.05, y: 1.15, w: 2.3, h: 0.4, fontSize: 16, bold: true })
    text(s, 'One reads a row out loud, the other checks.\n\nThen swap and read a column.\n\nFast round: the teacher says a block, everyone finds it.', { x: 7.05, y: 1.6, w: 2.3, h: 3.2, fontSize: 14 })
    s.addNotes('About 6 minutes. 70 blocks, all from today\'s letters. Read the first row together (ga, geo, go, gu, gi), then let pairs read. Remember: ㅇ is silent, so the ㅇ row is just the vowels.')
  }

  // 14
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Read these! You already know them')
    tiles(s, [['바나나', 'banana 🍌'], ['커피', 'coffee'], ['카페', 'café'], ['피자', 'pizza'], ['버스', 'bus'],
      ['택시', 'taxi'], ['서울', 'Seoul'], ['라면', 'ramyeon'], ['우유', 'milk'], ['아이', 'child']],
    { y: 1.15, cols: 5, h: 1.3, big: 28, small: 12 })
    speak(s, 'Cover the English first: who can read it?')
    s.addNotes('About 4 minutes. Romanization: banana, keopi, kape, pija, beoseu, taeksi, Seoul, ramyeon, uyu, ai. Most are loanwords, so students can guess the meaning once they read them. Point out that English f and z don\'t exist: coffee is 커피 (keopi), pizza is 피자 (pija).')
  }

  // 15
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Write your name in Hangeul')
    tiles(s, [['마리아', 'María'], ['루시아', 'Lucía'], ['카를로스', 'Carlos'], ['소피아', 'Sofía'], ['페르난도', 'Fernando'], ['빅토르', 'Víctor']].map(([k, c]) => [k, c, YELLOW]),
      { y: 1.1, cols: 6, h: 1.25, big: 22, small: 12 })
    bullets(s, [
      'Write it the way it sounds, one block per syllable.',
      'There is no f or v in Korean: f → ㅍ, v → ㅂ.',
      'A consonant without a vowel gets ㅡ: Carlos → 카를로스.',
    ], { y: 2.6, h: 1.7, fontSize: 16 })
    speak(s, 'Everyone writes their name in the chat; the class reads each one out')
    s.addNotes('About 5 minutes. There is often more than one possible spelling of a foreign name; accept anything that sounds right and show the most common one. Help each student in turn. A nice moment: everyone now has their name in Hangeul.')
  }

  // 16
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Common mistakes')
    table(s, [
      ['watch out', 'why'],
      ['ㅓ vs ㅗ  (어 / 오)', 'ㅓ: mouth open, lips relaxed. ㅗ: lips round.'],
      ['ㅡ vs ㅜ  (으 / 우)', 'ㅡ: lips flat, like a smile. ㅜ: lips forward.'],
      ['ㄹ  r or l?', 'r between vowels (나라 nara), l at the end (물 mul).'],
      ['ㅇ at the start', 'Silent: 아 is "a", not "nga".'],
      ['Reading order', 'Left → right, then top → bottom: 강 = ㄱ + ㅏ + ㅇ.'],
    ], { y: 1.15, colW: [2.9, 6.1], rowH: 0.52, fontSize: 15 })
    s.addNotes('About 2 minutes. Ask students which of these they noticed in themselves today.')
  }

  // 17
  recap(pres, [
    ['24 letters', '14 consonants and 10 vowels, drawn from the mouth and from 3 strokes.'],
    ['Blocks', 'Consonant + vowel (+ consonant). Silent ㅇ when there is no first sound.'],
    ['You can read', '바나나, 커피, 서울… and your own name.'],
  ], 'About 1 minute. Go back to the goals on slide 4 and ask: can you do these now?')

  // 18
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Try at home')
    tiles(s, [
      ['🔎', 'Find 5 Korean words around you (a menu, a K-pop title, a shop sign) and read them out loud', BLUE],
      ['✍️', 'Write your name and 3 friends\' names in Hangeul', YELLOW],
      ['📅', 'Next class: sounds that change (ㄱ ㅋ ㄲ, 11 more vowels, last consonants)', GREEN],
    ], { y: 1.2, cols: 3, h: 2.8, big: 40, small: 16, split: 0.38 })
    s.addNotes('About 1 minute. Remind everyone to rate the class, and to look at the free Korean study guides on GongbuLeng.')
  }

  return pres
}

// ───────────────────────── Lesson 2 ─────────────────────────
function lesson2() {
  const pres = newDeck('Korean · Lesson 2 · Hangeul part 2: sounds that change')

  // 1
  titleSlide(pres, 'KOREAN · A1 · LESSON 2', 'Hangeul part 2:\nsounds that change', '소리',
    'Show this while people join. 소리 (sori) means "sound". This lesson assumes lesson 1 (the 24 basic letters). Total plan: 60 minutes, timings are in the notes of each slide.')

  // 2
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Quick review: read these')
    tiles(s, ['가', '너', '도', '루', '미', '바', '서', '아', '조', '하'].map(k => [k, '', YELLOW]), { y: 1.1, cols: 5, h: 0.95, big: 34 })
    tiles(s, [['바나나', ''], ['서울', ''], ['라면', '']], { y: 3.45, w: 9, cols: 3, h: 0.8, big: 26 })
    speak(s, 'Each student reads one, round the class', { y: 4.45 })
    s.addNotes('About 4 minutes. Answers: ga, neo, do, ru, mi, ba, seo, a, jo, ha · banana, Seoul, ramyeon. Anyone new can still follow: they just need ㅏ ㅓ ㅗ ㅜ ㅣ and the 14 consonants.')
  }

  // 3
  goals(pres, ['Hear and say plain, aspirated and tense consonants (달 · 탈 · 딸)', 'Read the 11 combined vowels', 'Read words with a last consonant, and link sounds like a Korean'],
    'About 1 minute. Read the goals out loud; come back to them in the recap.')

  // 4
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Three kinds of consonants')
    table(s, [
      ['plain (soft)', 'aspirated (puff of air)', 'tense (tight, no air)'],
      ['ㄱ  g', 'ㅋ  k', 'ㄲ  kk'],
      ['ㄷ  d', 'ㅌ  t', 'ㄸ  tt'],
      ['ㅂ  b', 'ㅍ  p', 'ㅃ  pp'],
      ['ㅈ  j', 'ㅊ  ch', 'ㅉ  jj'],
      ['ㅅ  s', '–', 'ㅆ  ss'],
    ], { y: 1.1, rowH: 0.45, fontSize: 20 })
    card(s, { x: 0.5, y: 3.95, w: 9, h: 0.7, fill: YELLOW, flat: true })
    text(s, '📄  Paper test: hold a sheet in front of your mouth. It moves a lot for ㅋ, a little for ㄱ, not at all for ㄲ.', { x: 0.7, y: 3.95, w: 8.6, h: 0.7, fontSize: 14, bold: true, valign: 'middle' })
    s.addNotes('About 6 minutes. Plain: relaxed, a little air. Aspirated: a strong puff of air, like English k t p at the start of a word. Tense: tighten the throat, no air, a bit higher pitch (like the k in Spanish "casa" or French "café"). Do the paper test on camera, then let students try.')
  }

  // 5
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Listen: can you hear it?')
    tiles(s, [['달', 'moon'], ['탈', 'mask'], ['딸', 'daughter'], ['불', 'fire'], ['풀', 'grass'], ['뿔', 'horn']], { y: 1.1, cols: 3, h: 1.0, big: 32, small: 13 })
    tiles(s, [['살', 'flesh'], ['쌀', 'rice (uncooked)']], { x: 1.85, y: 3.45, w: 6.3, cols: 2, h: 0.85, big: 26, small: 12 })
    speak(s, 'Teacher says one; students hold up 1, 2 or 3 fingers', { y: 4.45 })
    s.addNotes('About 5 minutes. Say the words in a random order; students show which one they heard. Then a student says one and the others guess. It is normal not to hear tense vs plain at first: say it is a skill that comes with listening.')
  }

  // 6
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'The 11 combined vowels')
    tiles(s, [['ㅐ', 'ae'], ['ㅔ', 'e'], ['ㅒ', 'yae'], ['ㅖ', 'ye'], ['ㅘ', 'wa'], ['ㅙ', 'wae'],
      ['ㅚ', 'oe'], ['ㅝ', 'wo'], ['ㅞ', 'we'], ['ㅟ', 'wi'], ['ㅢ', 'ui']].map(([k, c]) => [k, c, BLUE]),
    { y: 1.15, cols: 6, h: 1.15, big: 32, small: 13 })
    card(s, { x: 0.5, y: 3.85, w: 9, h: 0.85, fill: GREEN, flat: true })
    text(s, 'Good news: today most people say ㅐ and ㅔ the same ("e" in bed), and ㅙ ㅚ ㅞ all sound like "we".', { x: 0.7, y: 3.85, w: 8.6, h: 0.85, fontSize: 15, bold: true, valign: 'middle' })
    s.addNotes('About 4 minutes. Say each one; students repeat. So there are fewer sounds to learn than letters; the spelling just has to be learned with each word. ㅢ is "ui" at the start of a word (의자), and often sounds like ㅣ in the middle of a word.')
  }

  // 7
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'How they are built')
    table(s, [
      ['you add', 'you get', 'word'],
      ['ㅗ + ㅏ', 'ㅘ  wa', '사과  apple'],
      ['ㅗ + ㅐ', 'ㅙ  wae', '돼지  pig'],
      ['ㅗ + ㅣ', 'ㅚ  oe', '회사  company'],
      ['ㅜ + ㅓ', 'ㅝ  wo', '뭐  what'],
      ['ㅜ + ㅣ', 'ㅟ  wi', '귀  ear'],
      ['ㅡ + ㅣ', 'ㅢ  ui', '의자  chair'],
      ['ㅏ + ㅣ  /  ㅓ + ㅣ', 'ㅐ  /  ㅔ', '개  dog  /  게  crab'],
    ], { y: 1.05, colW: [3, 2.6, 3.4], rowH: 0.47, fontSize: 17 })
    s.addNotes('About 4 minutes. Read the words together: sagwa, dwaeji, hoesa, mwo, gwi, uija, gae, ge. Point out 개 (dog) and 게 (crab) sound the same today: context tells you which one.')
  }

  // 8
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'The 6 block shapes')
    tiles(s, [
      ['가', 'consonant + tall vowel'], ['고', 'consonant + flat vowel'], ['과', 'consonant + combined vowel'],
      ['각', '+ last consonant'], ['곡', '+ last consonant'], ['곽', '+ last consonant'],
    ].map(([k, c], i) => [k, c, i < 3 ? YELLOW : GREEN]), { y: 1.15, cols: 3, h: 1.45, big: 44, small: 13 })
    s.addNotes('About 3 minutes. Every Korean syllable fits one of these 6 shapes. The bottom consonant is called 받침 (batchim), "the support". Read: ga, go, gwa, gak, gok, gwak.')
  }

  // 9
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Last consonants: only 7 sounds')
    table(s, [
      ['you write at the bottom', 'you say', 'example'],
      ['ㄱ ㅋ ㄲ', 'k', '부엌 → [부억]  kitchen'],
      ['ㄴ', 'n', '산  mountain'],
      ['ㄷ ㅌ ㅅ ㅆ ㅈ ㅊ ㅎ', 't', '옷 → [옫]  clothes'],
      ['ㄹ', 'l', '물  water'],
      ['ㅁ', 'm', '밤  night'],
      ['ㅂ ㅍ', 'p', '잎 → [입]  leaf'],
      ['ㅇ', 'ng', '강  river'],
    ], { y: 1.05, colW: [3.6, 1.6, 3.8], rowH: 0.45, fontSize: 17 })
    s.addNotes('About 5 minutes. At the end of a block the sound is "closed": the tongue or lips stop and nothing is released. So many letters end up as the same 7 sounds. The [brackets] show how a word is said, not written.')
  }

  // 10
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Read: written vs said')
    tiles(s, [['옷', '[옫] clothes'], ['꽃', '[꼳] flower'], ['밖', '[박] outside'], ['낮', '[낟] daytime'],
      ['부엌', '[부억] kitchen'], ['잎', '[입] leaf'], ['앞', '[압] front'], ['밥', '[밥] rice, a meal']],
    { y: 1.15, cols: 4, h: 1.3, big: 32, small: 13 })
    speak(s, 'Students read them first; then uncover the [brackets]')
    s.addNotes('About 3 minutes. Romanization of what is said: ot, kkot, bak, nat, bueok, ip, ap, bap. Use the 7-sound table from the previous slide.')
  }

  // 11
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Linking: sounds slide over')
    tiles(s, [['음악', '[으막] music'], ['한국어', '[한구거] Korean'], ['옷이', '[오시] the clothes'], ['꽃이', '[꼬치] the flower']].map(([k, c]) => [k, c, PURPLE]),
      { y: 1.15, cols: 4, h: 1.4, big: 32, small: 13 })
    text(s, 'A block ends in a consonant + the next starts with silent ㅇ → the consonant moves over. And the real letter comes back: 옷 [옫], but 옷이 [오시].', { x: 0.5, y: 2.85, w: 9, h: 1.0, fontSize: 16 })
    speak(s, 'Read slowly, then fast: hear the difference')
    s.addNotes('About 4 minutes. This is why Korean sounds so smooth, and why 한국어 is "hangugeo". The -이 on 옷이 and 꽃이 is the subject marker; students do not need the grammar yet, only the sound.')
  }

  // 12
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Read longer words')
    tiles(s, [['대학교', 'university'], ['지하철', 'subway'], ['편의점', 'convenience store'], ['도서관', 'library'],
      ['비빔밥', 'bibimbap'], ['김치찌개', 'kimchi stew'], ['떡볶이', 'tteokbokki'], ['아메리카노', 'americano']],
    { y: 1.15, cols: 4, h: 1.3, big: 24, small: 12 })
    speak(s, 'Round the class: each student reads one')
    s.addNotes('About 4 minutes. Romanization: daehakgyo, jihacheol, pyeonuijeom, doseogwan, bibimbap, gimchijjigae, tteokbokki, amerikano. Two are said a little differently from how they are spelled: 편의점 is usually [펴니점] and 떡볶이 is [떡뽀끼] (a plain consonant after k/t/p becomes tense). Mention it, do not teach the rule yet.')
  }

  // 13
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Dictation game')
    tiles(s, [['1', 'The teacher says a word twice', BLUE], ['2', 'Everyone writes it in the chat', YELLOW], ['3', 'Check together: who got it?', GREEN]],
      { y: 1.2, cols: 3, h: 2.2, big: 48, small: 15 })
    speak(s, '8 words: start easy, end with a last consonant')
    s.addNotes('About 6 minutes. Words to use, in this order: 우유, 커피, 사과, 학교, 친구, 딸기, 꽃, 물. Wait until everyone has written before showing the answer. Typing Korean: phones have a Korean keyboard; on a computer students can write on paper and hold it up to the camera.')
  }

  // 14
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Read a real menu')
    card(s, { x: 0.5, y: 1.1, w: 5.6, h: 3.2, fill: CREAM })
    table(s, [
      ['김밥', '3,500원'], ['라면', '4,000원'], ['떡볶이', '4,500원'], ['아메리카노', '2,000원'], ['녹차', '2,500원'],
    ], { x: 0.75, y: 1.3, w: 5.1, colW: [3.1, 2.0], rowH: 0.52, fontSize: 20, head: false })
    card(s, { x: 6.4, y: 1.1, w: 3.1, h: 3.2, fill: YELLOW, flat: true })
    text(s, 'Order one:', { x: 6.6, y: 1.25, w: 2.7, h: 0.4, fontSize: 16, bold: true })
    text(s, '김밥 주세요!', { x: 6.6, y: 1.7, w: 2.7, h: 0.6, fontSize: 26, bold: true })
    text(s, 'Gimbap juseyo!\nGimbap, please!\n\n원 (won) is the Korean money. Prices are examples.', { x: 6.6, y: 2.35, w: 2.7, h: 1.8, fontSize: 13, color: MUTED })
    speak(s, 'Each student reads the menu line by line, then orders something', { y: 4.45 })
    s.addNotes('About 4 minutes. Romanization: gimbap, ramyeon, tteokbokki, amerikano, nokcha (green tea). 주세요 (juseyo) = please give me. Numbers come in a later lesson; for now students can say the price in their own language.')
  }

  // 15
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Common mistakes')
    table(s, [
      ['watch out', 'why'],
      ['달 vs 딸', 'Plain is relaxed; tense is tight with no air.'],
      ['Last ㅅ', '옷 is [옫] "ot", not "os".'],
      ['Forgetting to link', '음악 is [으막], not "eum-ak".'],
      ['ㅐ or ㅔ?', 'Same sound today: learn the spelling with each word.'],
      ['ㅓ vs ㅗ (again)', 'Still the most common mix-up.'],
    ], { y: 1.15, colW: [2.9, 6.1], rowH: 0.52, fontSize: 15 })
    s.addNotes('About 2 minutes. Ask students which of these they noticed in themselves today.')
  }

  // 16
  recap(pres, [
    ['3 kinds', 'Plain ㄱ, aspirated ㅋ, tense ㄲ: 달 · 탈 · 딸.'],
    ['11 vowels', 'Built from the basic ones. ㅐ and ㅔ sound the same.'],
    ['Last sounds', 'Only 7 at the end of a block, and they slide over: 음악 [으막].'],
  ], 'About 1 minute. Go back to the goals on slide 3 and ask: can you do these now?')

  // 17
  {
    const s = pres.addSlide({ masterName: 'GL_LIGHT' })
    title(s, 'Try at home')
    tiles(s, [
      ['🍜', 'Read the menu of a Korean restaurant or a delivery app', BLUE],
      ['🎧', 'Write down 5 words you hear in a K-drama or a song', YELLOW],
      ['📄', 'Paper test in front of a mirror: 달 · 탈 · 딸', GREEN],
    ], { y: 1.2, cols: 3, h: 2.8, big: 40, small: 16, split: 0.38 })
    s.addNotes('About 1 minute. Remind everyone to rate the class.')
  }

  // 18
  {
    const s = pres.addSlide({ masterName: 'GL_DARK' })
    text(s, "What's next", { x: 0.5, y: 0.45, w: 9, h: 0.7, fontSize: 36, bold: true, color: WHITE })
    text(s, 'You can read Korean now. 🎉', { x: 0.5, y: 1.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: YELLOW })
    text(s, 'Next: say hello and introduce yourself (안녕하세요, 저는 ___예요) and the polite 요 ending.\n\nFree Korean A1 study guide: gongbuleng.com/resources/ko/a1', { x: 0.5, y: 2.1, w: 9, h: 1.8, fontSize: 18, color: CREAM })
    text(s, '감사합니다! See you next class 👋', { x: 0.5, y: 4.2, w: 9, h: 0.5, fontSize: 20, bold: true, color: CREAM })
    s.addNotes('About 1 minute. Students who want to keep going can read the free Korean A1 study guide on GongbuLeng. If you teach a follow-up class, post it now so they can join.')
  }

  return pres
}

Promise.all([
  lesson1().writeFile({ fileName: path.join(OUT_DIR, 'korean-hangeul-1.pptx') }),
  lesson2().writeFile({ fileName: path.join(OUT_DIR, 'korean-hangeul-2.pptx') }),
]).then(files => files.forEach(f => console.log('wrote', f)))
