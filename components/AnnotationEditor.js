'use client'
import { useState, useRef } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { CATEGORIES } from '../lib/assignments'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// Offsets index into the request body exactly as stored. The text is rendered
// from that same string with no trimming or normalisation, or the offsets sent
// back would not match what the server validates against.
export default function AnnotationEditor({ request, onSent }) {
  const { t } = useLanguage()
  const [annotations, setAnnotations] = useState([])
  const [draft, setDraft] = useState(null)
  const [overall, setOverall] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const ref = useRef(null)

  const onMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !ref.current) return
    const range = sel.getRangeAt(0)
    if (!ref.current.contains(range.commonAncestorContainer)) return

    const pre = range.cloneRange()
    pre.selectNodeContents(ref.current)
    pre.setEnd(range.startContainer, range.startOffset)
    const start = pre.toString().length
    const end = start + range.toString().length
    if (end > start) setDraft({ start, end, category: CATEGORIES[0], note: '' })
    sel.removeAllRanges()
  }

  const send = async () => {
    setError('')
    setSending(true)
    try {
      const res = await fetch(`${API}/api/assignments/${request.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ annotations, overall }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onSent()
    } catch (e) {
      setError('Could not send your feedback')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <p className="text-navy/60 text-sm mb-2">{t('assignments.selectSpan')}</p>
      <div ref={ref} onMouseUp={onMouseUp}
        className="bg-white border-2 border-navy rounded-2xl p-5 whitespace-pre-wrap leading-relaxed mb-4 select-text">
        {request.body}
      </div>

      {draft && (
        <div className="bg-brand-yellow/20 border-2 border-navy rounded-2xl p-4 mb-4">
          <p className="font-bold text-navy text-sm mb-2">
            “{request.body.slice(draft.start, draft.end)}”
          </p>

          <label className="block text-xs font-bold text-navy mb-1">{t('assignments.categoryLabel')}</label>
          <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
            className="w-full border-2 border-navy/15 rounded-xl px-3 py-2 mb-3 text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{t(`assignments.category.${c}`)}</option>)}
          </select>

          <label className="block text-xs font-bold text-navy mb-1">{t('assignments.noteLabel')}</label>
          <p className="text-navy/50 text-xs mb-2">{t('assignments.noteHint')}</p>
          <textarea value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
            rows={3} maxLength={300} className="w-full border-2 border-navy/15 rounded-xl px-3 py-2 text-sm mb-3" />

          <button onClick={() => { setAnnotations(a => [...a, draft]); setDraft(null) }}
            disabled={!draft.note.trim()}
            className="bg-navy text-white px-4 py-2 rounded-full text-xs font-bold disabled:opacity-40">
            +
          </button>
        </div>
      )}

      {annotations.map((a, i) => (
        <div key={i} className="border-l-4 border-brand-red pl-3 mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-navy font-bold text-sm">“{request.body.slice(a.start, a.end)}”</p>
            <p className="text-navy/60 text-xs">{t(`assignments.category.${a.category}`)} — {a.note}</p>
          </div>
          <button onClick={() => setAnnotations(list => list.filter((_, j) => j !== i))}
            className="text-navy/40 hover:text-brand-red text-sm font-bold px-1">
            ×
          </button>
        </div>
      ))}

      {/* 500 characters with no guidance was the one field in this flow shaped
          like somewhere to paste a rewritten paragraph. Same hint as noteHint. */}
      <label className="block text-sm font-bold text-navy mb-1 mt-4">{t('assignments.overallLabel')}</label>
      <p className="text-navy/50 text-xs mb-2">{t('assignments.overallHint')}</p>
      <textarea value={overall} onChange={e => setOverall(e.target.value)} rows={3} maxLength={500}
        className="w-full border-2 border-navy/15 rounded-xl px-4 py-2.5 mb-4" />

      {error && <p className="text-brand-red text-sm mb-3 font-bold">{error}</p>}

      <button onClick={send} disabled={annotations.length === 0 || sending}
        className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40">
        {t('assignments.submitFeedback')}
      </button>
    </div>
  )
}
