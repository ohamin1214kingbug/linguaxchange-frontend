import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isGuideV2, parseGuide } from './guideFormat.mjs'

// The guide's own text, for the website page. Read from the same file the
// PDF is built from, so the page and the download never disagree.
//
// Only guides in the v2 format are returned; the rest keep their old
// download-only page until they are rewritten. The name is checked against
// a strict pattern, so a crafted URL can't read any other file.
// next.config.mjs includes docs/resources in the server bundle.
export function readGuide(language, level) {
  const name = `${String(language).toLowerCase()}-${String(level).toLowerCase()}`
  if (!/^[a-z]{2}-[abc][12]$/.test(name)) return null
  try {
    const source = readFileSync(join(process.cwd(), 'docs/resources', `${name}.md`), 'utf8')
    return isGuideV2(source) ? { key: name, ...parseGuide(source) } : null
  } catch (e) {
    return null
  }
}
