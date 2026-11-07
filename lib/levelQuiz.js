// A quick level check at the end of each study guide: three questions per
// level, A1 to B2 (the levels the guides cover). Not an exam — it points a
// reader at the classes, requests and guide that fit them.
//
// Every language the site teaches has a set; a guide whose language has none
// simply shows no quiz. Each wrong-answer option is meant to be wrong in
// standard usage, not just less natural — when two options could both be
// defended, the question was rewritten. English questions are grammar only,
// since its guides are read by Spanish speakers and a "what does X mean"
// question would need a translation.

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
  DE: [
    { level: 'A1', prompt: 'What does "danke" mean?', options: ['Please', 'Thank you', 'Hello', 'Sorry'], answer: 1 },
    { level: 'A1', prompt: 'Ich ___ Anna.', options: ['heiße', 'heißt', 'heißen', 'heiß'], answer: 0 },
    { level: 'A1', prompt: 'Wie alt ___ du?', options: ['ist', 'bin', 'bist', 'sind'], answer: 2 },
    { level: 'A2', prompt: 'Gestern ___ ich ins Kino gegangen.', options: ['habe', 'bin', 'war', 'hatte'], answer: 1 },
    { level: 'A2', prompt: 'Ich gebe ___ Mann das Buch.', options: ['den', 'der', 'dem', 'des'], answer: 2 },
    { level: 'A2', prompt: 'Ich kann heute nicht kommen, ___ ich krank bin.', options: ['weil', 'denn', 'aber', 'oder'], answer: 0 },
    { level: 'B1', prompt: 'Wenn ich mehr Zeit ___, würde ich mehr lesen.', options: ['habe', 'hatte', 'hätte', 'haben'], answer: 2 },
    { level: 'B1', prompt: 'Das ist der Mann, ___ ich gestern geholfen habe.', options: ['den', 'dem', 'der', 'dessen'], answer: 1 },
    { level: 'B1', prompt: 'Ich warte ___ den Bus.', options: ['für', 'an', 'auf', 'über'], answer: 2 },
    { level: 'B2', prompt: 'Das Haus wurde 1990 ___.', options: ['gebaut', 'bauen', 'baute', 'gebaute'], answer: 0 },
    { level: 'B2', prompt: 'Er tut so, ___ er alles wüsste.', options: ['wenn', 'als ob', 'weil', 'damit'], answer: 1 },
    { level: 'B2', prompt: 'Je mehr du übst, ___ besser sprichst du.', options: ['als', 'wie', 'desto', 'so'], answer: 2 },
  ],
  EN: [
    { level: 'A1', prompt: 'She ___ a teacher.', options: ['are', 'is', 'am', 'be'], answer: 1 },
    { level: 'A1', prompt: 'I ___ coffee every morning.', options: ['drink', 'drinks', 'drinking', 'am drink'], answer: 0 },
    { level: 'A1', prompt: 'There ___ two books on the table.', options: ['is', 'be', 'are', 'am'], answer: 2 },
    { level: 'A2', prompt: 'Yesterday I ___ to the beach.', options: ['go', 'went', 'gone', 'have gone'], answer: 1 },
    { level: 'A2', prompt: 'This is the ___ film I have ever seen.', options: ['better', 'good', 'most good', 'best'], answer: 3 },
    { level: 'A2', prompt: "I ___ TV when you called, so I didn't hear the phone.", options: ['was watching', 'watch', 'am watching', 'have watched'], answer: 0 },
    { level: 'B1', prompt: 'I have lived here ___ 2019.', options: ['for', 'since', 'from', 'during'], answer: 1 },
    { level: 'B1', prompt: 'If it rains tomorrow, we ___ at home.', options: ['would stay', 'stayed', 'will stay', 'would have stayed'], answer: 2 },
    { level: 'B1', prompt: "You ___ smoke here. It's not allowed.", options: ["don't have to", "mustn't", "needn't", 'may'], answer: 1 },
    { level: 'B2', prompt: 'If I ___ harder, I would have passed the exam.', options: ['studied', 'have studied', 'would study', 'had studied'], answer: 3 },
    { level: 'B2', prompt: "I'm not used to ___ up so early.", options: ['getting', 'get', 'got', 'have got'], answer: 0 },
    { level: 'B2', prompt: 'The report ___ by Friday.', options: ['must finish', 'must be finished', 'must be finish', 'must finishing'], answer: 1 },
  ],
  PT: [
    { level: 'A1', prompt: 'What does "obrigado" mean?', options: ['Hello', 'Please', 'Thank you', 'Sorry'], answer: 2 },
    { level: 'A1', prompt: 'Eu ___ brasileiro.', options: ['sou', 'estou', 'é', 'são'], answer: 0 },
    { level: 'A1', prompt: 'Como você se ___?', options: ['chamo', 'chama', 'chamam', 'chamar'], answer: 1 },
    { level: 'A2', prompt: 'Ontem eu ___ ao cinema.', options: ['vou', 'irei', 'fui', 'vá'], answer: 2 },
    { level: 'A2', prompt: 'Nós ___ português todos os dias.', options: ['estudam', 'estudamos', 'estuda', 'estudo'], answer: 1 },
    { level: 'A2', prompt: 'Enquanto eu ___, o telefone tocou.', options: ['cozinhava', 'cozinhei', 'cozinho', 'cozinharei'], answer: 0 },
    { level: 'B1', prompt: 'Espero que você ___ bem.', options: ['está', 'esteja', 'estar', 'estará'], answer: 1 },
    { level: 'B1', prompt: 'Se eu tiver tempo, ___ com você.', options: ['iria', 'fosse', 'fui', 'vou'], answer: 3 },
    { level: 'B1', prompt: 'Quando você ___ em casa, me liga.', options: ['chegar', 'chega', 'chegou', 'chegava'], answer: 0 },
    { level: 'B2', prompt: 'Se eu ___ mais dinheiro, viajaria pelo mundo.', options: ['tenho', 'tivesse', 'teria', 'tiver'], answer: 1 },
    { level: 'B2', prompt: 'Embora ___ cansado, ele foi à festa.', options: ['estava', 'está', 'estivesse', 'estará'], answer: 2 },
    { level: 'B2', prompt: 'Se você me ___ avisado, eu teria vindo.', options: ['tinha', 'tenha', 'teria', 'tivesse'], answer: 3 },
  ],
  FR: [
    { level: 'A1', prompt: 'What does "merci" mean?', options: ['Thank you', 'Please', 'Hello', 'Sorry'], answer: 0 },
    { level: 'A1', prompt: 'Je ___ étudiant.', options: ['es', 'suis', 'est', 'ai'], answer: 1 },
    { level: 'A1', prompt: "J'___ vingt ans.", options: ['suis', 'as', 'ai', 'est'], answer: 2 },
    { level: 'A2', prompt: 'Hier, je ___ allé au cinéma.', options: ['ai', 'étais', 'vais', 'suis'], answer: 3 },
    { level: 'A2', prompt: 'Ma mère ? Je ___ parle souvent.', options: ['la', 'lui', 'le', 'les'], answer: 1 },
    { level: 'A2', prompt: 'Pendant que je ___, le téléphone a sonné.', options: ['mangeais', 'ai mangé', 'mange', 'mangerai'], answer: 0 },
    { level: 'B1', prompt: 'Il faut que tu ___ tes devoirs.', options: ['fais', 'fasses', 'feras', 'faisais'], answer: 1 },
    { level: 'B1', prompt: "Si j'avais le temps, je ___ plus.", options: ['lirai', 'lis', 'lirais', 'lisais'], answer: 2 },
    { level: 'B1', prompt: "C'est le livre ___ je t'ai parlé.", options: ['que', 'qui', 'où', 'dont'], answer: 3 },
    { level: 'B2', prompt: "Si j'___ su, je serais venu.", options: ['avais', 'aurais', 'ai', 'aie'], answer: 0 },
    { level: 'B2', prompt: "Bien qu'il ___ fatigué, il est venu.", options: ['est', 'soit', 'sera', 'était'], answer: 1 },
    { level: 'B2', prompt: 'Il est parti sans ___ au revoir.', options: ['dit', 'disant', 'dire', 'dise'], answer: 2 },
  ],
  IT: [
    { level: 'A1', prompt: 'What does "grazie" mean?', options: ['Sorry', 'Hello', 'Please', 'Thank you'], answer: 3 },
    { level: 'A1', prompt: 'Io ___ studente.', options: ['sono', 'sei', 'è', 'ho'], answer: 0 },
    { level: 'A1', prompt: 'Quanti anni ___?', options: ['sei', 'hai', 'è', 'hanno'], answer: 1 },
    { level: 'A2', prompt: 'Ieri ___ al cinema.', options: ['ho andato', 'andrò', 'sono andato', 'vado'], answer: 2 },
    { level: 'A2', prompt: 'Mi ___ i libri di storia.', options: ['piace', 'piacciono', 'piaci', 'piaccio'], answer: 1 },
    { level: 'A2', prompt: 'Mentre ___ la cena, è squillato il telefono.', options: ['preparavo', 'ho preparato', 'preparo', 'preparerò'], answer: 0 },
    { level: 'B1', prompt: 'È importante che tu ___ attenzione.', options: ['fai', 'faccia', 'farai', 'facevi'], answer: 1 },
    { level: 'B1', prompt: 'Se avessi tempo, ___ di più.', options: ['leggerò', 'leggo', 'leggevo', 'leggerei'], answer: 3 },
    { level: 'B1', prompt: 'Questo è il libro ___ ti ho parlato.', options: ['che', 'di cui', 'cui', 'dove'], answer: 1 },
    { level: 'B2', prompt: "Se l'___ saputo, sarei venuto.", options: ['avrei', 'ho', 'avessi', 'abbia'], answer: 2 },
    { level: 'B2', prompt: 'Benché ___ stanco, è venuto alla festa.', options: ['fosse', 'era', 'è', 'sarà'], answer: 0 },
    { level: 'B2', prompt: 'Vorrei che tu ___ con me.', options: ['venga', 'vieni', 'venissi', 'verrai'], answer: 2 },
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
