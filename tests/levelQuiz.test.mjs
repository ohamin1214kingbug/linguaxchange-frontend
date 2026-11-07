// The level check on guide pages: every question set must be well formed
// (a typo in an answer index silently marks the right option wrong), and
// the score must send readers to the first level they have not passed.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QUIZZES, scoreQuiz } from '../lib/levelQuiz.js'

test('every set has three valid questions per level, A1 to B2', () => {
  for (const [language, questions] of Object.entries(QUIZZES)) {
    for (const level of ['A1', 'A2', 'B1', 'B2']) {
      assert.equal(questions.filter(q => q.level === level).length, 3, `${language} ${level}`)
    }
    for (const q of questions) {
      assert.ok(q.answer >= 0 && q.answer < q.options.length, `${language}: ${q.prompt}`)
      assert.equal(new Set(q.options).size, q.options.length, `${language} duplicate option: ${q.prompt}`)
    }
  }
})

const quiz = QUIZZES.ES
const allRight = quiz.map(q => q.answer)

test('all right suggests B2 and says so', () => {
  assert.deepEqual(scoreQuiz(quiz, allRight), { level: 'B2', passedAll: true })
})

test('nothing answered starts at A1', () => {
  assert.deepEqual(scoreQuiz(quiz, []), { level: 'A1', passedAll: false })
})

test('the first level with fewer than 2 right is the one to study', () => {
  const answers = [...allRight]
  quiz.forEach((q, i) => { if (q.level === 'B1') answers[i] = -1 })
  assert.deepEqual(scoreQuiz(quiz, answers), { level: 'B1', passedAll: false })
})

test('two of three is a pass', () => {
  const answers = [...allRight]
  answers[quiz.findIndex(q => q.level === 'A1')] = -1
  assert.equal(scoreQuiz(quiz, answers).level, 'B2')
})
