'use client'
import { useState } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { UI_LANGUAGES } from '../lib/i18n/translations'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const current = UI_LANGUAGES.find(l => l.code === language) || UI_LANGUAGES[0]

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 border-2 border-navy/15 rounded-full px-3 py-1.5 text-sm font-bold text-navy hover:border-navy/40 transition-colors">
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="text-navy/40 text-xs">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 bg-white border-2 border-navy rounded-xl overflow-hidden z-20 min-w-[150px] shadow-lg">
            {UI_LANGUAGES.map(lang => (
              <button key={lang.code}
                onClick={() => { setLanguage(lang.code); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-cream transition-colors ${
                  lang.code === language ? 'bg-brand-red/10 font-bold text-navy' : 'font-medium text-navy/70'
                }`}>
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
