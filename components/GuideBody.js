'use client'
import { useState, useEffect } from 'react'
import { inlineHtml, guideLabels } from '../lib/guideFormat.mjs'

// The redesigned study guide on the web: one white card per section, a strip
// of section chips that stays at the top while reading, and the interactive
// bits (the "I can" checklist and the practice answers). Server-rendered like
// any client component, so the text is in the page for search engines.

const Html = ({ as: Tag = 'span', text, className }) => (
  <Tag className={className} dangerouslySetInnerHTML={{ __html: inlineHtml(text) }} />
)

function Table({ block }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-2 border-navy rounded-2xl border-separate border-spacing-0 overflow-hidden text-sm">
        <thead>
          <tr>{block.head.map((h, i) => <th key={i} className="bg-navy text-white text-left text-xs font-bold uppercase tracking-wide px-2 sm:px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className={`px-2 sm:px-3 py-2.5 align-top ${r ? 'border-t border-navy/10' : ''} ${c === 0 ? 'font-display font-extrabold text-brand-red text-base sm:text-lg leading-tight' : ''}`}>
                  <Html text={cell.text} className={c > 0 && cell.translation ? 'font-bold' : ''} />
                  {cell.translation && <Html as="span" text={cell.translation} className="block text-navy/65 text-xs mt-0.5 font-normal" />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Checklist({ items, storageKey, L }) {
  const [done, setDone] = useState([])
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(storageKey) || '[]')) } catch (e) {}
  }, [storageKey])
  const toggle = i => {
    const next = done.includes(i) ? done.filter(d => d !== i) : [...done, i]
    setDone(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch (e) {}
  }
  return (
    <>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i}>
            <label className="flex gap-3 items-start cursor-pointer">
              <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} className="mt-1 w-5 h-5 flex-shrink-0 accent-brand-teal" />
              <Html text={item} className={done.includes(i) ? 'text-navy/65' : 'text-navy'} />
            </label>
          </li>
        ))}
      </ul>
      <p className="text-navy/65 text-xs mt-3">{L.tick}</p>
    </>
  )
}

function Practice({ items, L }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="mt-5">
      <p className="font-bold text-navy text-sm mb-2">{L.practice}</p>
      <ol className="space-y-2">
        {items.map((item, i) => {
          const [before, after = ''] = item.question.split('___')
          return (
            <li key={i} className="flex gap-3 items-baseline">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold inline-flex items-center justify-center">{i + 1}</span>
              <span>
                <Html text={before} />
                <span className={`inline-block min-w-14 mx-1 text-center border-b-2 border-dashed border-navy font-bold ${shown ? 'text-brand-teal' : 'text-transparent'}`}>{shown ? item.answer : '·'}</span>
                <Html text={after} />
              </span>
            </li>
          )
        })}
      </ol>
      <button type="button" onClick={() => setShown(s => !s)}
        className="mt-3 bg-navy text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-navy/90 transition-colors">
        {shown ? L.hide : L.show}
      </button>
    </div>
  )
}

function Block({ block, guideKey, L }) {
  switch (block.type) {
    case 'p':
      return <Html as="p" text={block.text} className="text-navy mb-3 leading-relaxed" />
    case 'list':
      return <ul className="list-disc pl-5 space-y-1 mb-3">{block.items.map((t, i) => <Html as="li" key={i} text={t} />)}</ul>
    case 'checklist':
      return <Checklist items={block.items} storageKey={`guide:${guideKey}:can`} L={L} />
    case 'table':
      return <Table block={block} />
    case 'examples':
      return (
        <ul className="border-l-4 border-brand-teal pl-3 my-4 space-y-2.5">
          {block.items.map((ex, i) => (
            <li key={i}>
              <Html text={ex.text} className="block font-bold text-navy [&_b]:text-brand-red" />
              {ex.translation && <Html text={ex.translation} className="block text-navy/65 text-sm" />}
            </li>
          ))}
        </ul>
      )
    case 'dialogue':
      return (
        <ul className="my-4 space-y-3">
          {block.lines.map((l, i) => (
            <li key={i} className={`flex gap-3 ${i % 2 ? 'flex-row-reverse text-right' : ''}`}>
              <span className={`flex-shrink-0 self-start text-xs font-bold px-2.5 py-1 rounded-full border-2 border-navy ${i % 2 ? 'bg-brand-yellow/30' : 'bg-brand-teal/20'}`}>{l.speaker}</span>
              <span className="bg-cream rounded-2xl px-3 py-2">
                <Html text={l.text} className="block font-bold text-navy" />
                {l.translation && <Html text={l.translation} className="block text-navy/65 text-sm" />}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'tip':
    case 'note':
      return (
        <div className="my-4 rounded-2xl border-2 border-navy bg-brand-yellow/15 px-4 py-3 text-sm">
          <span className="block text-xs font-extrabold uppercase tracking-wide mb-1">{L.tip}</span>
          <Html text={block.text} />
        </div>
      )
    case 'mistake':
      return (
        <div className="my-4 rounded-2xl border-2 border-navy bg-brand-red/10 px-4 py-3 text-sm">
          <span className="block text-xs font-extrabold uppercase tracking-wide mb-1">{L.mistake}</span>
          {block.pairs.map((p, i) => (
            <p key={i} className="my-0.5">
              <Html text={p.wrong} className="line-through text-brand-red font-bold" /> → <Html text={p.right} className="font-bold" />
            </p>
          ))}
          {block.text && <Html as="p" text={block.text} className="text-navy/70 mt-1" />}
        </div>
      )
    case 'practice':
      return <Practice items={block.items} L={L} />
    default:
      return null
  }
}

export default function GuideBody({ guide }) {
  const L = guideLabels(guide.meta.ui)
  const [active, setActive] = useState(guide.sections[0]?.id)

  // Highlights the chip of the section being read.
  useEffect(() => {
    const els = guide.sections.map(s => document.getElementById(s.id)).filter(Boolean)
    const io = new IntersectionObserver(entries => {
      const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (top) setActive(top.target.id)
    }, { rootMargin: '-80px 0px -60% 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [guide.sections])

  return (
    <>
      <nav aria-label="Sections" className="sticky top-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-2.5 mb-6 bg-cream/95 backdrop-blur border-b border-navy/10 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {guide.sections.map(s => (
          <a key={s.id} href={`#${s.id}`}
            className={`whitespace-nowrap text-sm font-bold px-3 py-1.5 rounded-full border-2 transition-colors ${active === s.id ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-navy/20 hover:border-navy/50'}`}>
            {s.short}
          </a>
        ))}
      </nav>

      {guide.intro.map((b, i) => <Block key={i} block={b} guideKey={guide.key} L={L} />)}

      <div className="space-y-6 mt-4">
        {guide.sections.map(s => (
          <section key={s.id} id={s.id} className="scroll-mt-16 [word-break:keep-all] bg-white border-2 border-navy rounded-2xl p-5 md:p-6 shadow-[0_5px_0_#1a1a2e]">
            {s.kicker && <p className="text-brand-red text-xs font-extrabold uppercase tracking-wider mb-1">{s.kicker}</p>}
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-navy leading-tight mb-3">{s.title}</h2>
            {s.blocks.map((b, i) => <Block key={i} block={b} guideKey={guide.key} L={L} />)}
          </section>
        ))}
      </div>
    </>
  )
}
