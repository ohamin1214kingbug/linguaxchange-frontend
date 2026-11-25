// The Intl locale behind every date, time and number the site renders.
//
// Kept as module state and pushed here by LanguageProvider, so the ~30 call
// sites don't each thread a locale argument down to wherever they format.
// They used to pass `undefined`, which is Intl's own default — the BROWSER's
// locale, not the site's. An English UI on a Spanish-locale laptop rendered
// "24 ago 2026, 12:00 a. m.".
//
// Regions are pinned rather than left bare ('en-GB', not 'en') because bare
// tags resolve to a region anyway and the defaults are the wrong ones here:
// 'en' gives US month-first ordering under a 🇬🇧 flag, and 'pt' gives
// Portugal under a 🇧🇷 one.
const LOCALES = {
  EN: 'en-GB', KO: 'ko-KR', ES: 'es-ES', DE: 'de-DE',
  PT: 'pt-BR', FR: 'fr-FR', IT: 'it-IT',
}

let locale = LOCALES.EN

export function setLocale(code) {
  locale = LOCALES[code] || LOCALES.EN
}

// Safe before any provider has rendered (server components, the Open Graph
// renderer): falls back to the same value the provider starts on.
export function getLocale() {
  return locale
}
