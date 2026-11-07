// A quick level check at the end of each study guide: three questions per
// level, A1 to B2 (the levels the guides cover). Not an exam — it points a
// reader at the classes, requests and guide that fit them.
//
// Only languages with a question set get the quiz. Korean and Spanish came
// first because they were the only languages with public classes when this
// was written; add a set here to switch it on for another language.

const QUIZ_LEVELS = ['A1', 'A2', 'B1', 'B2']

// { level, prompt, options, answer } — answer is the index of the right option.
export const QUIZZES = {
  KO: [
    { level: 'A1', prompt: 'What does "안녕하세요" mean?', options: ['Hello', 'Thank you', 'Goodbye', 'Sorry'], answer: 0 },
    { level: 'A1', prompt: '저___ 학생이에요.', options: ['는', '을', '에', '로'], answer: 0 },
    { level: 'A1', prompt: 'What does "물" mean?', options: ['Fire', 'Water', 'Book', 'Rice'], answer: 1 },
    { level: 'A2', prompt: '어제 친구를 ___.', options: ['만나요', '만났어요', '만날 거예요', '만나고'], answer: 1 },
    { level: 'A2', prompt: 'Which one means "I want to eat"?', options: ['먹어야 해요', '먹을 수 있어요', '먹고 싶어요', '먹지 마세요'], answer: 2 },
    { level: 'A2', prompt: '한국어를 ___ 수 있어요.', options: ['하다', '할', '해서', '하고'], answer: 1 },
    { level: 'B1', prompt: 'In "시간이 있으면 같이 가요", what does -(으)면 mean?', options: ['Because', 'Although', 'If', 'While'], answer: 2 },
    { level: 'B1', prompt: '그 영화를 본 ___ 있어요?', options: ['것을', '적이', '때문에', '동안'], answer: 1 },
    { level: 'B1', prompt: 'In "바쁜데도 도와줘서 고마워요", what does -는데도 / -ㄴ데도 mean?', options: ['Even though', 'So that', 'As soon as', 'In order to'], answer: 0 },
    { level: 'B2', prompt: '열심히 공부한 ___ 시험에 합격했어요.', options: ['탓에', '덕분에', '대신에', '만큼'], answer: 1 },
    { level: 'B2', prompt: 'What does -(으)ㄹ 뿐만 아니라 mean?', options: ['Unless', 'Instead of', 'Not only … but also', 'No matter how'], answer: 2 },
    { level: 'B2', prompt: '회의가 끝나는 ___ 연락드릴게요.', options: ['대로', '만큼', '채로', '듯이'], answer: 0 },
  ],
  ES: [
    { level: 'A1', prompt: 'What does "gracias" mean?', options: ['Please', 'Thank you', 'Hello', 'Sorry'], answer: 1 },
    { level: 'A1', prompt: 'Yo ___ estudiante.', options: ['estoy', 'es', 'soy', 'eres'], answer: 2 },
    { level: 'A1', prompt: '¿Cuántos años ___?', options: ['tienes', 'eres', 'estás', 'haces'], answer: 0 },
    { level: 'A2', prompt: 'Ayer ___ al cine con mis amigos.', options: ['voy', 'fui', 'iré', 'vaya'], answer: 1 },
    { level: 'A2', prompt: 'Me ___ mucho los libros de historia.', options: ['gusta', 'gusto', 'gustas', 'gustan'], answer: 3 },
    { level: 'A2', prompt: 'Mientras yo ___ la cena, sonó el teléfono.', options: ['preparaba', 'preparé', 'preparo', 'prepararé'], answer: 0 },
    { level: 'B1', prompt: 'Espero que tú ___ bien.', options: ['estás', 'estés', 'estar', 'estarás'], answer: 1 },
    { level: 'B1', prompt: 'Si tengo tiempo mañana, ___ contigo.', options: ['iría', 'fuera', 'iré', 'iba'], answer: 2 },
    { level: 'B1', prompt: 'Cuando ___ a casa, te llamo.', options: ['llego', 'llegue', 'llegaré', 'llegaba'], answer: 1 },
    { level: 'B2', prompt: 'Si ___ más dinero, viajaría por el mundo.', options: ['tengo', 'tendría', 'tenga', 'tuviera'], answer: 3 },
    { level: 'B2', prompt: 'No creo que ___ razón.', options: ['tiene', 'tenga', 'tendrá', 'tenía'], answer: 1 },
    { level: 'B2', prompt: 'Si me ___ avisado, habría venido.', options: ['habías', 'hayas', 'hubieras', 'habrías'], answer: 2 },
  ],
}

// Walks up the levels and stops at the first one with fewer than 2 of 3
// right: that is the level to study. Passing all four means the guides are
// behind them, so B2 is the highest it suggests. Unanswered counts as wrong.
export function scoreQuiz(questions, answers) {
  for (const level of QUIZ_LEVELS) {
    const correct = questions.filter((q, i) => q.level === level && answers[i] === q.answer).length
    if (correct < 2) return { level, passedAll: false }
  }
  return { level: 'B2', passedAll: true }
}
