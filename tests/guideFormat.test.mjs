// The guide format feeds both the website and the PDF. A block that parses
// wrong shows wrong in both places, so each construct is pinned here.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGuide, isGuideV2, inlineHtml } from '../lib/guideFormat.mjs'

const sample = `---
layout: v2
title: Your first conversations
---
Intro line one
continues here.

## Ser, estar and hay | short: Ser, estar, hay | kicker: Grammar
Spanish splits "to be" into three.

| | Use it for | Example |
|---|---|---|
| ser | identity | Soy Ana. // I'm Ana. |

- [ ] Introduce yourself
- [ ] Order food

:::examples
- Mi hermano **es** médico. // My brother is a doctor.
:::

:::tip
Ask one question.
:::

:::mistake
- Estoy profesor. => Soy profesor.
A job takes ser.
:::

:::practice
1. Mi hermano ___ médico. = es
2. Hoy ___ cansada. = estoy
:::

:::dialogue
- Ana: Hola, ¿qué tal? // Hi, how are you?
:::
`

test('front matter and the v2 marker', () => {
  assert.equal(isGuideV2(sample), true)
  assert.equal(isGuideV2('# Old guide\n\ntext'), false)
  assert.equal(parseGuide(sample).meta.title, 'Your first conversations')
})

test('intro paragraph joins its lines', () => {
  assert.deepEqual(parseGuide(sample).intro, [{ type: 'p', text: 'Intro line one continues here.' }])
})

test('section heading attributes and blocks in order', () => {
  const [s] = parseGuide(sample).sections
  assert.equal(s.title, 'Ser, estar and hay')
  assert.equal(s.short, 'Ser, estar, hay')
  assert.equal(s.kicker, 'Grammar')
  assert.equal(s.id, 'ser-estar-hay')
  assert.deepEqual(s.blocks.map(b => b.type), ['p', 'table', 'checklist', 'examples', 'tip', 'mistake', 'practice', 'dialogue'])
})

test('tables skip the separator row and split translations', () => {
  const table = parseGuide(sample).sections[0].blocks[1]
  assert.deepEqual(table.head, ['', 'Use it for', 'Example'])
  assert.deepEqual(table.rows[0][2], { text: 'Soy Ana.', translation: "I'm Ana." })
})

test('fenced blocks', () => {
  const b = parseGuide(sample).sections[0].blocks
  assert.deepEqual(b[3].items[0], { text: 'Mi hermano **es** médico.', translation: 'My brother is a doctor.' })
  assert.deepEqual(b[5].pairs, [{ wrong: 'Estoy profesor.', right: 'Soy profesor.' }])
  assert.equal(b[5].text, 'A job takes ser.')
  assert.deepEqual(b[6].items[1], { question: 'Hoy ___ cansada.', answer: 'estoy' })
  assert.deepEqual(b[7].lines[0], { speaker: 'Ana', text: 'Hola, ¿qué tal?', translation: 'Hi, how are you?' })
})

test('inline formatting is escaped before it is styled', () => {
  assert.equal(inlineHtml('**es** and *ser* <b>x</b> ~~no~~'), '<b>es</b> and <i>ser</i> &lt;b&gt;x&lt;/b&gt; <s>no</s>')
})

test('an unknown block fails loudly instead of vanishing', () => {
  assert.throws(() => parseGuide('## A\n:::quizz\nx\n:::'), /Unknown guide block/)
})
