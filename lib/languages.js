// The languages LinguaXchange teaches, and the CEFR ladder.
//
// Shared rather than copied: registration, class creation and the resources
// grid all render the same list, and a list that drifts between them means a
// language you can register to learn but can't create a class for.
//
// Takes `t` rather than importing it, because the names are translated and
// the caller already holds the language context.
export function languageOptions(t) {
  return [
    { code: 'KO', flag: '🇰🇷', name: t('home.langKorean') },
    { code: 'ES', flag: '🇪🇸', name: t('home.langSpanish') },
    { code: 'DE', flag: '🇩🇪', name: t('home.langGerman') },
    { code: 'EN', flag: '🇬🇧', name: t('home.langEnglish') },
    { code: 'PT', flag: '🇧🇷', name: t('home.langPortuguese') },
    { code: 'FR', flag: '🇫🇷', name: t('home.langFrench') },
    { code: 'IT', flag: '🇮🇹', name: t('home.langItalian') },
  ]
}

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// Korean learners measure themselves in TOPIK, not CEFR — a student who has
// passed TOPIK 3 does not think of themselves as "B1" and will not recognise
// a class labelled that way.
//
// CEFR stays the stored value. It is the only scale the other six languages
// use, and switching Korean rows to TOPIK would break every cross-language
// filter: browsing B1 would silently exclude Korean. TOPIK is shown alongside
// it, never instead of it.
//
// The correspondence is NIIED's own published linkage (한국어능력시험 TOPIK -
// 유럽공통참조기준 CEFR 연계표 및 등급기술문), supported by a 2025 alignment
// study in 한국어교육 that compared the two sets of level descriptors. It is a
// linkage rather than an identity — no TOPIK certificate states a CEFR level —
// which is the reason both are displayed rather than one being substituted
// for the other.
const TOPIK_BY_CEFR = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }

// Renders a level for display. Falls back to the bare CEFR level for every
// language except Korean, and for anything unrecognised — a caller passing a
// junk level gets it back unchanged rather than "undefined · TOPIK undefined".
// `t` is optional: server components and the Open Graph image renderer call
// this without a translation context, and get the stored value back.
export function levelLabel(languageCode, level, t) {
  // 'Native' is the stored value, and every screen showing it was printing
  // it raw — so a Korean member read "Native" in an otherwise Korean page.
  // Translating it here rather than at each call site is also what stops the
  // label being mistaken for the value: callers now pass 'Native' and render
  // whatever comes back.
  if (level === 'Native') return t ? t('profile.native') : level
  if (languageCode !== 'KO') return level
  const topik = TOPIK_BY_CEFR[level]
  return topik ? `${level} · TOPIK ${topik}` : level
}

// English names, for the places that cannot call t(): server components and
// Open Graph images both run where the translation context — a client-side
// React provider — does not exist.
export const LANGUAGE_NAMES_EN = {
  KO: 'Korean', ES: 'Spanish', DE: 'German', EN: 'English',
  PT: 'Portuguese', FR: 'French', IT: 'Italian',
}
