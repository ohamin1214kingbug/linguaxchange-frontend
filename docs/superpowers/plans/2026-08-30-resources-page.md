# Resources Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, crawlable resources section where each Spanish CEFR level has a downloadable study guide LinguaXchange wrote, managed from the admin panel.

**Architecture:** A new `resources` table holds one admin-managed row per (language, level, audience), with the guide PDF in a public Supabase bucket. The backend exposes unauthenticated reads and admin-only writes from a new `routes/resources.js`. The frontend adds a grid page, a per-combination detail page, and a dynamic sitemap so the pages are actually discoverable. Guide text lives as Markdown in the repo; the PDF is a build output uploaded by hand.

**Tech Stack:** Express 5 + Supabase (backend, CommonJS, Jest for unit tests); Next.js 16 App Router + React 19 + Tailwind v4 (frontend, no test runner).

**Spec:** `docs/superpowers/specs/2026-08-30-resources-page-design.md` (this repo)

## Global Constraints

- **Two repositories.** Backend is `/Users/kinghamin/linguaxchange-backend`, frontend is `/Users/kinghamin/linguaxchange-frontend`. Every path below is prefixed with `backend:` or `frontend:`. Commit in the repo the files belong to.
- **Never commit unless explicitly asked.** The plan's commit steps are written out, but the human partner asks for each one. Never use `git commit --amend`; always a new commit.
- **Backend tests are pure-function unit tests only.** This repo has no supertest, no test DB, no HTTP-level tests. Extract logic worth testing into `utils/` and test it there, matching `tests/reports.test.js`. Do not introduce a new test framework or a DB fixture layer.
- **Frontend has no test runner.** Verification is `npm run build` plus browser checks. Do not add Jest, Vitest, or Playwright to the frontend.
- **Never guess a licence.** Only material LinguaXchange wrote is hosted. `attribution` stays null for our own guides.
- **Bucket and size ceiling:** bucket name `resources`, public, PDF only, 10MB — matching the existing `class-materials` bucket.
- **Language codes are stored uppercase** (`ES`), CEFR levels uppercase (`A1`). URLs are lowercase (`/resources/es/a1`). Convert at the boundary.
- **Audience is `learner` for everything in v1.** The column exists so the teacher-facing guides need no migration later.
- **API base URL on the frontend** is the literal `https://linguaxchange-backend-production.up.railway.app`, declared per-file as `const API = ...`. That is this codebase's existing convention — follow it rather than introducing an env var.

---

### Task 1: Database table and storage bucket

Foundation for everything else. No unit test: this is schema, verified by querying it.

**The production database is already partway through this task.** An earlier version of the table — without `source_url` and `attribution` — was created by hand before the spec was amended. The migration below is therefore written to be idempotent: it creates what is missing and leaves what exists alone, so it is correct both against the current production database and against a fresh environment, and safe to run more than once.

**Files:**
- Create: `backend:migrations/add_resources_table.sql`

- [ ] **Step 1: Write the migration**

```sql
-- One admin-managed study resource per (language, level, audience).
--
-- audience ships in v1 even though only 'learner' is used, so the
-- teacher-facing guides ("what to teach", "how to teach") need a data entry
-- rather than a migration later.
create table if not exists resources (
  id serial primary key,
  language_code text not null,
  level text not null,
  audience text not null default 'learner',
  title text not null,
  description text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (language_code, level, audience)
);

-- Added after the first hand-run of this table, when the design changed from
-- hosting third-party PDFs to writing our own guides: source_url is the
-- official syllabus a guide aligns with, attribution is reserved for
-- third-party material under a confirmed open licence.
--
-- Separate statements rather than columns in the create above, because the
-- table already exists in production and create-if-not-exists would skip them
-- silently.
alter table resources add column if not exists source_url text;
alter table resources add column if not exists attribution text;

-- Matches every other table in this project: the backend holds the
-- service-role key and the frontend never queries Supabase directly, so
-- enabling RLS with no policies closes the anon-key hole outright.
alter table resources enable row level security;

-- The bucket lives here rather than being clicked together in the dashboard,
-- so the storage config is recorded next to the table it serves and a second
-- environment can be brought up from one file.
--
-- public = true is the point of the feature: a logged-out visitor and a
-- crawler both have to fetch the PDF without a token. Writes are safe anyway,
-- because uploads come from the backend on the service-role key.
--
-- No storage policy is added, and none should be. This matches the existing
-- class-materials bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resources', 'resources', true, 10485760, array['application/pdf'])
on conflict (id) do nothing;
```

`10485760` is 10 × 1024 × 1024. The `on conflict` clause makes the file safe to re-run.

- [ ] **Step 2: Run the migration**

Paste the whole file into the Supabase SQL editor and run it — one paste creates both the table and the bucket. The human partner does this; never ask for the database password or connection string.

If the `insert into storage.buckets` line errors on an unknown column, the Storage schema has changed. Do not guess at the column names — create the bucket through the dashboard instead (Storage → New bucket → name `resources`, Public on, file size limit 10MB, allowed MIME type `application/pdf`) and drop that statement from the file.

- [ ] **Step 3: Verify the table**

Run in the Supabase SQL editor:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'resources'
order by ordinal_position;
```

Expected: 11 rows, with `pdf_url`, `source_url`, `attribution` and `description` all `YES` under `is_nullable`. If `source_url` or `attribution` is missing, the `alter` statements did not run — the create-if-not-exists on its own will not add them to a table that already exists.

- [ ] **Step 4: Verify the bucket against the one that already works**

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('class-materials', 'resources');
```

Expected: two rows whose `public`, `file_size_limit` and `allowed_mime_types` all match. `class-materials` is serving PDFs in production, so it is the reference — if the new row differs from it, fix the new row rather than reasoning about which value is right.

- [ ] **Step 5: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add migrations/add_resources_table.sql
git commit -m "Add the resources table"
```

---

### Task 2: Extract the PDF decode helper

`routes/classes.js:339` already decodes and validates a base64 PDF correctly. The resources upload is the second real caller, which is the point at which sharing pays. Extract the pure part — decode and validate — and leave the storage call in each route.

**Files:**
- Create: `backend:utils/pdfUpload.js`
- Create: `backend:tests/pdfUpload.test.js`
- Modify: `backend:routes/classes.js:360-372` (replace the inline decode with a call)

**Interfaces:**
- Consumes: nothing
- Produces: `decodePdf(dataUrl) -> { ok: true, buffer: Buffer } | { ok: false, error: string }` and `MAX_PDF_BYTES: number`, both consumed by Task 4

- [ ] **Step 1: Write the failing test**

Create `backend:tests/pdfUpload.test.js`:

```js
const { decodePdf, MAX_PDF_BYTES } = require('../utils/pdfUpload')

const asDataUrl = buf => `data:application/pdf;base64,${buf.toString('base64')}`
const realPdf = () => Buffer.from('%PDF-1.4\nfake body\n%%EOF', 'latin1')

