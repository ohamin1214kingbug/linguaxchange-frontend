// Turns docs/resources/*.md into the PDFs the resources pages serve.
//
// The original four Spanish PDFs were printed by hand from headless Chrome
// and no script was kept, so producing a fifth meant reverse-engineering the
// output. This exists so the next guide is one command.
//
// Deliberately dependency-free: a tiny Markdown subset covering exactly what
// the guides use (headings, bold, italics, lists, horizontal rules,
// paragraphs) beats adding a Markdown library and a headless-browser library
// to a Next.js app that needs neither at runtime.
//
// Usage:  node scripts/build-guide-pdfs.mjs [slug ...]
//         node scripts/build-guide-pdfs.mjs            # all guides
//         node scripts/build-guide-pdfs.mjs ko-a1      # just one

import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from 'fs'
import { execFileSync } from 'child_process'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'docs/resources')
const OUT = join(SRC, 'pdf')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Inline formatting runs after escaping, so the markers cannot inject markup.
const inline = s => esc(s)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')

function toHtml(md) {
  const out = []
  let inList = false
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false } }

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) { closeList(); continue }
    if (line === '---') { closeList(); out.push('<hr>'); continue }

    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) { closeList(); const n = h[1].length; out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue }

    const li = line.match(/^-\s+(.*)$/)
    if (li) { if (!inList) { out.push('<ul>'); inList = true } out.push(`<li>${inline(li[1])}</li>`); continue }

    closeList()
    out.push(`<p>${inline(line)}</p>`)
  }
  closeList()
  return out.join('\n')
}

// Matches the site: navy text on white, red and yellow accents.
//
// AppleGothic, not Apple SD Gothic Neo. Both render Hangul correctly on a Mac,
// but Chrome will not embed Apple SD Gothic Neo — its licence forbids it — so
// the first Korean build produced a PDF whose Hangul existed only as a font
// reference. It looked perfect here and would have shown empty boxes to any
// reader whose machine had no Korean font installed, which for a Korean study
// guide is the worst possible failure. AppleGothic embeds, so the file is
// self-contained.
//
// The Latin face is listed first and has no Hangul glyphs, so Chrome falls
// through to AppleGothic per glyph: Latin text keeps the nicer face and only
// the Korean uses AppleGothic.
const page = body => `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Helvetica Neue", Arial, "AppleGothic", sans-serif;
         color: #16162a; line-height: 1.55; font-size: 11pt; }
  h1 { font-size: 22pt; color: #16162a; margin: 0 0 4pt; line-height: 1.2; }
  h2 { font-size: 14pt; margin: 20pt 0 6pt; padding-bottom: 3pt;
       border-bottom: 2px solid #e8b93c; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 14pt 0 4pt; page-break-after: avoid; }
  p { margin: 0 0 8pt; }
  ul { margin: 0 0 10pt; padding-left: 16pt; }
  li { margin-bottom: 3pt; }
  strong { color: #16162a; }
  hr { border: 0; border-top: 1px solid #d8d8e0; margin: 18pt 0 10pt; }
  hr + p { font-size: 9pt; color: #6b6b80; }
  h1 + p { color: #c9303e; font-weight: 600; margin-bottom: 14pt; }
</style></head><body>${body}</body></html>`

const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(SRC).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))

const tmp = mkdtempSync(join(tmpdir(), 'guides-'))
try {
  for (const slug of slugs) {
    const md = readFileSync(join(SRC, `${slug}.md`), 'utf8')
    const html = join(tmp, `${slug}.html`)
    writeFileSync(html, page(toHtml(md)))
    const pdf = join(OUT, `${slug}.pdf`)
    execFileSync(CHROME, [
      '--headless', '--disable-gpu', '--no-pdf-header-footer',
      `--print-to-pdf=${pdf}`, `file://${html}`
    ], { stdio: 'ignore' })
    console.log(`  ${slug}.pdf`)
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
