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
