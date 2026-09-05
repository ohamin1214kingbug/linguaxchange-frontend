// Builds the study-guide PDFs from docs/resources/*.md.
//
//   node scripts/buildGuides.mjs          # all six
//   node scripts/buildGuides.mjs ko-a1    # just one
//
// This exists because the six PDFs in docs/resources/pdf were produced by a
// throwaway script that no longer exists. Correcting one word in one guide
// meant either rebuilding its design from scratch and having it drift away
// from the other five, or leaving the wrong word in the file people download.
//
// The design is not invented: it was measured out of the existing ko-a1.pdf
// with pdfplumber — A4, 18mm margins, Helvetica Neue 11pt in #16162A,
// headings at 22pt and 14pt, gold 1.5pt rules under every H2, and the
// subtitle line in #C93033 with navy labels inside it.
//
// It applies to all six, which is a change: the four Spanish guides were
// previously set in Georgia 10.5pt with red rules, and the two Korean ones
// in this Helvetica. Nobody chose that split — the two batches were built
// months apart by scripts that no longer exist. One template was chosen
// deliberately so the guides finally read as a set.
//
// The Spanish guides gain a page each as a result: 11pt sans is looser than
// 10.5pt serif. That is the cost of the consistency, not a layout bug.
//
// No markdown library. These six files use seven constructs — H1, H2,
// bullets, one level of nested bullets, bold, italics and one horizontal
// rule — and a parser dependency for that is more supply chain than the job
// is worth. Anything richer added to a guide later will not render, which is
// the trade being made here.
//
// The nesting was nearly missed: a first pass counted only lines starting
// with "- ", so es-b2's three indented bullets fell through to paragraphs
// and printed their dashes as literal text. Comparing the rebuilt text
// against the original is what caught it.
//
// Not run in CI: it needs a local Chrome, which the runner does not have.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'docs/resources')
const OUT = join(SRC, 'pdf')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const escapeHtml = t => t
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Bold before italic: **x** would otherwise be eaten as two italics.
const inline = t => escapeHtml(t)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')

function toHtmlBody(markdown) {
  const out = []
  let list = []
  let seenTitle = false
  let metaDone = false

  // Each entry is { depth, text }; depth 1 is an indented sub-bullet.
  const flushList = () => {
    if (!list.length) return
    let html = '<ul>'
    let open = 0
    for (const item of list) {
      if (item.depth > open) { html += '<ul>'; open++ }
      while (item.depth < open) { html += '</ul>'; open-- }
      html += `<li>${inline(item.text)}</li>`
    }
    while (open-- > 0) html += '</ul>'
    out.push(html + '</ul>')
    list = []
  }

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd()

    const bullet = /^(\s*)- (.*)$/.exec(line)
    if (bullet) {
      list.push({ depth: bullet[1].length >= 2 ? 1 : 0, text: bullet[2] })
      continue
    }
    flushList()

    if (!line.trim()) continue
    if (/^---+$/.test(line)) { out.push('<hr>'); continue }

    if (line.startsWith('## ')) { out.push(`<h2>${inline(line.slice(3))}</h2>`); continue }
    if (line.startsWith('# ')) { out.push(`<h1>${inline(line.slice(2))}</h1>`); seenTitle = true; continue }

    // The line directly under the title is the level/language/audience strip,
    // which the original renders in red with navy labels.
    if (seenTitle && !metaDone) {
      out.push(`<p class="meta">${inline(line)}</p>`)
      metaDone = true
      continue
    }
    out.push(`<p>${inline(line)}</p>`)
  }
  flushList()
  return out.join('\n')
}

const page = body => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>LinguaXchange guide</title>
<style>
  @page { size: A4; margin: 18mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "Helvetica Neue", Helvetica, "Apple SD Gothic Neo", AppleGothic, sans-serif;
    font-size: 11pt; line-height: 1.55; color: #16162A; margin: 0;
  }
  h1 { font-size: 22pt; line-height: 1.2; margin: 0 0 6pt; font-weight: 700; }
  h2 {
    font-size: 14pt; line-height: 1.3; margin: 20pt 0 8pt; font-weight: 700;
    padding-bottom: 6pt; border-bottom: 1.5pt solid #E8B93C;
  }
  p { margin: 0 0 9pt; }
  /* The strip under the title: red, with the labels inside it navy. */
  p.meta { font-weight: 700; color: #C93033; margin-bottom: 14pt; }
  p.meta strong { color: #16162A; }
  strong { font-weight: 700; color: #16162A; }
  em { font-style: italic; }
  ul { margin: 0 0 9pt; padding-left: 16pt; }
  ul ul { margin: 4pt 0 0; }
  li { margin: 0 0 4pt; }
  hr { border: 0; border-top: 1.5pt solid #E8B93C; margin: 18pt 0 12pt; }
  h2, li { break-inside: avoid; }
  h2 { break-after: avoid; }
</style></head><body>
${body}
</body></html>`

const only = process.argv[2]
const guides = readdirSync(SRC)
  .filter(f => f.endsWith('.md'))
  .filter(f => !only || f === `${only}.md`)
  .sort()

if (!guides.length) {
  console.error(only ? `No guide named ${only}.md` : 'No guides found')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
let failed = false

for (const file of guides) {
  const name = file.replace(/\.md$/, '')
  const html = page(toHtmlBody(readFileSync(join(SRC, file), 'utf8')))
  const tmp = join(OUT, `${name}.html`)
  const pdf = join(OUT, `${name}.pdf`)

  writeFileSync(tmp, html)
  try {
    execFileSync(CHROME, [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdf}`,
      tmp,
    ], { stdio: 'pipe' })
    console.log(`  built ${name}.pdf`)
  } catch (e) {
    failed = true
    console.error(`  FAILED ${name}: ${e.message.split('\n')[0]}`)
  } finally {
    // The HTML is a build artifact, not a deliverable.
    try { unlinkSync(tmp) } catch {}
  }
}

process.exit(failed ? 1 : 0)
