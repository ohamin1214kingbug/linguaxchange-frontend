'use client'
import { useState } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { languageOptions, LEVELS, levelLabel } from '../lib/languages'
import { countWords, MAX_WORDS } from '../lib/assignments'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function AssignmentForm({ onPosted }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({ language_code: '', level: '', prompt: '', body: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const words = countWords(form.body)
  const tooLong = words > MAX_WORDS

  const submit = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch(`${API}/api/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ...form, level: form.level || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onPosted()
    } catch (e) {
      setError('Could not post your request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border-2 border-navy rounded-2xl p-6 mb-6">
      <div className="flex gap-2 flex-wrap mb-4">
        {languageOptions(t).map(l => (
          <button key={l.code} onClick={() => setForm(f => ({ ...f, language_code: l.code }))}
            className={`px-4 py-2 rounded-full border-2 text-sm font-bold ${form.language_code === l.code ? 'bg-brand-red text-white border-navy' : 'border-navy/15 text-navy'}`}>
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      {form.language_code && (
        <div className="flex gap-2 flex-wrap mb-4">
          {LEVELS.map(lv => (
            <button key={lv} onClick={() => setForm(f => ({ ...f, level: lv }))}
              className={`px-3 py-1.5 rounded-full border-2 text-xs font-bold ${form.level === lv ? 'bg-navy text-white border-navy' : 'border-navy/15 text-navy'}`}>
              {levelLabel(form.language_code, lv)}
            </button>
          ))}
        </div>
      )}

      <label className="block text-sm font-bold text-navy mb-2">{t('assignments.promptLabel')}</label>
      <input value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
        placeholder={t('assignments.promptPlaceholder')}
        className="w-full border-2 border-navy/15 rounded-xl px-4 py-2.5 mb-4" />

      <label className="block text-sm font-bold text-navy mb-2">{t('assignments.bodyLabel')}</label>
      <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
        rows={8} className="w-full border-2 border-navy/15 rounded-xl px-4 py-2.5" />

      <p className={`text-xs mt-1 mb-4 font-bold ${tooLong ? 'text-brand-red' : 'text-navy/50'}`}>
        {tooLong
          ? t('assignments.tooLong', { max: MAX_WORDS })
          : t('assignments.wordCount', { n: words, max: MAX_WORDS })}
      </p>

      <p className="text-navy/60 text-xs mb-4">{t('assignments.costNote')}</p>

      {error && <p className="text-brand-red text-sm mb-3 font-bold">{error}</p>}

      <button onClick={submit} disabled={saving || tooLong || !words || !form.language_code || !form.prompt.trim()}
        className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40">
        {t('assignments.submit')}
      </button>
    </div>
  )
}
