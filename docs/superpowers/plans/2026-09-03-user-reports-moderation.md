# User Reports and Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A member can report another member with a category and image evidence, and an admin can dismiss, suspend, or delete the reported account from the dashboard.

**Architecture:** The reporting half already exists — table, POST, admin queue, PATCH. This adds a category and private image evidence to the report, and builds the enforcement half that has never existed: a `suspended_until` column checked inside the user row `requireAuth` already fetches, admin endpoints that set it and invalidate live tokens, and an admin delete that reuses the self-service deletion flow rather than copying it.

**Tech Stack:** Express 5, Supabase (Postgres + Storage), Jest, Next.js 16 App Router, React 19, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-03-user-reports-moderation-design.md`

## Global Constraints

- Repos: backend `/Users/kinghamin/linguaxchange-backend`, frontend `/Users/kinghamin/linguaxchange-frontend`. Every task names which.
- Categories, exactly: `harassment`, `inappropriate_content`, `spam_or_scam`, `no_show`, `other`.
- Evidence: at most 3 images per report, 5MB each, `image/jpeg`, `image/png`, `image/webp` only.
- The evidence bucket is **private**. No `getPublicUrl` on it, ever. Signed URLs expire in 60 minutes.
- One `pending` report per reporter per reported user. A second is 409.
- No automatic suspension at any report count. Every action is a human decision.
- Enforcement endpoints are admin-only (`requireAuth, requireAdmin`).
- Never run `git commit --amend`; every change is a new commit.
- Never read, print, or echo `.env`, and never ask the user for a credential.
- Migrations go in `migrations/*.sql` and are handed to the user to run in the Supabase SQL editor. **Do not try to run DDL yourself** — the service-role client cannot execute it.
- Backend user-facing errors go through `fail(res, status, message, cause)` from `utils/failure.js`, which logs the cause server-side and sends only the message.

## Correction to the spec

The spec says admin delete "reuses `utils/accountDeletion.js` unchanged." Half true, and worth knowing before Task 7 surprises anyone. That module exports `anonymizedFields` and `OWN_DATA_DELETIONS` — the *field map*. The actual sequence (cancel classes so enrolled students get refunded, clear own-data rows, zero the balance, remove the avatar, anonymize, email) lives inline in `routes/account.js:88-145`. Copying those 80 lines into an admin route is how a deleted teacher's students end up holding a phantom class with no refund. Task 7 extracts the sequence into one function with two callers.

## File Structure

**Backend — create**
- `migrations/add_report_evidence_and_suspension.sql` — all DDL for this feature
- `utils/suspension.js` — is an account suspended right now, and until when
- `utils/imageUpload.js` — decode a base64 data URL to a Buffer, verified by magic bytes
- `tests/suspension.test.js`, `tests/imageUpload.test.js`, `tests/reports.test.js`

**Backend — modify**
- `middleware/auth.js` — `requireAuth` also reads `suspended_until`
- `utils/reports.js` — category validation
- `utils/accountDeletion.js` — gains `deleteAccount()`, the extracted sequence
- `routes/reports.js` — evidence on POST, duplicate guard, reported users on GET, evidence signing
- `routes/account.js` — self-service delete calls the extracted function
- `routes/admin.js` — suspend, unsuspend, delete
- `routes/users.js` — avatar decode goes through the shared image helper

**Frontend — modify**
- `app/teachers/[id]/page.js` — category picker and image attachments on the report form
- `app/admin/page.js` — enriched report cards, evidence thumbnails, enforcement controls
- `lib/i18n/translations.js` — report form copy in five languages

---

### Task 1: Migration

**Repo:** backend
**Files:** Create `migrations/add_report_evidence_and_suspension.sql`

**Interfaces:**
- Produces: `reports.category`, `reports.evidence_paths`, `users.suspended_until`, `users.suspension_reason`, private bucket `report-evidence`

- [ ] **Step 1: Write the migration**

```sql
-- Reporting and moderation, in one migration because the admin queue is
-- unusable if half of it lands.

-- Categories exist so the queue can be ordered by severity instead of only
-- by date. `no_show` is listed separately on purpose: it is the most common
-- complaint on a booking site and it is not a safety issue, so keeping it
-- out of 'other' stops eight no-shows from burying one harassment report.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_category_check;
ALTER TABLE reports ADD CONSTRAINT reports_category_check
  CHECK (category IS NULL OR category IN
    ('harassment', 'inappropriate_content', 'spam_or_scam', 'no_show', 'other'));

-- Nullable rather than NOT NULL: the one report already in this table
-- predates categories, and backfilling it with a guess would be inventing
-- evidence about a real complaint.

-- Storage paths, not URLs. Every read mints a fresh signed URL, so a stored
-- URL would be a dead link within the hour.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS evidence_paths TEXT[] NOT NULL DEFAULT '{}';

-- Suspension. One nullable timestamp rather than a boolean plus a date:
-- two columns can disagree about whether someone is banned. A permanent ban
-- is a far-future date.
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Private bucket. Every other bucket here is public, which is right for an
-- avatar and wrong for a screenshot of someone being harassed: a public URL
-- is permanent, unauthenticated, and shareable by anyone who ever sees it.
-- Reads go through 60-minute signed URLs instead.
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-evidence', 'report-evidence', false)
ON CONFLICT (id) DO UPDATE SET public = false;
```

- [ ] **Step 2: Commit**

```bash
git add migrations/add_report_evidence_and_suspension.sql
git commit -m "Migration: report categories, evidence paths, account suspension"
```

- [ ] **Step 3: Hand it to the user and STOP**

Print the file and ask them to run it in the Supabase SQL editor. Do not start Task 2 until they confirm — every later task reads these columns.

- [ ] **Step 4: Verify the columns landed**

```bash
node -e "
const {createClient}=require('@supabase/supabase-js');
const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_KEY);
(async()=>{
  const {data,error}=await s.from('reports').select('id,category,evidence_paths').limit(1);
  console.log('reports:', error?.message || Object.keys(data[0]||{}));
  const {data:u,error:e2}=await s.from('users').select('id,suspended_until,suspension_reason').limit(1);
  console.log('users:', e2?.message || Object.keys(u[0]||{}));
})()"
```

Expected: both lines list the new columns, no error.

---

### Task 2: Suspension helper and middleware enforcement

**Repo:** backend
**Files:** Create `utils/suspension.js`, `tests/suspension.test.js`; modify `middleware/auth.js`

**Interfaces:**
- Consumes: `users.suspended_until` (Task 1)
- Produces: `isSuspended({ suspendedUntil, now }) -> { suspended: boolean, until: Date|null }`

- [ ] **Step 1: Write the failing test**

Create `tests/suspension.test.js`:

```javascript
const { isSuspended } = require('../utils/suspension')

const NOW = new Date('2026-09-03T12:00:00Z')
const hours = n => new Date(NOW.getTime() + n * 60 * 60 * 1000)

describe('isSuspended', () => {
  test('a null column is not a suspension', () => {
    expect(isSuspended({ suspendedUntil: null, now: NOW }).suspended).toBe(false)
  })

  test('a future date is an active suspension', () => {
    expect(isSuspended({ suspendedUntil: hours(24), now: NOW }).suspended).toBe(true)
  })

  // Suspensions lapse on their own — nothing sweeps the column — so the
  // check has to be a comparison, not a NULL test.
  test('a past date has lapsed', () => {
    expect(isSuspended({ suspendedUntil: hours(-1), now: NOW }).suspended).toBe(false)
  })

  test('an ISO string works as well as a Date', () => {
    expect(isSuspended({ suspendedUntil: hours(24).toISOString(), now: NOW }).suspended).toBe(true)
  })

  test('reports when it ends, so the user can be told', () => {
    expect(isSuspended({ suspendedUntil: hours(24), now: NOW }).until.getTime()).toBe(hours(24).getTime())
  })

  // Bad data must not become an accidental permanent ban. Refusing to guess
  // keeps the failure in the logs rather than locking someone out.
  test('an unparseable value is not treated as a suspension', () => {
    expect(isSuspended({ suspendedUntil: 'whenever', now: NOW }).suspended).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest tests/suspension.test.js`
Expected: FAIL, "Cannot find module '../utils/suspension'"

- [ ] **Step 3: Write the helper**

Create `utils/suspension.js`:

```javascript
// Whether an account is locked out right now.
//
// A lapsed suspension is not swept by any job, so "suspended" is a
// comparison against the stored end date rather than a NULL check. That also
// makes unsuspending nothing more than clearing the column.
function isSuspended({ suspendedUntil, now = new Date() }) {
  if (!suspendedUntil) return { suspended: false, until: null }

  const until = new Date(suspendedUntil)
  if (Number.isNaN(until.getTime())) {
    // Bad data must not become a silent permanent ban.
    console.error('[SUSPENSION] Unparseable suspended_until:', suspendedUntil)
    return { suspended: false, until: null }
  }

  return { suspended: now < until, until }
}

module.exports = { isSuspended }
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest tests/suspension.test.js`
Expected: PASS, 6 tests

- [ ] **Step 5: Enforce it in requireAuth**

In `middleware/auth.js` add the import:

```javascript
const { isSuspended } = require('../utils/suspension')
```

Change the select inside `requireAuth` from `.select('token_valid_after')` to:

```javascript
      .select('token_valid_after, suspended_until, suspension_reason')
```

After the `isTokenStillValid` check and before `req.userId = payload.userId`:

```javascript
    // Checked on the row requireAuth already fetches, so a suspension costs
    // no extra query. Every authenticated route is covered by the check
    // living here, rather than by remembering to add a guard to each one.
    const suspension = isSuspended({ suspendedUntil: user?.suspended_until })
    if (suspension.suspended) {
      return res.status(403).json({
        error: 'Your account is suspended',
        suspended_until: suspension.until.toISOString(),
        reason: user.suspension_reason || null
      })
    }
```

- [ ] **Step 6: Run the whole suite**

Run: `npx jest --silent`
Expected: everything passes. Nothing stubs this select today — if something breaks, read it rather than deleting it.

- [ ] **Step 7: Commit**

```bash
git add utils/suspension.js tests/suspension.test.js middleware/auth.js
git commit -m "Lock a suspended account out of every authenticated route"
```

---

### Task 3: Admin suspend and unsuspend

**Repo:** backend
**Files:** Modify `routes/admin.js`

**Interfaces:**
- Consumes: `isSuspended` (Task 2), `sendEmail` from `utils/mailer.js`
- Produces: `POST /api/admin/users/:id/suspend` `{ until, reason }`; `POST /api/admin/users/:id/unsuspend`

- [ ] **Step 1: Add the import**

`routes/admin.js` already imports `fail` and builds the supabase client. Add:

```javascript
const { sendEmail } = require('../utils/mailer')
```

- [ ] **Step 2: Write the endpoints**

After the existing `POST /users/:id/credit` handler:

```javascript
// POST /api/admin/users/:id/suspend
// A permanent ban is a far-future `until`, not a separate flag.
router.post('/users/:id/suspend', async (req, res) => {
  const { until, reason } = req.body
  const userId = parseInt(req.params.id)
  if (!userId) return res.status(400).json({ error: 'Invalid user id' })

  const endsAt = new Date(until)
  if (!until || Number.isNaN(endsAt.getTime())) {
    return res.status(400).json({ error: 'A valid end date is required' })
  }
  if (endsAt <= new Date()) {
    return res.status(400).json({ error: 'The end date must be in the future' })
  }
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'A reason is required' })
  }

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name, deleted_at')
      .eq('id', userId)
      .single()

    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.deleted_at) return res.status(400).json({ error: 'That account is already deleted' })

    const { data, error } = await supabase
      .from('users')
      .update({
        suspended_until: endsAt.toISOString(),
        suspension_reason: String(reason).trim(),
        // Kills every token already issued. Without this, a suspended user
        // with an open tab keeps working until their JWT expires, which is
        // not a suspension.
        token_valid_after: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, suspended_until, suspension_reason')
      .single()

    if (error) return fail(res, 400, 'Could not suspend this account', error)

    // Someone locked out with no explanation files a support request, and
    // answering that by hand is worse than sending the mail.
    await sendEmail({
      to: user.email,
      subject: 'Your LinguaXchange account has been suspended',
      text: `Hi ${user.first_name},\n\nYour LinguaXchange account has been suspended until ${endsAt.toUTCString()}.\n\nReason: ${String(reason).trim()}\n\nIf you believe this is a mistake, reply to this email.`
    }).catch(e => console.error('[SUSPEND] Notification email failed', e.message))

    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not suspend this account' })
  }
})

// POST /api/admin/users/:id/unsuspend
router.post('/users/:id/unsuspend', async (req, res) => {
  const userId = parseInt(req.params.id)
  if (!userId) return res.status(400).json({ error: 'Invalid user id' })

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ suspended_until: null, suspension_reason: null })
      .eq('id', userId)
      .select('id, suspended_until')
      .single()

    if (error) return fail(res, 400, 'Could not lift the suspension', error)
    if (!data) return res.status(404).json({ error: 'User not found' })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not lift the suspension' })
  }
})
```

`token_valid_after` is deliberately not cleared on unsuspend. Bumping it logged them out; leaving it bumped just means they sign in again.

- [ ] **Step 3: Expose the state to the dashboard**

Replace `ADMIN_USER_COLUMNS` in `routes/admin.js` with:

```javascript
const ADMIN_USER_COLUMNS = 'id, email, first_name, last_name, nationality, bio, photo_url, teach_language, teach_level, learn_languages, has_certificate, certificate_explanation, is_approved, approval_reason, current_streak, longest_streak, timezone, phone_number, phone_verified, google_id, created_at, suspended_until, suspension_reason, deleted_at'
```

- [ ] **Step 4: Check it parses and the suite passes**

Run: `node --check routes/admin.js && npx jest --silent`
Expected: no output from `--check`, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add routes/admin.js
git commit -m "Let an admin suspend and unsuspend an account"
```

---

### Task 4: Report categories and the duplicate guard

**Repo:** backend
**Files:** Modify `utils/reports.js`, `routes/reports.js`; create `tests/reports.test.js`

**Interfaces:**
- Consumes: `reports.category` (Task 1)
- Produces: `CATEGORIES` array export; `validateReport` returns `category`

- [ ] **Step 1: Write the failing test**

Create `tests/reports.test.js`:

```javascript
const { validateReport, CATEGORIES, MAX_REASON } = require('../utils/reports')

const valid = { report_type: 'user', reported_id: 12, reason: 'Sent me abusive messages', category: 'harassment' }

describe('validateReport', () => {
  test('accepts a well-formed user report', () => {
    const result = validateReport(valid)
    expect(result.ok).toBe(true)
    expect(result.category).toBe('harassment')
  })

  test('lists exactly the five agreed categories', () => {
    expect(CATEGORIES).toEqual(['harassment', 'inappropriate_content', 'spam_or_scam', 'no_show', 'other'])
  })

  test('rejects a category that is not one of them', () => {
    expect(validateReport({ ...valid, category: 'i_dont_like_them' }).ok).toBe(false)
  })

  // The category is a sorting aid, never a substitute for saying what
  // happened, so the free-text reason stays required.
  test('still requires a reason even with a category', () => {
    expect(validateReport({ ...valid, reason: '   ' }).ok).toBe(false)
  })

  test('defaults a missing category to other rather than refusing', () => {
    expect(validateReport({ ...valid, category: undefined }).category).toBe('other')
  })

  test('rejects a reason past the limit', () => {
    expect(validateReport({ ...valid, reason: 'x'.repeat(MAX_REASON + 1) }).ok).toBe(false)
  })

  test('rejects a report with no target', () => {
    expect(validateReport({ ...valid, reported_id: undefined }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest tests/reports.test.js`
Expected: FAIL — `CATEGORIES` is not exported.

- [ ] **Step 3: Extend the validator**

In `utils/reports.js`, below the existing constants:

```javascript
// A sorting aid, not a replacement for `reason`. `no_show` is called out
// separately because it is the most common complaint on a booking site and
// it is not a safety issue — leaving it inside 'other' lets eight of them
// bury one harassment report.
const CATEGORIES = ['harassment', 'inappropriate_content', 'spam_or_scam', 'no_show', 'other']
```

In `validateReport`, after the reason checks:

```javascript
  const category = body.category === undefined || body.category === null || body.category === ''
    ? 'other'
    : body.category
  if (!CATEGORIES.includes(category)) {
    return { ok: false, error: 'That is not a valid report category' }
  }
```

Add `category` to the returned object and `CATEGORIES` to `module.exports`.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest tests/reports.test.js`
Expected: PASS, 7 tests

- [ ] **Step 5: Store the category and block duplicates**

In `routes/reports.js`, replace the body of `POST /` after the validation check:

```javascript
    const { report_type, reported_type, reported_id, reason, category } = check

    if (report_type === 'user' && reported_id === req.userId) {
      return res.status(400).json({ error: 'You cannot report yourself' })
    }

    // One open report per reporter per target. The cheapest defence against
    // a retaliation flood — someone who has just been reported filing twenty
    // back. It does not stop someone with several accounts, and is not meant
    // to: phone verification is the control for that.
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', req.userId)
      .eq('report_type', report_type)
      .eq('reported_id', reported_id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: 'You already have a report about this open with us' })
    }

    const { data, error } = await supabase
      .from('reports')
      .insert([{ reporter_id: req.userId, report_type, reported_type, reported_id, reason, category, status: 'pending' }])
      .select()
      .single()
```

- [ ] **Step 6: Verify and commit**

Run: `node --check routes/reports.js && npx jest --silent`

```bash
git add utils/reports.js routes/reports.js tests/reports.test.js
git commit -m "Categorise reports and stop the same one being filed twice"
```

---

### Task 5: Image evidence — upload and signed viewing

**Repo:** backend
**Files:** Create `utils/imageUpload.js`, `tests/imageUpload.test.js`; modify `routes/reports.js`, `routes/users.js`

**Interfaces:**
- Consumes: bucket `report-evidence` (Task 1)
- Produces: `decodeImage(dataUrl, { maxBytes }) -> { ok: true, buffer, mime, ext } | { ok: false, error }`, plus `MAX_IMAGE_BYTES` and `MAX_EVIDENCE`

- [ ] **Step 1: Write the failing test**

Create `tests/imageUpload.test.js`:

```javascript
const { decodeImage, MAX_IMAGE_BYTES } = require('../utils/imageUpload')

// Real magic bytes, padded to look like a file with content in it.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)])
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(64)])

const url = (mime, buf) => `data:${mime};base64,${buf.toString('base64')}`

describe('decodeImage', () => {
  test('accepts a real PNG', () => {
    const result = decodeImage(url('image/png', PNG))
    expect(result.ok).toBe(true)
    expect(result.ext).toBe('png')
  })

  test('accepts a real JPEG', () => {
    expect(decodeImage(url('image/jpeg', JPEG)).ext).toBe('jpg')
  })

  test('accepts a real WebP', () => {
    expect(decodeImage(url('image/webp', WEBP)).ext).toBe('webp')
  })

  // The declared MIME type is attacker-controlled: a base64 body can claim
  // to be anything. The bytes are what get stored, so the bytes are what
  // get checked.
  test('refuses a script wearing a png content type', () => {
    const notAnImage = Buffer.from('<?php system($_GET["c"]); ?>')
    expect(decodeImage(url('image/png', notAnImage)).ok).toBe(false)
  })

  test('refuses a JPEG declared as a PNG', () => {
    expect(decodeImage(url('image/png', JPEG)).ok).toBe(false)
  })

  test('refuses a content type that is not an image at all', () => {
    expect(decodeImage(url('application/pdf', PNG)).ok).toBe(false)
  })

  test('refuses something that is not a data URL', () => {
    expect(decodeImage('https://example.com/cat.png').ok).toBe(false)
  })

  test('refuses a file over the size limit', () => {
    const huge = Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES + 1)])
    expect(decodeImage(url('image/png', huge)).ok).toBe(false)
  })

  test('honours a caller-supplied smaller limit', () => {
    expect(decodeImage(url('image/png', PNG), { maxBytes: 8 }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest tests/imageUpload.test.js`
Expected: FAIL, "Cannot find module '../utils/imageUpload'"

- [ ] **Step 3: Write the helper**

Create `utils/imageUpload.js`:

```javascript
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_EVIDENCE = 3

// Decodes a `data:image/...;base64,...` body into a Buffer, refusing
// anything whose bytes disagree with its declared type.
//
// Shared for the same reason utils/pdfUpload.js is: avatars and report
// evidence both take a base64 image in a JSON body so the browser never
// holds a Supabase key, which means both defend the same trust boundary —
// and a base64 payload can claim any MIME type it likes.
//
// The storage call stays at each call site. Only the decoding is the same.

const SIGNATURES = {
  'image/png': {
    ext: 'png',
    matches: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  },
  'image/jpeg': {
    ext: 'jpg',
    matches: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  },
  'image/webp': {
    ext: 'webp',
    matches: b => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'
  }
}

function decodeImage(dataUrl, { maxBytes = MAX_IMAGE_BYTES } = {}) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl || '')
  if (!match) return { ok: false, error: 'Expected a jpeg, png, or webp image' }

  const [, mime, base64] = match
  const buffer = Buffer.from(base64, 'base64')

  if (buffer.length > maxBytes) {
    return { ok: false, error: `Each image must be under ${Math.floor(maxBytes / 1024 / 1024)}MB` }
  }

  if (!SIGNATURES[mime].matches(buffer)) {
    return { ok: false, error: 'That file is not a valid image' }
  }

  return { ok: true, buffer, mime, ext: SIGNATURES[mime].ext }
}

module.exports = { decodeImage, MAX_IMAGE_BYTES, MAX_EVIDENCE }
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest tests/imageUpload.test.js`
Expected: PASS, 9 tests

- [ ] **Step 5: Accept evidence on POST /api/reports**

In `routes/reports.js` add:

```javascript
const { decodeImage, MAX_EVIDENCE } = require('../utils/imageUpload')

const EVIDENCE_BUCKET = 'report-evidence'
```

In `POST /`, replace the final `res.status(201).json(data)` with:

```javascript
    const evidence = Array.isArray(req.body.evidence) ? req.body.evidence : []
    if (evidence.length > MAX_EVIDENCE) {
      return res.status(400).json({ error: `At most ${MAX_EVIDENCE} images` })
    }

    const paths = []
    for (const [index, dataUrl] of evidence.entries()) {
      const decoded = decodeImage(dataUrl)
      if (!decoded.ok) return res.status(400).json({ error: decoded.error })

      // Namespaced by report id so one report's evidence cannot collide with
      // another's, and the whole folder is removable in one call.
      const path = `${data.id}/${index}.${decoded.ext}`
      const { error: uploadError } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(path, decoded.buffer, { contentType: decoded.mime, upsert: true })

      if (uploadError) return fail(res, 400, 'Could not upload the evidence', uploadError)
      paths.push(path)
    }

    if (paths.length) {
      await supabase.from('reports').update({ evidence_paths: paths }).eq('id', data.id)
      data.evidence_paths = paths
    }

    res.status(201).json(data)
```

- [ ] **Step 6: Add the signed-URL endpoint**

In `routes/reports.js`, before `module.exports`:

```javascript
// GET /api/reports/:id/evidence/:index — a short-lived signed URL.
//
// The bucket is private, so this is the only way to see the file. Signed
// rather than proxied because the image goes into an <img> tag, and a signed
// URL keeps the bytes out of this process entirely.
router.get('/:id/evidence/:index', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: report, error } = await supabase
      .from('reports')
      .select('evidence_paths')
      .eq('id', req.params.id)
      .single()

    if (error || !report) return res.status(404).json({ error: 'Report not found' })

    const path = (report.evidence_paths || [])[parseInt(req.params.index)]
    if (!path) return res.status(404).json({ error: 'No evidence at that position' })

    const { data: signed, error: signError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(path, 60 * 60)

    if (signError) return fail(res, 400, 'Could not open the evidence', signError)
    res.json({ url: signed.signedUrl })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not open the evidence' })
  }
})
```

- [ ] **Step 7: Route the avatar upload through the same helper**

`routes/users.js` decodes an avatar with its own regex and never checks the bytes — the same hole this helper closes, in a bucket that is public. Add `const { decodeImage } = require('../utils/imageUpload')` and replace the decode block in `POST /:id/avatar`:

```javascript
  const decoded = decodeImage(req.body.image, { maxBytes: MAX_AVATAR_BYTES })
  if (!decoded.ok) return res.status(400).json({ error: decoded.error })

  const path = `avatars/${req.userId}.${decoded.ext}`
```

Delete the now-unused `AVATAR_MIME_EXT` map and update the upload call to use `decoded.buffer` and `decoded.mime`.

- [ ] **Step 8: Verify and commit**

Run: `node --check routes/reports.js && node --check routes/users.js && npx jest --silent`

```bash
git add utils/imageUpload.js tests/imageUpload.test.js routes/reports.js routes/users.js
git commit -m "Attach image evidence to a report, stored privately"
```

---

### Task 6: Show the admin who was reported

**Repo:** backend
**Files:** Modify `routes/reports.js`

**Interfaces:**
- Produces: every report in `GET /api/reports` gains `reported_user` (an object, or null for class reports)

- [ ] **Step 1: Replace the GET handler**

```javascript
// Severity first, then age. A harassment report filed this morning outranks
// eight no-shows from last week; date-only ordering buried it.
const CATEGORY_RANK = {
  harassment: 0,
  inappropriate_content: 1,
  spam_or_scam: 2,
  no_show: 3,
  other: 4
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*, reporter:users!reporter_id(id, first_name, last_name, email)')
      .order('created_at', { ascending: false })

    if (error) return fail(res, 400, 'Could not fetch reports', error)

    const reports = data || []

    // Not a PostgREST embed: reported_id holds a class id when report_type
    // is 'class', so no foreign key to users can exist on that column and an
    // embed would be wrong for half the rows. One follow-up query instead.
    const reportedIds = [...new Set(reports.filter(r => r.report_type === 'user').map(r => r.reported_id))]

    let byId = {}
    if (reportedIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, suspended_until, suspension_reason, deleted_at')
        .in('id', reportedIds)
      byId = Object.fromEntries((users || []).map(u => [u.id, u]))
    }

    const enriched = reports.map(r => ({
      ...r,
      reported_user: r.report_type === 'user' ? byId[r.reported_id] || null : null
    }))

    enriched.sort((a, b) => {
      const pending = (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1)
      if (pending) return pending
      const severity = (CATEGORY_RANK[a.category] ?? 9) - (CATEGORY_RANK[b.category] ?? 9)
      if (severity) return severity
      return new Date(b.created_at) - new Date(a.created_at)
    })

    res.json(enriched)
  } catch (e) {
    res.status(500).json({ error: 'Could not fetch reports' })
  }
})
```

- [ ] **Step 2: Verify and commit**

Run: `node --check routes/reports.js && npx jest --silent`

```bash
git add routes/reports.js
git commit -m "Name the reported user in the admin queue, worst first"
```

---

### Task 7: Shared account deletion, and an admin delete

**Repo:** backend
**Files:** Modify `utils/accountDeletion.js`, `routes/account.js`, `routes/admin.js`

**Interfaces:**
- Consumes: `anonymizedFields`, `OWN_DATA_DELETIONS`, `cancelClass`, `hasFutureSession`, `sendEmail`
- Produces: `deleteAccount(supabase, user, { notify }) -> { ok: true } | { ok: false, error }`

**Why this task exists:** the deletion *sequence* is not in `utils/accountDeletion.js`. It is inline in `routes/account.js:88-145`. An admin delete that skips it leaves a deleted teacher's students holding a phantom class, unrefunded.

- [ ] **Step 1: Extract the sequence**

Add to `utils/accountDeletion.js`:

```javascript
const { cancelClass, hasFutureSession } = require('./classCancellation')
const { sendEmail } = require('./mailer')

// The whole deletion, in the order it has to happen.
//
// Extracted from routes/account.js so an admin deleting someone runs exactly
// the steps a member deleting themselves runs. The ordering is not arbitrary,
// and copying it by hand is how a step gets dropped:
//
// 1. Cancel classes FIRST, while the account still looks normal — cancelClass
//    refunds every enrolled student and emails them. After anonymizing, those
//    emails would read "your class with Deleted User was cancelled" and the
//    refunds would run against a half-scrubbed account.
// 2. Clear their own rows, zero the balance (the ledger stays as the
//    financial record), remove the avatar — it is public and keyed by user
//    id, so nulling photo_url alone leaves it fetchable forever.
// 3. Anonymize last, then mail the real address one final time.
async function deleteAccount(supabase, user, { notify = true } = {}) {
  const { data: classes } = await supabase
    .from('classes')
    .select('id, status, class_sessions(id, session_date, status)')
    .eq('teacher_id', user.id)

  for (const cls of classes || []) {
    if (cls.status !== 'cancelled' && hasFutureSession(cls.class_sessions || [])) {
      try {
        await cancelClass(cls.id, cls)
      } catch (e) {
        console.error('[ACCOUNT_DELETE] Could not cancel class', cls.id, e.message)
      }
    }
  }

  for (const { table, column } of OWN_DATA_DELETIONS) {
    const { error } = await supabase.from(table).delete().eq(column, user.id)
    if (error) console.error('[ACCOUNT_DELETE] Could not clear', table, error.message)
  }

  await supabase.from('credits').update({ balance: 0 }).eq('user_id', user.id)

  await supabase.storage.from('avatars')
    .remove(['jpg', 'png', 'webp'].map(ext => `avatars/${user.id}.${ext}`))

  const { error: anonError } = await supabase
    .from('users')
    .update(anonymizedFields(user.id))
    .eq('id', user.id)

  if (anonError) return { ok: false, error: anonError }

  if (notify) {
    await sendEmail({
      to: user.email,
      subject: 'Your LinguaXchange account has been deleted',
      text: `Hi ${user.first_name},\n\nYour LinguaXchange account has been deleted and your personal details have been removed.\n\nClasses you had scheduled were cancelled and the students enrolled in them were refunded. Records of past classes and credit transactions are kept without your name attached, because other members' history and our financial records depend on them.\n\nIf you didn't request this, reply to this email immediately.`
    }).catch(e => console.error('[ACCOUNT_DELETE] Confirmation email failed', e.message))
  }

  return { ok: true }
}

module.exports = { anonymizedFields, OWN_DATA_DELETIONS, deleteAccount }
```

- [ ] **Step 2: Point the self-service route at it**

In `routes/account.js`, replace everything from the `// Cancel first` comment through the confirmation `sendEmail(...)` call with:

```javascript
    const result = await deleteAccount(supabase, user)
    if (!result.ok) return res.status(500).json({ error: 'Could not delete your account' })
```

Change the import to `const { anonymizedFields, OWN_DATA_DELETIONS, deleteAccount } = require('../utils/accountDeletion')`. Then run `grep -n "cancelClass\|hasFutureSession\|sendEmail" routes/account.js` and remove only the imports nothing else in the file still uses.

- [ ] **Step 3: Run the suite**

Run: `npx jest --silent`
Expected: all pass. This is a refactor — a failure means the extraction changed behaviour. Read it; do not adjust the test to match.

- [ ] **Step 4: Add the admin endpoint**

In `routes/admin.js`:

```javascript
const { deleteAccount } = require('../utils/accountDeletion')

// POST /api/admin/users/:id/delete
// Irreversible, and it sits inches from Suspend, which is not — so it takes
// the user's own code typed back rather than a single click.
router.post('/users/:id/delete', async (req, res) => {
  const userId = parseInt(req.params.id)
  if (!userId) return res.status(400).json({ error: 'Invalid user id' })

  const expected = 'U' + String(userId).padStart(6, '0')
  if (req.body.confirm !== expected) {
    return res.status(400).json({ error: `Type ${expected} to confirm` })
  }

  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name, deleted_at')
      .eq('id', userId)
      .single()

    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.deleted_at) return res.status(400).json({ error: 'That account is already deleted' })

    const result = await deleteAccount(supabase, user)
    if (!result.ok) return fail(res, 500, 'Could not delete this account', result.error)

    res.json({ deleted: userId })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not delete this account' })
  }
})
```

- [ ] **Step 5: Verify and commit**

Run: `node --check routes/admin.js && node --check routes/account.js && npx jest --silent`

```bash
git add utils/accountDeletion.js routes/account.js routes/admin.js
git commit -m "Share one deletion sequence between self-service and admin"
```

- [ ] **Step 6: Merge and push the backend, then confirm the deploy**

```bash
git checkout main && git merge --no-ff <branch> -m "Merge: reporting and moderation backend" && git push origin main
```

Poll `POST /api/admin/users/1/unsuspend` with a non-admin token until it answers 403 (deployed) rather than 404 (not deployed).

---

### Task 8: Report form — category and images

**Repo:** frontend
**Files:** Modify `app/teachers/[id]/page.js`, `lib/i18n/translations.js`

**Interfaces:**
- Consumes: `POST /api/reports` accepting `{ report_type, reported_id, reason, category, evidence[] }` (Tasks 4 and 5)

- [ ] **Step 1: Add the copy in all five languages**

In `lib/i18n/translations.js`, inside the `teacher` namespace of each language block (en, ko, es, de, pt), add these keys. English shown; translate the rest. The category *values* stay English — they go to the API.

```javascript
      reportCategory: 'What happened?',
      reportCatHarassment: 'Harassment or abuse',
      reportCatInappropriate: 'Inappropriate content',
      reportCatSpam: 'Spam or a scam',
      reportCatNoShow: 'They did not show up',
      reportCatOther: 'Something else',
      reportEvidence: 'Add a screenshot (up to 3)',
      reportEvidenceTooBig: 'Each image must be under 5MB',
      reportDuplicate: 'You already have a report about this open with us',
```

- [ ] **Step 2: Add the state**

In `app/teachers/[id]/page.js`, beside the existing report state:

```javascript
  const [reportCategory, setReportCategory] = useState('harassment')
  const [reportImages, setReportImages] = useState([])
  const [reportError, setReportError] = useState('')
```

- [ ] **Step 3: Add the file reader**

```javascript
  // Read to a data URL and post as JSON, matching how avatars and class
  // materials already upload: the browser never holds a Supabase key.
  const attachImages = async event => {
    const files = [...event.target.files].slice(0, 3 - reportImages.length)
    if (!files.length) return
    setReportError('')

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setReportError(t('teacher.reportEvidenceTooBig'))
        return
      }
    }

    const encoded = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })))

    setReportImages(current => [...current, ...encoded].slice(0, 3))
  }
```

- [ ] **Step 4: Send the new fields**

In `submitReport`, change the body:

```javascript
        body: JSON.stringify({
          report_type: 'user',
          reported_id: parseInt(id),
          reason: reportReason.trim(),
          category: reportCategory,
          evidence: reportImages
        })
```

and handle the duplicate response after the fetch:

```javascript
      if (res.status === 409) {
        setReportError(t('teacher.reportDuplicate'))
        return
      }
```

- [ ] **Step 5: Render the picker and the attachments**

Inside the `{reporting && (...)}` block, above the existing textarea:

```javascript
              <label className="block text-xs font-bold text-navy mb-1">{t('teacher.reportCategory')}</label>
              <select value={reportCategory} onChange={e => setReportCategory(e.target.value)}
                className="w-full border-2 border-navy/20 rounded-xl px-3 py-2 text-sm mb-3 focus:border-brand-red focus:outline-none transition-colors">
                <option value="harassment">{t('teacher.reportCatHarassment')}</option>
                <option value="inappropriate_content">{t('teacher.reportCatInappropriate')}</option>
                <option value="spam_or_scam">{t('teacher.reportCatSpam')}</option>
                <option value="no_show">{t('teacher.reportCatNoShow')}</option>
                <option value="other">{t('teacher.reportCatOther')}</option>
              </select>
```

and below the textarea:

```javascript
              <label className="block text-xs font-bold text-navy mt-3 mb-1">{t('teacher.reportEvidence')}</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={attachImages}
                disabled={reportImages.length >= 3}
                className="text-xs text-navy/60 file:mr-3 file:rounded-full file:border-2 file:border-navy/20 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold"/>
              {reportImages.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {reportImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-navy/15"/>
                      <button onClick={() => setReportImages(imgs => imgs.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-brand-red text-white w-5 h-5 rounded-full text-xs font-bold border-2 border-white">×</button>
                    </div>
                  ))}
                </div>
              )}
              {reportError && <p className="text-brand-red text-xs mt-2 font-bold">{reportError}</p>}
```

- [ ] **Step 6: Build and commit**

Run: `npx next build`
Expected: "✓ Compiled successfully"

```bash
git add "app/teachers/[id]/page.js" lib/i18n/translations.js
git commit -m "Let a report say what happened and show it"
```

---

### Task 9: Admin queue — evidence and enforcement

**Repo:** frontend
**Files:** Modify `app/admin/page.js`

**Interfaces:**
- Consumes: `GET /api/reports` with `reported_user` (Task 6), `GET /api/reports/:id/evidence/:index` (Task 5), `POST /api/admin/users/:id/{suspend,unsuspend,delete}` (Tasks 3 and 7)

- [ ] **Step 1: Add the action functions**

Beside the existing `setReportStatus`:

```javascript
  const [confirmDelete, setConfirmDelete] = useState({})
  const [actionMessage, setActionMessage] = useState({})

  const suspendUser = async (userId, days, reason) => {
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(`${API}/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ until, reason })
    })
    const data = await res.json()
    setActionMessage(m => ({ ...m, [userId]: res.ok ? `Suspended until ${new Date(data.suspended_until).toLocaleDateString()}` : data.error }))
    fetchUsers(); fetchReports()
  }

  const unsuspendUser = async userId => {
    const res = await fetch(`${API}/api/admin/users/${userId}/unsuspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    setActionMessage(m => ({ ...m, [userId]: res.ok ? 'Suspension lifted' : 'Could not lift it' }))
    fetchUsers(); fetchReports()
  }

  const deleteUser = async userId => {
    const res = await fetch(`${API}/api/admin/users/${userId}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ confirm: confirmDelete[userId] || '' })
    })
    const data = await res.json()
    setActionMessage(m => ({ ...m, [userId]: res.ok ? 'Account deleted' : data.error }))
    if (res.ok) setConfirmDelete(c => ({ ...c, [userId]: '' }))
    fetchUsers(); fetchReports()
  }

  const openEvidence = async (reportId, index) => {
    const res = await fetch(`${API}/api/reports/${reportId}/evidence/${index}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank', 'noopener')
  }
```

- [ ] **Step 2: Add the enforcement control**

Beside `CreditControl`, so report cards and user cards can both use it:

```javascript
const CATEGORY_LABELS = {
  harassment: '🚨 Harassment',
  inappropriate_content: '⚠️ Inappropriate content',
  spam_or_scam: '💸 Spam or scam',
  no_show: '🕒 No-show',
  other: '❓ Other'
}

// Suspend is reversible and Delete is not, so they do not look alike and
// Delete does not fire on one click.
function EnforcementControl({ user, confirmText, message, onConfirmChange, onSuspend, onUnsuspend, onDelete }) {
  const code = 'U' + String(user.id).padStart(6, '0')
  const suspendedUntil = user.suspended_until && new Date(user.suspended_until) > new Date()
    ? new Date(user.suspended_until)
    : null

  return (
    <div className="mt-3 border-t border-navy/10 pt-3">
      {suspendedUntil ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-brand-red/10 text-brand-red px-3 py-1 rounded-full text-xs font-bold border-2 border-brand-red/30">
            Suspended until {suspendedUntil.toLocaleDateString()}
          </span>
          <button onClick={onUnsuspend} className="text-navy/60 hover:text-navy text-xs font-bold underline">
            Lift the suspension
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-navy text-xs">🚫 Suspend</span>
          {[7, 30, 3650].map(days => (
            <button key={days} onClick={() => onSuspend(days)}
              className="bg-white text-navy px-3 py-1 rounded-full text-xs font-bold border-2 border-navy/20 hover:border-navy transition-colors">
              {days === 3650 ? 'Permanent' : `${days} days`}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="font-display font-bold text-brand-red text-xs">🗑 Delete</span>
        <input value={confirmText || ''} onChange={onConfirmChange} placeholder={`Type ${code}`}
          className="w-32 border-2 border-navy/20 rounded-full px-3 py-1 text-xs font-mono focus:border-brand-red focus:outline-none"/>
        <button onClick={onDelete} disabled={confirmText !== code}
          className="bg-brand-red text-white px-3 py-1 rounded-full text-xs font-bold border-2 border-navy disabled:opacity-30 disabled:cursor-not-allowed">
          Delete permanently
        </button>
      </div>
      {message && <p className="text-navy/60 text-xs mt-2">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Render it on the report cards**

In the pending-reports map, replace the reported-target line with the resolved name plus the category:

```javascript
                        <p className="font-bold text-navy">
                          {report.report_type === 'user'
                            ? <>👤 {report.reported_user
                                ? `${report.reported_user.first_name} ${report.reported_user.last_name}`
                                : 'Unknown user'} <span className="font-mono text-navy/50">{userCode(report.reported_id)}</span></>
                            : <>📚 Class #{report.reported_id}</>}
                        </p>
                        <p className="text-navy/50 text-xs font-bold mt-1">{CATEGORY_LABELS[report.category] || CATEGORY_LABELS.other}</p>
```

and after the reporter line, inside the same `<div>`:

```javascript
                        {report.evidence_paths?.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {report.evidence_paths.map((_, i) => (
                              <button key={i} onClick={() => openEvidence(report.id, i)}
                                className="bg-cream text-navy px-3 py-1 rounded-full text-xs font-bold border-2 border-navy/20 hover:border-navy transition-colors">
                                📎 Evidence {i + 1}
                              </button>
                            ))}
                          </div>
                        )}
                        {report.reported_user && !report.reported_user.deleted_at && (
                          <EnforcementControl
                            user={report.reported_user}
                            confirmText={confirmDelete[report.reported_user.id]}
                            message={actionMessage[report.reported_user.id]}
                            onConfirmChange={e => setConfirmDelete(c => ({ ...c, [report.reported_user.id]: e.target.value }))}
                            onSuspend={days => suspendUser(report.reported_user.id, days, `Report #${report.id}: ${report.category}`)}
                            onUnsuspend={() => unsuspendUser(report.reported_user.id)}
                            onDelete={() => deleteUser(report.reported_user.id)}/>
                        )}
```

- [ ] **Step 4: Show suspension state in the Users tab**

In `UserDetail`'s `rows` array, add as the first entry:

```javascript
    ['Suspended', user.suspended_until && new Date(user.suspended_until) > new Date()
      ? `until ${new Date(user.suspended_until).toLocaleDateString()} — ${user.suspension_reason || 'no reason recorded'}`
      : null],
```

- [ ] **Step 5: Build and commit**

Run: `npx next build`
Expected: "✓ Compiled successfully"

```bash
git add app/admin/page.js
git commit -m "Act on a report from the dashboard"
```

- [ ] **Step 6: Merge and push the frontend**

```bash
git checkout main && git merge --no-ff <branch> -m "Merge: reporting and moderation UI" && git push origin main
```

---

### Task 10: Live verification

Unit tests cannot prove a private bucket is private or that a suspension kills a live session. These checks decide whether this is done. Each one writes real data; the last step puts it all back.

- [ ] **Step 1: File a report with evidence**

From a second real account, report a throwaway account through the UI with one screenshot attached. Confirm the row has `evidence_paths` populated and `category` set.

- [ ] **Step 2: Prove the evidence is not public**

Take the stored path and try the public URL shape:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/storage/v1/object/public/report-evidence/<path>"
```

Expected: **400 or 404, never 200.** A 200 means the bucket is public and this task has failed — go back to the migration.

Then fetch `GET /api/reports/:id/evidence/0` as an admin and confirm the signed URL loads the image.

- [ ] **Step 3: Prove a suspension kills a live session**

Mint a token for the throwaway account, confirm `GET /api/auth/me` returns 200. Suspend the account. Call `/api/auth/me` again **with the same token**.

Expected: 403 carrying `suspended_until`. A 200 means `token_valid_after` was not bumped.

- [ ] **Step 4: Prove unsuspend restores access**

Unsuspend, mint a *fresh* token (the old one is dead by design), confirm 200.

- [ ] **Step 5: Prove the duplicate guard works**

File the same report twice. Expected: 409 on the second.

- [ ] **Step 6: Prove admin delete does not strand students**

On a throwaway teacher account with one student enrolled on a future class: note the student's balance, delete the teacher through the admin endpoint, then confirm the class is cancelled and the student's balance went **up** by the refund. If it did not, `deleteAccount` is not being called.

- [ ] **Step 7: Clean up**

Delete the test report rows and their evidence objects, lift any suspension still standing, restore any balance the probes moved. Report exactly what was created and what was removed.

---

## Self-review

**Spec coverage:** categories → Task 4. Evidence, private bucket, magic bytes → Task 5. Rate limit → Task 4. Queue enrichment and severity sort → Task 6. Suspension columns, middleware, token invalidation → Tasks 1–3. Delete → Task 7. Suspension email → Task 3. Report form → Task 8. Admin UI → Task 9. Live checks → Task 10.

**One spec item deliberately dropped:** the "your report was reviewed and closed" email to the reporter. It hangs off `PATCH /api/reports/:id` and is two lines, but it mails a member every time an admin touches a status, corrections included. Add it once the queue has been used in anger and the volume is known.

**Restated as out of scope, from the spec:** appeals, automatic action at any report threshold, reporting from inside the classroom, enforcement on class reports.

**Known gap carried from the spec:** suspending a teacher does not cancel their booked classes — their students stay enrolled and unrefunded. Deleting one *does* refund, via Task 7. That asymmetry is deliberate and documented, not an oversight; the admin cancels a suspended teacher's classes by hand from the card.
