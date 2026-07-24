'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { translations } from './translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('EN')

  useEffect(() => {
    const stored = localStorage.getItem('site_language')
    if (stored && translations[stored]) {
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = (code) => {
    if (!translations[code]) return
    setLanguageState(code)
    localStorage.setItem('site_language', code)
  }

  const t = (key, vars) => {
    const parts = key.split('.')
    let value = translations[language]
    for (const p of parts) value = value?.[p]
    if (value === undefined) {
      let fallback = translations.EN
      for (const p of parts) fallback = fallback?.[p]
      value = fallback ?? key
    }
    if (vars && typeof value === 'string') {
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replaceAll(`{${k}}`, v),
        value
      )
    }
    return value
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
