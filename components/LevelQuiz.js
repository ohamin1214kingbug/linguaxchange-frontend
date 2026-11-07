'use client'
import { useState } from 'react'
import { QUIZZES, scoreQuiz } from '../lib/levelQuiz'
import { levelLabel } from '../lib/languages'

// Twelve questions, one at a time, then a level and the classes, requests and
// guide for it. English UI, like the guide page it sits on. Nothing is saved:
// it is a pointer, not a record.
export default function LevelQuiz({ language, languageName, currentLevel }) {
  const questions = QUIZZES[language]
  const [started, setStarted] = useState(false)
  const [answers, setAnswers] = useState([])
  if (!questions) return null

  const index = answers.length
  const done = index === questions.length
  const result = done ? scoreQuiz(questions, answers) : null
  const label = result && levelLabel(language, result.level)

  if (!started) {
    return (
      <div className="mt-12 pt-8 border-t border-navy/10">
        <p className="font-display font-extrabold text-xl text-navy mb-2">Not sure this is your level?</p>
        <p className="text-navy/65 text-sm leading-relaxed mb-4">
          Answer 12 quick {languageName} questions and we&apos;ll point you to the right guide and classes.
        </p>
        <button type="button" onClick={() => setStarted(true)}
          className="inline-block border-2 border-navy text-navy px-6 py-3 rounded-full font-bold hover:bg-navy hover:text-white transition-colors">
          Check my level (2 minutes)
        </button>
      </div>
    )
  }

  return (
    <div className="mt-12 pt-8 border-t border-navy/10">
      {!done ? (
        <div className="bg-white border-2 border-navy rounded-2xl p-5">
          <p className="text-navy/65 text-xs font-bold mb-2">Question {index + 1} of {questions.length}</p>
          <p className="font-bold text-navy text-lg mb-4" lang={questions[index].prompt.match(/[가-힣]/) ? 'ko' : undefined}>
            {questions[index].prompt}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {questions[index].options.map((option, i) => (
              <button key={option} type="button" onClick={() => setAnswers(a => [...a, i])}
                className="text-left border-2 border-navy/20 rounded-xl px-4 py-2.5 text-navy font-medium hover:border-navy transition-colors">
                {option}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setAnswers(a => [...a, -1])}
            className="mt-3 text-navy/65 text-xs font-bold hover:text-navy">
            I don&apos;t know
          </button>
        </div>
      ) : (
        <div className="bg-white border-2 border-navy rounded-2xl p-5">
          <p className="font-display font-extrabold text-xl text-navy mb-2">
            {result.passedAll ? `You're at ${label} or above` : `Start at ${label}`}
          </p>
          <p className="text-navy/65 text-sm leading-relaxed mb-4">
            {result.passedAll
              ? 'You got the B2 questions right too, so our guides are behind you. A B2 class keeps you speaking, or you could teach the lower levels.'
              : `You did well up to here. ${label} is the level that will stretch you without losing you.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
            <a href={`/classes?language=${language}&level=${result.level}`}
              className="inline-block text-center bg-navy text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy hover:bg-navy/90 transition-colors">
              See {label} classes →
            </a>
            {result.level !== currentLevel && (
              <a href={`/resources/${language.toLowerCase()}/${result.level.toLowerCase()}`}
                className="text-navy/70 text-sm font-bold hover:text-navy underline">
                Read the {label} guide
              </a>
            )}
            <button type="button" onClick={() => setAnswers([])}
              className="text-navy/65 text-sm font-bold hover:text-navy">
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