describe('decodePdf', () => {
  test('accepts a real PDF payload', () => {
    const r = decodePdf(asDataUrl(realPdf()))
    expect(r.ok).toBe(true)
    expect(r.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })

  test('rejects anything that is not a PDF data URL', () => {
    expect(decodePdf('data:image/png;base64,iVBORw0KGgo=').ok).toBe(false)
    expect(decodePdf('').ok).toBe(false)
    expect(decodePdf(null).ok).toBe(false)
    expect(decodePdf(undefined).ok).toBe(false)
  })

  test('rejects bytes that are not a PDF even when the MIME type claims otherwise', () => {
    const notPdf = Buffer.from('GIF89a and then some padding', 'latin1')
    const r = decodePdf(asDataUrl(notPdf))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/not a valid PDF/)
  })

  test('rejects a payload over the 10MB ceiling', () => {
    const big = Buffer.concat([Buffer.from('%PDF-', 'latin1'), Buffer.alloc(MAX_PDF_BYTES)])
    const r = decodePdf(asDataUrl(big))
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/under 10MB/)
  })

  test('the ceiling is 10MB', () => {
    expect(MAX_PDF_BYTES).toBe(10 * 1024 * 1024)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest tests/pdfUpload.test.js
```

Expected: FAIL — `Cannot find module '../utils/pdfUpload'`

- [ ] **Step 3: Write the implementation**

Create `backend:utils/pdfUpload.js`:

```js
const MAX_PDF_BYTES = 10 * 1024 * 1024

// Decodes a `data:application/pdf;base64,...` body into a Buffer, refusing
// anything that isn't really a PDF.
//
// Shared rather than copied: class materials and resource guides both accept
// an uploaded PDF as base64 in a JSON body, so the browser never needs the
// Supabase anon key and storage policies can stay shut. That means both are
// defending the same trust boundary, and a base64 payload can claim any MIME
// type it likes.
//
// The storage call stays in each route — only the decoding is shared, because
// only the decoding is the same.
function decodePdf(dataUrl) {
  const match = /^data:application\/pdf;base64,(.+)$/.exec(dataUrl || '')
  if (!match) return { ok: false, error: 'Expected a PDF file' }

  const buffer = Buffer.from(match[1], 'base64')
  if (buffer.length > MAX_PDF_BYTES) {
    return { ok: false, error: 'PDF must be under 10MB' }
  }
  // Check the actual bytes, not the declared type. Every real PDF starts
  // with %PDF-.
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return { ok: false, error: 'That file is not a valid PDF' }
  }
  return { ok: true, buffer }
}

module.exports = { decodePdf, MAX_PDF_BYTES }
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/kinghamin/linguaxchange-backend && npx jest tests/pdfUpload.test.js
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Use the helper in the existing class materials route**

In `backend:routes/classes.js`, replace this block inside `POST /:id/materials-pdf`:

```js
    const match = /^data:application\/pdf;base64,(.+)$/.exec(req.body.pdf || '')
    if (!match) return res.status(400).json({ error: 'Expected a PDF file' })

    const buffer = Buffer.from(match[1], 'base64')
    if (buffer.length > MAX_MATERIALS_BYTES) {
      return res.status(400).json({ error: 'PDF must be under 10MB' })
    }
    // A base64 payload can claim any MIME type; check the actual bytes.
    // Every real PDF starts with %PDF-.
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return res.status(400).json({ error: 'That file is not a valid PDF' })
    }
```

with:

```js
    const decoded = decodePdf(req.body.pdf)
    if (!decoded.ok) return res.status(400).json({ error: decoded.error })
    const buffer = decoded.buffer
```

Add the import near the other requires at the top of the file:

```js
const { decodePdf } = require('../utils/pdfUpload')
```

Then delete the now-unused `MAX_MATERIALS_BYTES` constant at `routes/classes.js:19`.

- [ ] **Step 6: Confirm nothing else used the deleted constant**

```bash
cd /Users/kinghamin/linguaxchange-backend && grep -rn "MAX_MATERIALS_BYTES" --include="*.js" . | grep -v node_modules
```

Expected: no output. If anything prints, that caller needs `MAX_PDF_BYTES` from the new module instead.

- [ ] **Step 7: Run the whole backend suite**

```bash
cd /Users/kinghamin/linguaxchange-backend && npx jest
```

Expected: all suites pass. This refactor touches a live upload path, so a green full run matters more than the one new file.

- [ ] **Step 8: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add utils/pdfUpload.js tests/pdfUpload.test.js routes/classes.js
git commit -m "Extract the PDF decode helper both uploads need"
```

---

### Task 3: Resource validation helper

A pure validator, following the shape of `utils/reports.js` `validateReport` — the established pattern for "validate a request body" in this codebase.

**Files:**
- Create: `backend:utils/resources.js`
- Create: `backend:tests/resources.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `validateResource(body) -> { ok: true, language_code, level, audience, title, description, source_url, attribution } | { ok: false, error: string }`, plus `LEVELS` and `LANGUAGE_CODES` arrays. Consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `backend:tests/resources.test.js`:

```js
const { validateResource } = require('../utils/resources')

const valid = extra => ({
  language_code: 'ES',
  level: 'A1',
  title: 'Spanish A1 — What to Study',
  ...extra,
})

describe('validateResource', () => {
  test('accepts a minimal valid resource', () => {
    const r = validateResource(valid())
    expect(r.ok).toBe(true)
    expect(r.language_code).toBe('ES')
    expect(r.level).toBe('A1')
    expect(r.audience).toBe('learner')
    expect(r.description).toBe(null)
    expect(r.source_url).toBe(null)
    expect(r.attribution).toBe(null)
  })

  test('normalises language and level to uppercase', () => {
    const r = validateResource(valid({ language_code: 'es', level: 'b1' }))
    expect(r.language_code).toBe('ES')
    expect(r.level).toBe('B1')
  })

  test('rejects an unknown language or level', () => {
    expect(validateResource(valid({ language_code: 'ZZ' })).ok).toBe(false)
    expect(validateResource(valid({ language_code: '' })).ok).toBe(false)
    expect(validateResource(valid({ level: 'A3' })).ok).toBe(false)
    expect(validateResource(valid({ level: undefined })).ok).toBe(false)
  })

  test('rejects an unknown audience but defaults to learner', () => {
    expect(validateResource(valid()).audience).toBe('learner')
    expect(validateResource(valid({ audience: 'teacher' })).ok).toBe(true)
    expect(validateResource(valid({ audience: 'recruiter' })).ok).toBe(false)
  })

  test('requires a non-blank title within the length cap', () => {
    expect(validateResource(valid({ title: '   ' })).ok).toBe(false)
    expect(validateResource(valid({ title: 'x'.repeat(201) })).ok).toBe(false)
    expect(validateResource(valid({ title: 'x'.repeat(200) })).ok).toBe(true)
  })

  test('trims the title and description', () => {
    const r = validateResource(valid({ title: '  Guide  ', description: '  Text  ' }))
    expect(r.title).toBe('Guide')
    expect(r.description).toBe('Text')
  })

  test('caps the description length', () => {
    expect(validateResource(valid({ description: 'x'.repeat(1001) })).ok).toBe(false)
    expect(validateResource(valid({ description: 'x'.repeat(1000) })).ok).toBe(true)
  })

  test('accepts an http(s) source URL and rejects anything else', () => {
    expect(validateResource(valid({ source_url: 'https://www.uned.es/x' })).ok).toBe(true)
    expect(validateResource(valid({ source_url: 'http://uned.es' })).ok).toBe(true)
    expect(validateResource(valid({ source_url: 'javascript:alert(1)' })).ok).toBe(false)
    expect(validateResource(valid({ source_url: 'uned.es' })).ok).toBe(false)
  })

  test('an empty source URL is allowed and stored as null', () => {
    expect(validateResource(valid({ source_url: '' })).source_url).toBe(null)
    expect(validateResource(valid({ source_url: '   ' })).source_url).toBe(null)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/kinghamin/linguaxchange-backend && npx jest tests/resources.test.js
```

Expected: FAIL — `Cannot find module '../utils/resources'`

- [ ] **Step 3: Write the implementation**

Create `backend:utils/resources.js`:

```js
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LANGUAGE_CODES = ['KO', 'ES', 'DE', 'EN', 'PT', 'FR', 'IT']
const AUDIENCES = ['learner', 'teacher']
const MAX_TITLE = 200
const MAX_DESCRIPTION = 1000

// Validates an admin's resource submission. Returns the cleaned columns so
// the route can hand the result straight to the DB without re-reading
// req.body — the same shape validateReport uses in utils/reports.js.
//
// pdf_url is deliberately absent: it is only ever set by the upload endpoint
// from a URL the server itself built, never by an admin typing one in.
function validateResource(body = {}) {
  const language_code = String(body.language_code || '').toUpperCase()
  if (!LANGUAGE_CODES.includes(language_code)) return { ok: false, error: 'Unknown language' }

  const level = String(body.level || '').toUpperCase()
  if (!LEVELS.includes(level)) return { ok: false, error: 'Unknown level' }

  const audience = String(body.audience || 'learner').toLowerCase()
  if (!AUDIENCES.includes(audience)) return { ok: false, error: 'Unknown audience' }

  const title = String(body.title || '').trim()
  if (!title) return { ok: false, error: 'Title is required' }
  if (title.length > MAX_TITLE) return { ok: false, error: 'Title is too long' }

  const description = String(body.description || '').trim()
  if (description.length > MAX_DESCRIPTION) return { ok: false, error: 'Description is too long' }

  // Renders as a link on a public page, so the scheme is checked rather than
  // trusted: a javascript: URL stored here would be a stored XSS vector, and
  // a bare "uned.es" would resolve relative to our own domain and 404.
  const source_url = String(body.source_url || '').trim()
  if (source_url && !/^https?:\/\/\S+$/.test(source_url)) {
    return { ok: false, error: 'Source URL must start with http:// or https://' }
  }

  const attribution = String(body.attribution || '').trim()

  return {
    ok: true,
    language_code,
    level,
    audience,
    title,
    description: description || null,
    source_url: source_url || null,
    attribution: attribution || null,
  }
}

module.exports = { validateResource, LEVELS, LANGUAGE_CODES }
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/kinghamin/linguaxchange-backend && npx jest tests/resources.test.js
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add utils/resources.js tests/resources.test.js
git commit -m "Add resource validation"
```

---

### Task 4: The resources API

**Files:**
- Create: `backend:routes/resources.js`
- Modify: `backend:index.js` (mount the router; add the upload path to the large-body parser list)

**Interfaces:**
- Consumes: `decodePdf` from Task 2, `validateResource` from Task 3
- Produces: five HTTP endpoints under `/api/resources`, consumed by Tasks 7, 8, 9 and 11

- [ ] **Step 1: Write the route file**

Create `backend:routes/resources.js`:

```js
const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { validateResource } = require('../utils/resources')
const { decodePdf } = require('../utils/pdfUpload')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const RESOURCES_BUCKET = 'resources'
const PUBLIC_COLUMNS = 'id, language_code, level, audience, title, description, pdf_url, source_url, attribution, updated_at'

// ROUTE ORDER MATTERS. '/all' must be declared before '/:lang/:level' or
// Express would never reach it, and the router.use() guard below must come
// after every public route or it would lock them too.

// GET /api/resources — every published resource.
//
// Deliberately unauthenticated. Crawlers and logged-out visitors are the
// entire audience for this feature; requiring a token here would defeat the
// reason it exists. A row without a PDF is a draft and never leaves.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(PUBLIC_COLUMNS)
      .not('pdf_url', 'is', null)
      .order('language_code')
      .order('level')
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not fetch resources' })
  }
})

// GET /api/resources/all — admin listing, drafts included. Separate from the
// public list because the admin tab needs to see rows whose PDF hasn't been
// uploaded yet, which is exactly what the public list filters out.
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(PUBLIC_COLUMNS)
      .order('language_code')
      .order('level')
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not fetch resources' })
  }
})

// GET /api/resources/:lang/:level — one resource, for the detail page.
router.get('/:lang/:level', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select(PUBLIC_COLUMNS)
      .eq('language_code', String(req.params.lang).toUpperCase())
      .eq('level', String(req.params.level).toUpperCase())
      .eq('audience', 'learner')
      .not('pdf_url', 'is', null)
      .maybeSingle()
    if (error) return res.status(400).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Resource not found' })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not fetch the resource' })
  }
})

// Everything below this line is admin-only.
router.use(requireAuth, requireAdmin)

// POST /api/resources — create or update the row for a (language, level,
// audience). The unique constraint makes this an upsert rather than a
// separate create and edit.
//
// pdf_url is intentionally not in the payload, so an upsert over an existing
// row leaves the uploaded PDF alone: PostgREST only updates the columns it
// was actually sent.
router.post('/', async (req, res) => {
  const v = validateResource(req.body)
  if (!v.ok) return res.status(400).json({ error: v.error })
  const { ok, ...fields } = v
  try {
    const { data, error } = await supabase
      .from('resources')
      .upsert(
        { ...fields, updated_at: new Date().toISOString() },
        { onConflict: 'language_code,level,audience' }
      )
      .select(PUBLIC_COLUMNS)
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not save the resource' })
  }
})

// POST /api/resources/:id/pdf — replaces the guide PDF, or removes it when
// sent { pdf: null }.
//
// Base64 in a JSON body, mirroring the class materials upload, so the browser
// never needs the Supabase anon key. The bucket independently enforces
// PDF-only and 10MB, but decodePdf re-checks both so a bad request fails with
// a useful message rather than a storage error.
router.post('/:id/pdf', async (req, res) => {
  try {
    const { data: row, error: findError } = await supabase
      .from('resources')
      .select('id, language_code, level, audience')
      .eq('id', req.params.id)
      .single()
    if (findError || !row) return res.status(404).json({ error: 'Resource not found' })

    // Stable path, so re-uploading replaces rather than accumulating.
    const path = `${row.language_code}-${row.level}-${row.audience}.pdf`.toLowerCase()

    // Explicit null clears it. Undefined would be an accident; only an
    // outright null counts as "remove this".
    if (req.body.pdf === null) {
      await supabase.storage.from(RESOURCES_BUCKET).remove([path])
      const { data, error } = await supabase
        .from('resources')
        .update({ pdf_url: null, updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .select(PUBLIC_COLUMNS)
        .single()
      if (error) return res.status(400).json({ error: error.message })
      return res.json(data)
    }

    const decoded = decodePdf(req.body.pdf)
    if (!decoded.ok) return res.status(400).json({ error: decoded.error })

    const { error: uploadError } = await supabase.storage
      .from(RESOURCES_BUCKET)
      .upload(path, decoded.buffer, { contentType: 'application/pdf', upsert: true })
    if (uploadError) return res.status(400).json({ error: uploadError.message })

    const { data: { publicUrl } } = supabase.storage
      .from(RESOURCES_BUCKET)
      .getPublicUrl(path)

    // Cache-bust: the path is stable across re-uploads, so without this a
    // replaced PDF would keep serving the old cached copy.
    const versioned = `${publicUrl}?v=${Date.now()}`

    const { data, error } = await supabase
      .from('resources')
      .update({ pdf_url: versioned, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .select(PUBLIC_COLUMNS)
      .single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not upload the PDF' })
  }
})

// DELETE /api/resources/:id — removes the row and its stored object.
router.delete('/:id', async (req, res) => {
  try {
    const { data: row } = await supabase
      .from('resources')
      .select('id, language_code, level, audience')
      .eq('id', req.params.id)
      .single()
    if (!row) return res.status(404).json({ error: 'Resource not found' })

    const path = `${row.language_code}-${row.level}-${row.audience}.pdf`.toLowerCase()
    await supabase.storage.from(RESOURCES_BUCKET).remove([path])

    const { error } = await supabase.from('resources').delete().eq('id', row.id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not delete the resource' })
  }
})

module.exports = router
```

- [ ] **Step 2: Mount the router**

In `backend:index.js`, add the require alongside the others (after line 20):

```js
const resourceRoutes = require('./routes/resources')
```

and the mount alongside the others (after line 81):

```js
app.use('/api/resources', resourceRoutes)
```

- [ ] **Step 3: Add the upload path to the large-body parser**

This step is not optional and is easy to miss. `index.js:61` routes requests to one of two JSON parsers, and the default cap is 100kb — a 10MB PDF arrives as roughly 13.4MB of base64 and would be rejected with a 413 before ever reaching the route.

At `backend:index.js:61`, change:

```js
const UPLOAD_PATHS = ['/api/users', '/api/classes']
```

to:

```js
const UPLOAD_PATHS = ['/api/users', '/api/classes', '/api/resources']
```

- [ ] **Step 4: Verify the routes respond**

Start the server locally against the real database:

```bash
cd /Users/kinghamin/linguaxchange-backend && PORT=3001 node index.js
```

In another terminal:

```bash
curl -s -i http://localhost:3001/api/resources
```

Expected: `HTTP/1.1 200` and a body of `[]` — an empty array, because no rows exist yet. A 401 here means the `router.use` guard was placed above the public routes.

```bash
curl -s -i http://localhost:3001/api/resources/es/a1
```

Expected: `HTTP/1.1 404` and `{"error":"Resource not found"}`.

```bash
curl -s -i -X POST http://localhost:3001/api/resources -H 'Content-Type: application/json' -d '{"language_code":"ES","level":"A1","title":"x"}'
```

Expected: `HTTP/1.1 401` — writes are guarded.

```bash
curl -s -i http://localhost:3001/api/resources/all
```

Expected: `HTTP/1.1 401` — the admin listing is guarded and was not shadowed by `/:lang/:level` (a 404 here would mean it was).

Stop the server when done.

- [ ] **Step 5: Run the backend suite**

```bash
cd /Users/kinghamin/linguaxchange-backend && npx jest
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add routes/resources.js index.js
git commit -m "Add the resources API"
```

---

### Task 5: Extract the shared language list

`LANGUAGES` is currently duplicated in `app/auth/register/page.js:54` and `app/classes/create/page.js:36`. The resources grid is the third caller, so extract it — the same move already made for `lib/countries.js` and `lib/enrollments.js`.

**Files:**
- Create: `frontend:lib/languages.js`
- Modify: `frontend:app/auth/register/page.js`
- Modify: `frontend:app/classes/create/page.js`

**Interfaces:**
- Consumes: nothing
- Produces: `languageOptions(t) -> [{ code, flag, name }]` and `LEVELS -> string[]`, consumed by Tasks 7 and 11

- [ ] **Step 1: Write the module**

Create `frontend:lib/languages.js`:

```js
// The languages LinguaXchange teaches, and the CEFR ladder.
//
// Shared rather than copied: registration, class creation and the resources
// grid all render the same list, and a list that drifts between them means a
// language you can register to learn but can't create a class for.
//
// Takes `t` rather than importing it, because the names are translated and
// the caller already holds the language context.
export function languageOptions(t) {
  return [
    { code: 'KO', flag: '🇰🇷', name: t('home.langKorean') },
    { code: 'ES', flag: '🇪🇸', name: t('home.langSpanish') },
    { code: 'DE', flag: '🇩🇪', name: t('home.langGerman') },
    { code: 'EN', flag: '🇬🇧', name: t('home.langEnglish') },
    { code: 'PT', flag: '🇧🇷', name: t('home.langPortuguese') },
    { code: 'FR', flag: '🇫🇷', name: t('home.langFrench') },
    { code: 'IT', flag: '🇮🇹', name: t('home.langItalian') },
  ]
}

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
```

- [ ] **Step 2: Use it in the register page**

In `frontend:app/auth/register/page.js`, add to the imports:

```js
import { languageOptions } from '../../../lib/languages'
```

Delete the inline `const LANGUAGES = [ ... ]` array (around line 54) and replace it with:

```js
  const LANGUAGES = languageOptions(t)
```

Leave the file's own `const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']` alone — that one also carries `t('profile.native')` in some pages and is not worth unifying in this change.

- [ ] **Step 3: Use it in the class creation page**

In `frontend:app/classes/create/page.js`, add to the imports:

```js
import { languageOptions } from '../../../lib/languages'
```

Delete the inline `const LANGUAGES = [ ... ]` array (around line 36) and replace it with:

```js
  const LANGUAGES = languageOptions(t)
```

- [ ] **Step 4: Verify no other copy survives**

```bash
cd /Users/kinghamin/linguaxchange-frontend && grep -rn "langKorean" --include="*.js" app lib components | grep -v node_modules
```

Expected: `lib/languages.js`, `lib/i18n/translations.js`, and the two pages just converted no longer appearing with an inline array.

Six other files also match, and that is correct — leave every one of them alone. They hold the same data in different shapes: `app/profile/page.js` uses the same `{code, flag, name}` array; `app/classes/page.js`, `app/classes/[id]/page.js`, `app/teachers/[id]/page.js` and `app/saved-teachers/page.js` use a `KO: { flag, name }` lookup map; `app/page.js` adds `greeting` and `color` for the homepage cards. Consolidating those needs a second export and is a separate change — this task only shares what the resources grid needs.

- [ ] **Step 5: Build**

```bash
cd /Users/kinghamin/linguaxchange-frontend && npm run build
```

Expected: build succeeds with no new errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add lib/languages.js app/auth/register/page.js app/classes/create/page.js
git commit -m "Share the language list the resources grid also needs"
```

---

### Task 6: Translation keys

All five languages, added together so no page ships with a missing key. Resource titles and descriptions are admin-entered and stay untranslated — only page chrome is translated.

**Files:**
- Modify: `frontend:lib/i18n/translations.js` (five blocks: EN at ~line 10, KO ~587, ES ~1164, DE ~1741, PT ~2318)

**Interfaces:**
- Consumes: nothing
- Produces: the `resources.*` key namespace and `nav.resources`, consumed by Tasks 7, 8, 10 and 11

- [ ] **Step 1: Add a `resources` block to each language**

Insert a `resources: { ... }` section inside each language's object, as a sibling of the existing `common` and `nav` sections.

EN:

```js
    resources: {
      title: 'Free study guides',
      subtitle: 'What to study at every level, written by LinguaXchange. Free, no account needed.',
      comingSoon: 'Coming soon',
      download: 'Download PDF',
      officialSyllabus: 'Official exam syllabus',
      backToResources: '← All study guides',
      notFound: 'That guide does not exist yet.',
      level: 'Level',
      forLearners: 'For learners',
    },
```

KO:

```js
    resources: {
      title: '무료 학습 가이드',
      subtitle: '레벨별로 무엇을 공부해야 하는지 LinguaXchange가 직접 정리했습니다. 계정 없이 무료로 이용하세요.',
      comingSoon: '준비 중',
      download: 'PDF 내려받기',
      officialSyllabus: '공식 시험 요강',
      backToResources: '← 전체 학습 가이드',
      notFound: '아직 없는 가이드입니다.',
      level: '레벨',
      forLearners: '학습자용',
    },
```

ES:

```js
    resources: {
      title: 'Guías de estudio gratuitas',
      subtitle: 'Qué estudiar en cada nivel, escrito por LinguaXchange. Gratis y sin cuenta.',
      comingSoon: 'Próximamente',
      download: 'Descargar PDF',
      officialSyllabus: 'Temario oficial del examen',
      backToResources: '← Todas las guías',
      notFound: 'Esa guía todavía no existe.',
      level: 'Nivel',
      forLearners: 'Para estudiantes',
    },
```

DE:

```js
    resources: {
      title: 'Kostenlose Lernleitfäden',
      subtitle: 'Was auf jedem Niveau zu lernen ist, geschrieben von LinguaXchange. Kostenlos, ohne Konto.',
      comingSoon: 'Demnächst',
      download: 'PDF herunterladen',
      officialSyllabus: 'Offizieller Prüfungslehrplan',
      backToResources: '← Alle Lernleitfäden',
      notFound: 'Diesen Leitfaden gibt es noch nicht.',
      level: 'Niveau',
      forLearners: 'Für Lernende',
    },
```

PT:

```js
    resources: {
      title: 'Guias de estudo gratuitos',
      subtitle: 'O que estudar em cada nível, escrito pela LinguaXchange. Grátis, sem precisar de conta.',
      comingSoon: 'Em breve',
      download: 'Baixar PDF',
      officialSyllabus: 'Programa oficial do exame',
      backToResources: '← Todos os guias',
      notFound: 'Esse guia ainda não existe.',
      level: 'Nível',
      forLearners: 'Para estudantes',
    },
```

- [ ] **Step 2: Add `nav.resources` to each language**

Inside each language's existing `nav` section, add one key:

- EN: `resources: 'Study guides',`
- KO: `resources: '학습 가이드',`
- ES: `resources: 'Guías de estudio',`
- DE: `resources: 'Lernleitfäden',`
- PT: `resources: 'Guias de estudo',`

- [ ] **Step 3: Verify all five languages got both additions**

```bash
cd /Users/kinghamin/linguaxchange-frontend && grep -c "officialSyllabus" lib/i18n/translations.js && grep -c "resources: '" lib/i18n/translations.js
```

Expected: `5` from the first command, `5` from the second. Any other number means a language block was missed — find it before moving on, because a missing key renders as the raw key string on a public page.

- [ ] **Step 4: Build**

```bash
cd /Users/kinghamin/linguaxchange-frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add lib/i18n/translations.js
git commit -m "Add resources page translations"
```

---

### Task 7: The resources grid page

**Files:**
- Create: `frontend:app/resources/page.js`

**Interfaces:**
- Consumes: `languageOptions`, `LEVELS` from Task 5; `GET /api/resources` from Task 4; `resources.*` keys from Task 6
- Produces: the `/resources` route, linked from Task 10

- [ ] **Step 1: Write the page**

Create `frontend:app/resources/page.js`:

```jsx
'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { languageOptions, LEVELS } from '../../lib/languages'
import LanguageSwitcher from '../../components/LanguageSwitcher'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// Only the levels a guide could plausibly exist for. C1 and C2 are in the
// schema but showing empty columns for them would make the grid look
// abandoned rather than growing.
const GRID_LEVELS = LEVELS.slice(0, 4)

export default function Resources() {
  const { t } = useLanguage()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/resources`)
      .then(r => r.json())
      .then(d => setResources(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const languages = languageOptions(t)
  const has = (code, level) =>
    resources.some(r => r.language_code === code && r.level === level)

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
        <LanguageSwitcher />
      </nav>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-navy mb-2">{t('resources.title')}</h1>
        <p className="text-navy/60 mb-10 max-w-xl">{t('resources.subtitle')}</p>

        {loading && <p className="text-navy/40">{t('common.loading')}</p>}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-navy/40 text-xs font-bold uppercase tracking-wide pb-3 pr-4"></th>
                  {GRID_LEVELS.map(level => (
                    <th key={level} className="text-navy/40 text-xs font-bold uppercase tracking-wide pb-3 px-2">{level}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {languages.map(lang => (
                  <tr key={lang.code} className="border-t border-navy/10">
                    <td className="py-3 pr-4 font-bold text-navy whitespace-nowrap">
                      <span className="mr-2">{lang.flag}</span>{lang.name}
                    </td>
                    {GRID_LEVELS.map(level => (
                      <td key={level} className="py-3 px-2 text-center">
                        {has(lang.code, level) ? (
                          <a href={`/resources/${lang.code.toLowerCase()}/${level.toLowerCase()}`}
                            className="inline-block bg-brand-yellow/20 text-navy border-2 border-navy px-4 py-1.5 rounded-full text-sm font-bold hover:bg-brand-yellow/40 transition-colors">
                            {level}
                          </a>
                        ) : (
                          // Greyed and unlinked rather than hidden, so sparse
                          // coverage reads as a grid still filling up instead
                          // of a broken page.
                          <span className="inline-block text-navy/20 text-xs px-2 py-1.5" title={t('resources.comingSoon')}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/kinghamin/linguaxchange-frontend && npm run build
```

Expected: build succeeds and the route list includes `/resources`.

- [ ] **Step 3: Verify in the browser**

Start the dev server and open `/resources`. With no rows in the database yet, expect: the heading and subtitle render, seven language rows, four level columns, and every cell showing a grey dash. Nothing should be a link, and no raw translation keys (e.g. the literal text `resources.title`) should appear.

- [ ] **Step 4: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add app/resources/page.js
git commit -m "Add the resources grid page"
```

---

### Task 8: The resource detail page

This is the page that has to rank, so it is a server component with real per-page metadata. The grid can be client-side; this one cannot.

**Files:**
- Create: `frontend:app/resources/[language]/[level]/page.js`

**Interfaces:**
- Consumes: `GET /api/resources/:lang/:level` from Task 4; `resources.*` keys from Task 6
- Produces: the `/resources/[language]/[level]` route, emitted by the sitemap in Task 9

- [ ] **Step 1: Write the page**

Create `frontend:app/resources/[language]/[level]/page.js`:

```jsx
import { notFound } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'
const SITE = 'https://linguaxchange.com'

// Server-rendered rather than client-fetched: this is the page that has to be
// readable by a crawler with no JavaScript, which is the entire reason the
// feature was built first.
//
// revalidate rather than force-dynamic, because a guide changes a few times a
// year and a cached page is faster for everyone including the crawler.
export const revalidate = 3600

async function getResource(language, level) {
  try {
    const res = await fetch(`${API}/api/resources/${language}/${level}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

export async function generateMetadata({ params }) {
  const { language, level } = await params
  const resource = await getResource(language, level)
  if (!resource) return { title: 'Study guide — LinguaXchange' }

  const url = `${SITE}/resources/${language.toLowerCase()}/${level.toLowerCase()}`
  const description = resource.description || resource.title
  return {
    title: `${resource.title} — LinguaXchange`,
    description,
    alternates: { canonical: url },
    openGraph: { title: resource.title, description, url, type: 'article' },
  }
}

export default async function ResourceDetail({ params }) {
  const { language, level } = await params
  const resource = await getResource(language, level)
  if (!resource) notFound()

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <a href="/resources" className="text-brand-red font-bold text-sm hover:underline">← All study guides</a>

        <div className="flex gap-2 mt-6 mb-3">
          <span className="bg-navy text-white text-xs font-bold px-3 py-1 rounded-full">{resource.level}</span>
          <span className="bg-white text-navy border-2 border-navy/20 text-xs font-bold px-3 py-1 rounded-full">{resource.language_code}</span>
        </div>

        <h1 className="font-display font-extrabold text-3xl text-navy mb-3">{resource.title}</h1>
        {resource.description && (
          <p className="text-navy/70 leading-relaxed mb-8">{resource.description}</p>
        )}

        <a href={resource.pdf_url}
          className="inline-block bg-brand-red text-white px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red/90 transition-colors">
          Download PDF
        </a>

        {resource.source_url && (
          // Subordinate to the download on purpose: our guide is the content,
          // the syllabus is the reference it aligns with.
          <p className="mt-5">
            <a href={resource.source_url} target="_blank" rel="noopener noreferrer"
              className="text-navy/60 text-sm hover:text-navy underline">
              Official exam syllabus ↗
            </a>
          </p>
        )}

        {resource.attribution && (
          <p className="mt-6 text-navy/40 text-xs leading-relaxed">{resource.attribution}</p>
        )}
      </div>
    </main>
  )
}
```

Note: this page's visible strings are English-only. It is a server component and the translation layer in this codebase is a client-side React context, so `t()` is not available here. Translating this page means moving the i18n layer server-side, which is a larger change than this feature — leave it, and keep the chrome minimal so the untranslated surface stays small.

- [ ] **Step 2: Build**

```bash
cd /Users/kinghamin/linguaxchange-frontend && npm run build
```

Expected: build succeeds and the route list includes `/resources/[language]/[level]`.

- [ ] **Step 3: Verify the 404 path**

With no rows in the database, open `/resources/es/a1` in the dev server.

Expected: Next's 404 page, not a crash and not a page with empty fields.

- [ ] **Step 4: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add "app/resources/[language]/[level]/page.js"
git commit -m "Add the resource detail page"
```

---

### Task 9: Dynamic sitemap

Without this the pages exist and are never found, which removes the entire reason this feature was built first.

**Files:**
- Modify: `frontend:app/sitemap.js` (replace the whole file)

**Interfaces:**
- Consumes: `GET /api/resources` from Task 4
- Produces: `/sitemap.xml` entries for every published resource

- [ ] **Step 1: Rewrite the sitemap**

Replace the entire contents of `frontend:app/sitemap.js` with:

```js
const BASE = 'https://linguaxchange.com'
const API = 'https://linguaxchange-backend-production.up.railway.app'

// Only the pages a logged-out visitor can actually read. Everything else
// is behind login (dashboard, profile, history) or is an auth flow, so
// there's nothing for a crawler to index.
const STATIC_PATHS = ['', '/classes', '/resources', '/legal/privacy', '/legal/terms']

export const revalidate = 3600

export default async function sitemap() {
  const staticEntries = STATIC_PATHS.map(path => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
  }))

  // A published resource is a public page and belongs in the sitemap — this
  // is the mechanism by which the guides are actually discoverable. A failed
  // fetch degrades to the static list rather than breaking the sitemap
  // entirely, since a sitemap missing some URLs beats a sitemap that 500s.
  let resourceEntries = []
  try {
    const res = await fetch(`${API}/api/resources`, { next: { revalidate: 3600 } })
    const data = await res.json()
    resourceEntries = (Array.isArray(data) ? data : []).map(r => ({
      url: `${BASE}/resources/${r.language_code.toLowerCase()}/${r.level.toLowerCase()}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    }))
  } catch (e) {
    // Static list only.
  }

  return [...staticEntries, ...resourceEntries]
}
```

- [ ] **Step 2: Build**

```bash
cd /Users/kinghamin/linguaxchange-frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Verify**

Open `/sitemap.xml` in the dev server.

Expected: valid XML with five `<url>` entries — the four original paths plus `/resources`. Resource URLs appear only after Task 12 uploads content; this step confirms the fetch failure path degrades cleanly rather than breaking the sitemap.

- [ ] **Step 4: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add app/sitemap.js
git commit -m "Emit resource pages in the sitemap"
```

---

### Task 10: Entry points

Without these the page is reachable only by typing the URL, which is the state `/admin` is in today.

**Files:**
- Modify: `frontend:components/Navbar.js:121` (add a link beside Explore)
- Modify: `frontend:app/page.js:170-176` (add a footer link)

**Interfaces:**
- Consumes: `nav.resources` from Task 6
- Produces: navigation into `/resources`

- [ ] **Step 1: Add the navbar link**

In `frontend:components/Navbar.js`, directly after the existing Explore link at line 121:

```jsx
        <a href="/classes" className="hidden sm:block text-navy/70 font-medium hover:text-navy">{t('common.exploreShort')}</a>
```

add:

```jsx
        <a href="/resources" className="hidden sm:block text-navy/70 font-medium hover:text-navy">{t('nav.resources')}</a>
```

This sits outside the `{user && ...}` block, so it shows for logged-out visitors too — which is the audience.

- [ ] **Step 2: Add the footer link**

In `frontend:app/page.js`, in the footer's link row, change:

```jsx
        <div className="flex justify-center gap-4">
          <a href="/legal/privacy" className="hover:text-navy/70">Privacy Policy</a>
          <a href="/legal/terms" className="hover:text-navy/70">Terms of Service</a>
        </div>
```

to:

```jsx
        <div className="flex justify-center gap-4">
          <a href="/resources" className="hover:text-navy/70">{t('nav.resources')}</a>
          <a href="/legal/privacy" className="hover:text-navy/70">Privacy Policy</a>
          <a href="/legal/terms" className="hover:text-navy/70">Terms of Service</a>
        </div>
```

- [ ] **Step 3: Build**

```bash
cd /Users/kinghamin/linguaxchange-frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Verify in the browser**

Load the homepage logged out. Expect the study-guides link in both the navbar and the footer, and both should navigate to `/resources`. Switch the language switcher through all five languages and confirm the link text changes each time and never renders as `nav.resources`.

- [ ] **Step 5: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add components/Navbar.js app/page.js
git commit -m "Link the study guides from the navbar and footer"
```

---

### Task 11: Admin resources tab

A fifth tab, following the pill-tab markup already in that file.

**Files:**
- Modify: `frontend:app/admin/page.js`

**Interfaces:**
- Consumes: `GET /api/resources/all`, `POST /api/resources`, `POST /api/resources/:id/pdf`, `DELETE /api/resources/:id` from Task 4; `languageOptions`, `LEVELS` from Task 5
- Produces: nothing downstream

- [ ] **Step 1: Add the import and state**

At the top of `frontend:app/admin/page.js`, add to the imports:

```js
import { languageOptions, LEVELS } from '../../lib/languages'
import { useLanguage } from '../../lib/i18n/LanguageContext'
```

Inside the `Admin` component, alongside the other `useState` calls:

```js
  const { t } = useLanguage()
  const [resources, setResources] = useState([])
  const [resourceForm, setResourceForm] = useState({
    language_code: 'ES', level: 'A1', title: '', description: '', source_url: '', attribution: '',
  })
  const [resourceMessage, setResourceMessage] = useState('')
```

- [ ] **Step 2: Add the fetch and the handlers**

Alongside the other fetch functions in the component:

```js
  const fetchResources = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/resources/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setResources(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  const saveResource = async () => {
    setResourceMessage('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/resources`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceForm),
      })
      const data = await res.json()
      if (!res.ok) { setResourceMessage(data.error || 'Could not save'); return }
      setResourceMessage('Saved. Now upload the PDF below.')
      fetchResources()
    } catch (e) { setResourceMessage('Could not save') }
  }

  // Base64 in a JSON body, matching how class materials are uploaded, so the
  // browser never needs the Supabase anon key.
  const uploadResourcePdf = async (id, file) => {
    setResourceMessage('')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API}/api/resources/${id}/pdf`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf: reader.result }),
        })
        const data = await res.json()
        if (!res.ok) { setResourceMessage(data.error || 'Upload failed'); return }
        setResourceMessage('PDF uploaded.')
        fetchResources()
      } catch (e) { setResourceMessage('Upload failed') }
    }
    reader.readAsDataURL(file)
  }

  const deleteResource = async (id) => {
    if (!window.confirm('Delete this resource and its PDF?')) return
    try {
      const token = localStorage.getItem('token')
      await fetch(`${API}/api/resources/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchResources()
    } catch (e) { console.error(e) }
  }
```

Add `fetchResources()` to the existing `useEffect` alongside `fetchUsers()`, `fetchClasses()` and `fetchReports()`.

- [ ] **Step 3: Add the tab button**

In the tab row at `frontend:app/admin/page.js:200-217`, after the Credits button:

```jsx
          <button onClick={() => setTab('resources')}
            className={`px-5 py-2 rounded-full font-bold text-sm border-2 transition-colors ${tab === 'resources' ? 'bg-brand-red text-white border-navy' : 'bg-white border-navy/15 text-navy hover:border-navy/40'}`}>
            📄 Resources
          </button>
```

- [ ] **Step 4: Add the tab panel**

After the closing of the `{tab === 'credits' && !loading && ( ... )}` block:

```jsx
        {tab === 'resources' && !loading && (
          <>
            <div className="bg-white border-2 border-navy/15 rounded-xl p-5 mb-6">
              <p className="font-display font-bold text-navy mb-3">Add or update a guide</p>
              <div className="flex flex-wrap gap-2 mb-3">
                <select value={resourceForm.language_code}
                  onChange={e => setResourceForm({ ...resourceForm, language_code: e.target.value })}
                  className="border-2 border-navy/20 rounded-full px-3 py-2 text-sm focus:border-brand-red focus:outline-none">
                  {languageOptions(t).map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                </select>
                <select value={resourceForm.level}
                  onChange={e => setResourceForm({ ...resourceForm, level: e.target.value })}
                  className="border-2 border-navy/20 rounded-full px-3 py-2 text-sm focus:border-brand-red focus:outline-none">
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <input value={resourceForm.title}
                onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                placeholder="Title, e.g. Spanish A1 — What to Study"
                className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-2 focus:border-brand-red focus:outline-none"/>
              <textarea value={resourceForm.description}
                onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })}
                placeholder="Short description shown on the page and in search results"
                rows={2}
                className="w-full border-2 border-navy/20 rounded-2xl px-4 py-2 text-sm mb-2 focus:border-brand-red focus:outline-none"/>
              <input value={resourceForm.source_url}
                onChange={e => setResourceForm({ ...resourceForm, source_url: e.target.value })}
                placeholder="Official syllabus URL (optional)"
                className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-2 focus:border-brand-red focus:outline-none"/>
              <input value={resourceForm.attribution}
                onChange={e => setResourceForm({ ...resourceForm, attribution: e.target.value })}
                placeholder="Attribution — only for third-party material under an open licence"
                className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-3 focus:border-brand-red focus:outline-none"/>
              <div className="flex items-center gap-3">
                <button onClick={saveResource}
                  className="bg-brand-red text-white px-5 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red/90 transition-colors">
                  Save
                </button>
                {resourceMessage && <span className="text-navy/60 text-sm">{resourceMessage}</span>}
              </div>
            </div>

            {resources.length === 0 && <p className="text-navy/40">No resources yet.</p>}
            {resources.map(r => (
              <div key={r.id} className="bg-white border-2 border-navy/15 rounded-xl p-4 mb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">{r.title}</p>
                    <p className="text-navy/50 text-sm">{r.language_code} · {r.level} · {r.audience}</p>
                    {/* A row with no PDF is a draft and is hidden from the
                        public list, so say so rather than looking published. */}
                    <p className={`text-xs mt-1 ${r.pdf_url ? 'text-navy/40' : 'text-brand-red font-bold'}`}>
                      {r.pdf_url ? 'Published' : 'Draft — no PDF uploaded, not public'}
                    </p>
                  </div>
                  <button onClick={() => deleteResource(r.id)}
                    className="text-brand-red text-sm font-bold hover:underline whitespace-nowrap">Delete</button>
                </div>
                <div className="mt-3 border-t border-navy/10 pt-3 flex items-center gap-3 flex-wrap">
                  <input type="file" accept="application/pdf"
                    onChange={e => e.target.files[0] && uploadResourcePdf(r.id, e.target.files[0])}
                    className="text-sm"/>
                  {r.pdf_url && (
                    <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="text-navy/60 text-sm underline hover:text-navy">View current PDF</a>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
```

- [ ] **Step 5: Build**

```bash
cd /Users/kinghamin/linguaxchange-frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Verify in the browser**

Log in as the admin account and open `/admin`. Expect a fifth Resources tab that switches like the others, an empty list, and a form whose language select lists seven languages and level select six levels.

- [ ] **Step 7: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add app/admin/page.js
git commit -m "Add the resources tab to admin"
```

---

### Task 12: Publish the four Spanish guides and verify end to end

The code is done; this is the content pass and the only place the whole path gets exercised together.

**Files:**
- Read: `frontend:docs/resources/es-a1.md`, `es-a2.md`, `es-b1.md`, `es-b2.md` (already written)

- [ ] **Step 1: Export each guide to PDF**

Convert each Markdown file to PDF. Any route is fine — the upload endpoint does not care how the file was produced. Name them `es-a1.pdf`, `es-a2.pdf`, `es-b1.pdf`, `es-b2.pdf`.

Keep the Markdown as the source of truth: when a guide changes, edit the `.md`, re-export, and re-upload. The path in storage is stable, so re-uploading replaces the file and the cache-buster makes the new version visible immediately.

- [ ] **Step 2: Create the four rows**

In `/admin` → Resources, save one row per level. Suggested values:

| Language | Level | Title | Source URL |
| --- | --- | --- | --- |
| Spanish | A1 | Spanish A1 — What to Study | `https://www.uned.es/universidad/inicio/en/estudios/idiomas/cursos-de-idiomas/prueba-libre/nivel.html?codAsignatura=04911020&idContenido=4` |
| Spanish | A2 | Spanish A2 — What to Study | `https://www.uned.es/universidad/inicio/en/estudios/idiomas/cursos-de-idiomas/prueba-libre/nivel.html?codAsignatura=04911040&idContenido=4` |
| Spanish | B1 | Spanish B1 — What to Study | `https://www.uned.es/universidad/inicio/en/estudios/idiomas/cursos-de-idiomas/prueba-libre/nivel.html?codAsignatura=04911050&idContenido=4` |
| Spanish | B2 | Spanish B2 — What to Study | *(leave empty — no syllabus URL confirmed for B2)* |

Leave **attribution empty on all four**. These guides are ours; attribution is only for third-party material under an open licence.

- [ ] **Step 3: Upload each PDF**

Use the file picker on each row. After each upload the row's status should flip from "Draft — no PDF uploaded, not public" to "Published".

- [ ] **Step 4: Verify the security checks actually fire**

Try to upload a non-PDF (any `.png`) to one row.

Expected: the message "That file is not a valid PDF" or "Expected a PDF file", and the row stays as it was. If a PNG uploads successfully, `decodePdf` is not being called — stop and fix Task 4 before continuing.

- [ ] **Step 5: Verify the public path logged out**

In a private browser window, with no session:

- `/resources` shows four linked cells on the Spanish row and dashes everywhere else
- `/resources/es/a1` renders the title, description, a working Download PDF button, and an "Official exam syllabus ↗" link below it
- The PDF downloads and opens
- `/resources/es/b2` renders with **no** syllabus link, since that row has no `source_url`
- `/resources/es/c1` returns a 404
- View source on `/resources/es/a1` and confirm the title and description are in the HTML, not injected by JavaScript — this is what the crawler sees

- [ ] **Step 6: Verify the sitemap**

Open `/sitemap.xml`.

Expected: nine `<url>` entries — five static plus four resource pages. If the resource URLs are missing, the sitemap's fetch is failing; check that the backend is reachable from the deployed frontend.

- [ ] **Step 7: Verify the upsert preserves the PDF**

In `/admin`, re-save the Spanish A1 row with a changed description, then reload.

Expected: the description updates and the row still reads "Published". If it flips back to Draft, the upsert is clearing `pdf_url` and the payload in `POST /api/resources` is wrongly including that column.

- [ ] **Step 8: Commit any content fixes**

Only if a guide's Markdown was edited during this pass:

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add docs/resources/
git commit -m "Fix up the Spanish guides after review"
```

---

## Deferred, tracked here so it is not lost

- **`hreflang` / `alternates.languages`** in `app/layout.js`. Five full translations, none declared to search engines. Same SEO effort, unrelated feature.
- **Server-side i18n.** The detail page is English-only because the translation layer is a client-side React context. Moving it server-side is a larger change than this feature.
- **`/admin` has no inbound link.** Reachable only by URL; needs the backend to expose `is_admin` on the user object.
- **Markdown-to-PDF automation.** Manual export is right for four guides. Revisit past roughly a dozen, or if guides start changing often.
- **C1 guide.** The B2 guide's closing line promises one.
