'use client'
import { useState, useEffect } from 'react'
import { inlineHtml, guideLabels } from '../lib/guideFormat.mjs'

// The study guide on the web, in colour blocks: each section is a card that
// opens with a coloured band and a big number, and the blocks inside are
// chunky cards (examples, ✗/✓ mistakes, chat bubbles, practice pills). A strip
// of section chips stays at the top while reading, and the interactive bits
// (the "I can" checklist and the practice answers) work here. Server-rendered
// like any client component, so the text is in the page for search engines.
// The PDF has its own, editorial design (scripts/guidePdf.mjs).

const Html = ({ as: Tag = 'span', text, className }) => (
  <Tag className={className} dangerouslySetInnerHTML={{ __html: inlineHtml(text) }} />
)

// Section bands cycle through the brand colours.
const BANDS = [
  { band: 'bg-brand-teal text-navy', chip: 'bg-brand-teal' },
  { band: 'bg-brand-yellow text-navy', chip: 'bg-brand-yellow' },
  { band: 'bg-brand-red text-white', chip: 'bg-brand-red text-white' },
]
const LABEL = 'text-[11px] font-extrabold uppercase tracking-[0.14em]'
const CARD = 'rounded-2xl border-[3px] border-navy bg-white'

function Table({ block }) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-[3px] border-navy rounded-2xl border-separate border-spacing-0 overflow-hidden text-sm bg-white">
        <thead>
          <tr>{block.head.map((h, i) => <th key={i} className="bg-navy text-white text-left text-xs font-bold uppercase tracking-wide px-2 sm:px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c} className={`px-2 sm:px-3 py-2.5 align-top ${r ? 'border-t-2 border-dashed border-navy/15' : ''} ${c === 0 ? 'font-display font-extrabold text-brand-red text-base sm:text-lg leading-tight' : ''}`}>
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
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <label className={`flex gap-3 items-center cursor-pointer rounded-xl border-2 border-navy px-3 py-2.5 transition-colors ${done.includes(i) ? 'bg-brand-teal/20' : 'bg-white'}`}>
              <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} className="w-5 h-5 flex-shrink-0 accent-brand-teal" />
              <Html text={item} className={`font-semibold ${done.includes(i) ? 'text-navy/60' : 'text-navy'}`} />
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
    <div className="mt-6">
      <p className="font-display font-extrabold text-xl text-navy mb-2">{L.practice}</p>
      <ol className="space-y-2">
        {items.map((item, i) => {
          const [before, after = ''] = item.question.split('___')
          return (
            <li key={i} className="flex gap-3 items-center rounded-full border-[3px] border-navy bg-white pl-1.5 pr-4 py-1.5">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-red text-white text-sm font-extrabold inline-flex items-center justify-center">{i + 1}</span>
              <span className="py-0.5">
                <Html text={before} />
                <span className={`inline-block min-w-14 mx-1 text-center border-b-2 border-navy font-extrabold ${shown ? 'text-brand-red' : 'text-transparent'}`}>{shown ? item.answer : '·'}</span>
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
      return <Html as="p" text={block.text} className="text-navy mb-3 leading-relaxed [&_b]:text-brand-red" />
    case 'list':
      return <ul className="list-disc pl-5 space-y-1 mb-3">{block.items.map((t, i) => <Html as="li" key={i} text={t} />)}</ul>
    case 'checklist':
      return <Checklist items={block.items} storageKey={`guide:${guideKey}:can`} L={L} />
    case 'table':
      return <Table block={block} />
    case 'examples':
      return (
        <ul className="my-4 space-y-2">
          {block.items.map((ex, i) => (
            <li key={i} className={`${CARD} px-4 py-2.5`}>
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
            <li key={i} className={`flex flex-col ${i % 2 ? 'items-end text-right' : 'items-start'}`}>
              <span className="text-xs font-extrabold text-navy/70 mb-1 px-2">{l.speaker}</span>
              <span className={`max-w-[85%] border-[3px] border-navy px-4 py-2.5 ${i % 2 ? 'bg-brand-yellow rounded-[20px_20px_6px_20px]' : 'bg-white rounded-[20px_20px_20px_6px]'}`}>
                <Html text={l.text} className="block font-bold text-navy" />
                {l.translation && <Html text={l.translation} className="block text-navy/70 text-sm" />}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'tip':
    case 'note':
      return (
        <div className="my-4 rounded-2xl border-[3px] border-navy bg-brand-yellow/30 px-4 py-3 text-sm">
          <span className={`${LABEL} inline-block bg-navy text-white rounded-full px-2.5 py-1 mb-2`}>{L.tip}</span>
          <Html as="p" text={block.text} />
        </div>
      )
    case 'mistake':
      return (
        <div className="my-4">
          {block.pairs.map((p, i) => (
            <div key={i} className="grid sm:grid-cols-2 gap-2 mb-2">
              <div className="rounded-2xl border-[3px] border-navy bg-[#ffd9de] px-4 py-2.5">
                <span className={`${LABEL} block mb-1`}>✗ {L.notQuite}</span>
                <Html text={p.wrong} className="font-bold" />
              </div>
              <div className="rounded-2xl border-[3px] border-navy bg-[#c9f2ec] px-4 py-2.5">
                <span className={`${LABEL} block mb-1`}>✓ {L.sayThis}</span>
                <Html text={p.right} className="font-bold" />
              </div>
            </div>
          ))}
          {block.text && <Html as="p" text={block.text} className="text-navy/75 text-sm" />}
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
        {guide.sections.map((s, i) => (
          <a key={s.id} href={`#${s.id}`}
            className={`whitespace-nowrap text-sm font-bold px-3 py-1.5 rounded-full border-2 transition-colors ${active === s.id ? `${BANDS[i % BANDS.length].chip} border-navy` : 'bg-white text-navy border-navy/20 hover:border-navy/50'}`}>
            {s.short}
          </a>
        ))}
      </nav>

      {guide.intro.map((b, i) => <Block key={i} block={b} guideKey={guide.key} L={L} />)}

      <div className="space-y-8 mt-4">
        {guide.sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-16 [word-break:keep-all] bg-cream border-[3px] border-navy rounded-3xl overflow-hidden shadow-[0_6px_0_#1a1a2e]">
            <div className={`${BANDS[i % BANDS.length].band} flex items-end gap-4 px-5 md:px-6 pt-5 pb-4 border-b-[3px] border-navy`}>
              <span className="font-display font-extrabold text-6xl md:text-7xl leading-[0.75]">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                {s.kicker && <p className={`${LABEL} opacity-80 mb-0.5`}>{s.kicker}</p>}
                <h2 className="font-display font-extrabold text-2xl md:text-3xl leading-tight">{s.title}</h2>
              </div>
            </div>
            <div className="p-5 md:p-6">
              {s.blocks.map((b, j) => <Block key={j} block={b} guideKey={guide.key} L={L} />)}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
