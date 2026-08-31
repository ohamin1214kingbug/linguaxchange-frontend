# University Badge and Participation Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member verify a university email address to earn a dated badge, and generate a revocable link showing the classes they have actually attended and taught.

**Architecture:** One migration adds an allowlist table and six columns to `users`. Verification copies the existing password-reset flow exactly — raw token only in the email, SHA-256 in the database, short expiry. The record is computed from `enrollments.attended` and finished class sessions, served at an unguessable token URL that is `noindex` and revocable.

**Tech Stack:** Express 5 + Supabase (backend, CommonJS, Jest); Next.js 16 App Router + React 19 + Tailwind v4 (frontend, no test runner); Resend for email via `utils/mailer.js`.

**Spec:** `docs/superpowers/specs/2026-08-31-university-badge-and-record-design.md` (this repo)

## Global Constraints

- **Two repositories.** Backend `/Users/kinghamin/linguaxchange-backend`, frontend `/Users/kinghamin/linguaxchange-frontend`. Every path below is prefixed `backend:` or `frontend:`. Commit in the repo the files belong to.
- **Never commit unless explicitly asked.** Never `git commit --amend`; always a new commit.
- **Backend tests are pure-function unit tests only.** No supertest, no test DB, no HTTP-level tests. Logic worth testing goes in `utils/` and is tested there, matching `tests/reports.test.js`. Do not introduce a new framework.
- **Frontend has no test runner.** Verification is `npm run build` plus browser checks. Do not add Jest, Vitest or Playwright.
- **Run the backend suite as `TZ=UTC npx jest`.** `tests/sessionDates.test.js` is timezone-dependent by design. Baseline before this plan: 30 suites, 184 tests.
- **No new paid service.** Email goes through the existing Resend integration. Never use Twilio for this — it charges per message.
- **Domain matching is equality on the full domain, never a suffix test.** `endsWith('ucm.es')` would accept `attacker@ucm.es.evil.com`.
- **The raw verification token is never stored.** Only its SHA-256 hash, exactly as `routes/auth.js:312` does for password reset.
- **API base URL on the frontend** is the literal `https://linguaxchange-backend-production.up.railway.app`, declared per-file as `const API = ...`.
- **Token TTL:** 24 hours (`24 * 60 * 60 * 1000` ms).

---

### Task 1: Migration for the allowlist and user columns

Foundation for every later task. No unit test — this is schema, verified by querying it.

**Files:**
- Create: `backend:migrations/add_university_and_records.sql`

**Interfaces:**
- Consumes: nothing
- Produces: table `university_domains(domain, name, created_at)` and `users` columns `university_email`, `university_domain`, `university_verified_at`, `university_token`, `university_token_expires`, `record_token` — read by Tasks 4, 5, 10

- [ ] **Step 1: Write the migration**

```sql
-- Allowlist of university email domains. A badge means exactly as much as the
-- care taken adding rows here, which is why this is a curated table rather
-- than a pattern match on the address.
create table if not exists university_domains (
  domain text primary key,        -- 'ucm.es', lowercase, no leading @
  name text not null,             -- 'Universidad Complutense de Madrid'
  created_at timestamptz not null default now()
);

alter table university_domains enable row level security;

alter table users add column if not exists university_email text;
alter table users add column if not exists university_domain text;
alter table users add column if not exists university_verified_at timestamptz;
alter table users add column if not exists university_token text;
alter table users add column if not exists university_token_expires timestamptz;
alter table users add column if not exists record_token text;

-- Partial indexes: NULL is the normal state for both columns, and a plain
-- unique constraint would index every NULL for nothing.
create unique index if not exists users_university_email_key
  on users (university_email) where university_email is not null;

create unique index if not exists users_record_token_key
  on users (record_token) where record_token is not null;

insert into university_domains (domain, name)
values ('ucm.es', 'Universidad Complutense de Madrid')
on conflict (domain) do nothing;
```

- [ ] **Step 2: Run it**

Paste into the Supabase SQL editor and run. The repo owner does this — never ask for the database password or connection string.

- [ ] **Step 3: Verify**

```sql
select column_name from information_schema.columns
where table_name = 'users'
  and (column_name like 'university%' or column_name = 'record_token');
```

Expected: six rows — `university_email`, `university_domain`, `university_verified_at`, `university_token`, `university_token_expires`, `record_token`.

```sql
select * from university_domains;
```

Expected: one row, `ucm.es` / `Universidad Complutense de Madrid`.

- [ ] **Step 4: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add migrations/add_university_and_records.sql
git commit -m "Add university domain allowlist and record columns"
```

---

### Task 2: Domain matching helper

The security-critical piece. A wrong match issues a badge asserting someone attends a university they do not.

**Files:**
- Create: `backend:utils/universityDomains.js`
- Create: `backend:tests/universityDomains.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `matchDomain(email, allowlist) -> { domain, name } | null`, where `allowlist` is an array of `{ domain, name }`. Consumed by Task 4.

- [ ] **Step 1: Write the failing test**

Create `backend:tests/universityDomains.test.js`:

```js
const { matchDomain } = require('../utils/universityDomains')

const allowlist = [
  { domain: 'ucm.es', name: 'Universidad Complutense de Madrid' },
  { domain: 'estudiantes.ucm.es', name: 'Universidad Complutense de Madrid (estudiantes)' },
]

describe('matchDomain', () => {
  test('matches a listed domain', () => {
    expect(matchDomain('hamin@ucm.es', allowlist).name).toBe('Universidad Complutense de Madrid')
  })

  test('is case-insensitive across the whole address', () => {
    expect(matchDomain('Student@UCM.ES', allowlist)?.domain).toBe('ucm.es')
    expect(matchDomain('STUDENT@Ucm.Es', allowlist)?.domain).toBe('ucm.es')
  })

  test('rejects a domain that merely ends with a listed one', () => {
    // The whole reason this is equality and not endsWith: evil.com controls
    // this address, and accepting it would issue a badge saying the holder
    // studies at Complutense.
    expect(matchDomain('attacker@ucm.es.evil.com', allowlist)).toBe(null)
    expect(matchDomain('attacker@notucm.es', allowlist)).toBe(null)
  })

  test('treats a subdomain as its own entry', () => {
    expect(matchDomain('a@estudiantes.ucm.es', allowlist)?.domain).toBe('estudiantes.ucm.es')
    expect(matchDomain('a@alumnos.ucm.es', allowlist)).toBe(null)
  })

  test('splits on the last @ so a quoted local part cannot spoof the domain', () => {
    expect(matchDomain('"weird@ucm.es"@evil.com', allowlist)).toBe(null)
  })

  test('rejects malformed input without throwing', () => {
    for (const bad of ['', 'no-at-sign', '@ucm.es', 'name@', null, undefined, 42, {}]) {
      expect(matchDomain(bad, allowlist)).toBe(null)
    }
  })

  test('rejects everything when the allowlist is empty or missing', () => {
    expect(matchDomain('hamin@ucm.es', [])).toBe(null)
    expect(matchDomain('hamin@ucm.es', undefined)).toBe(null)
  })

  test('trims surrounding whitespace', () => {
    expect(matchDomain('  hamin@ucm.es  ', allowlist)?.domain).toBe('ucm.es')
  })
})
```

- [ ] **Step 2: Run it and confirm it FAILS**

```bash
cd /Users/kinghamin/linguaxchange-backend && npx jest tests/universityDomains.test.js
```

Expected: FAIL — `Cannot find module '../utils/universityDomains'`. Report the actual output.

- [ ] **Step 3: Write the implementation**

Create `backend:utils/universityDomains.js`:

```js
// Matches an email address against the allowlist of university domains.
//
// Equality on the full domain, never a suffix test. endsWith('ucm.es') would
// accept attacker@ucm.es.evil.com — a domain the attacker controls — and the
// badge issued from it would assert the holder studies at Complutense.
//
// Split on the LAST @: a quoted local part may legally contain one, and
// splitting on the first would read the wrong side as the domain.
function matchDomain(email, allowlist) {
  if (typeof email !== 'string' || !Array.isArray(allowlist)) return null

  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at <= 0) return null

  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (!local || !domain) return null

  return allowlist.find(entry => entry?.domain?.toLowerCase() === domain) || null
}

module.exports = { matchDomain }
```

- [ ] **Step 4: Run it and confirm it PASSES**

```bash
npx jest tests/universityDomains.test.js
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add utils/universityDomains.js tests/universityDomains.test.js
git commit -m "Match university email domains by equality, not suffix"
```

---

### Task 3: Participation summary helper

**Files:**
- Create: `backend:utils/participation.js`
- Create: `backend:tests/participation.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `summarise({ attended, taught }) -> { attendedCount, taughtCount, attendedMinutes, taughtMinutes, languages, levels, firstActivity, lastActivity }`. `attended` and `taught` are arrays of `{ language_code, level, duration_minutes, date }` where `date` is an ISO string. Consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `backend:tests/participation.test.js`:

```js
const { summarise } = require('../utils/participation')

const a = (extra = {}) => ({
  language_code: 'ES', level: 'A1', duration_minutes: 60,
  date: '2026-09-01T17:00:00.000Z', ...extra,
})

describe('summarise', () => {
  test('counts attended and taught separately', () => {
    const r = summarise({ attended: [a(), a()], taught: [a()] })
    expect(r.attendedCount).toBe(2)
    expect(r.taughtCount).toBe(1)
  })

  test('sums minutes from duration_minutes', () => {
    const r = summarise({ attended: [a({ duration_minutes: 60 }), a({ duration_minutes: 90 })], taught: [] })
    expect(r.attendedMinutes).toBe(150)
  })

  test('counts a missing duration as zero rather than NaN', () => {
    const r = summarise({ attended: [a({ duration_minutes: null }), a({ duration_minutes: 60 })], taught: [] })
    expect(r.attendedMinutes).toBe(60)
  })

  test('lists distinct languages and levels across both sides', () => {
    const r = summarise({
      attended: [a({ language_code: 'ES', level: 'A1' }), a({ language_code: 'ES', level: 'A1' })],
      taught: [a({ language_code: 'KO', level: 'B1' })],
    })
    expect(r.languages.sort()).toEqual(['ES', 'KO'])
    expect(r.levels.sort()).toEqual(['A1', 'B1'])
  })

  test('reports the first and last activity across both sides', () => {
    const r = summarise({
      attended: [a({ date: '2026-09-10T17:00:00.000Z' })],
      taught: [a({ date: '2026-08-01T17:00:00.000Z' })],
    })
    expect(r.firstActivity).toBe('2026-08-01T17:00:00.000Z')
    expect(r.lastActivity).toBe('2026-09-10T17:00:00.000Z')
  })

  test('returns zeroes and nulls for someone with no activity', () => {
    expect(summarise({ attended: [], taught: [] })).toEqual({
      attendedCount: 0, taughtCount: 0,
      attendedMinutes: 0, taughtMinutes: 0,
      languages: [], levels: [],
      firstActivity: null, lastActivity: null,
    })
  })

  test('tolerates missing arrays', () => {
    expect(summarise({}).attendedCount).toBe(0)
    expect(summarise().taughtCount).toBe(0)
  })

  test('ignores rows with no usable date when picking the range', () => {
    const r = summarise({ attended: [a({ date: null }), a({ date: '2026-09-05T17:00:00.000Z' })], taught: [] })
    expect(r.firstActivity).toBe('2026-09-05T17:00:00.000Z')
    expect(r.lastActivity).toBe('2026-09-05T17:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run it and confirm it FAILS**

```bash
cd /Users/kinghamin/linguaxchange-backend && npx jest tests/participation.test.js
```

Expected: FAIL — `Cannot find module '../utils/participation'`.

- [ ] **Step 3: Write the implementation**

Create `backend:utils/participation.js`:

```js
// Counts what the site can prove about a member: classes attended and classes
// taught. Nothing self-declared appears in a record, because the record's only
// value is that a third party can trust it.

const minutes = rows =>
  rows.reduce((total, row) => total + (Number(row?.duration_minutes) || 0), 0)

const distinct = (rows, key) =>
  [...new Set(rows.map(row => row?.[key]).filter(Boolean))]

function summarise({ attended = [], taught = [] } = {}) {
  const all = [...attended, ...taught]

  // A row with no date still counts toward totals — it happened — but cannot
  // bound the range, so it is skipped here rather than turning the range into
  // an Invalid Date.
  const times = all
    .map(row => row?.date)
    .filter(Boolean)
    .map(date => new Date(date).getTime())
    .filter(time => !Number.isNaN(time))

  return {
    attendedCount: attended.length,
    taughtCount: taught.length,
    attendedMinutes: minutes(attended),
    taughtMinutes: minutes(taught),
    languages: distinct(all, 'language_code'),
    levels: distinct(all, 'level'),
    firstActivity: times.length ? new Date(Math.min(...times)).toISOString() : null,
    lastActivity: times.length ? new Date(Math.max(...times)).toISOString() : null,
  }
}

module.exports = { summarise }
```

- [ ] **Step 4: Run it and confirm it PASSES**

```bash
npx jest tests/participation.test.js
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Run the whole suite**

```bash
TZ=UTC npx jest
```

Expected: 32 suites, 200 tests passing (184 before, plus 8 and 8).

- [ ] **Step 6: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add utils/participation.js tests/participation.test.js
git commit -m "Summarise only the participation the site can prove"
```

---

### Task 4: University verification routes

**Files:**
- Create: `backend:routes/university.js`
- Modify: `backend:middleware/rateLimit.js`
- Modify: `backend:index.js`

**Interfaces:**
- Consumes: `matchDomain` from Task 2; `sendEmail({ to, subject, text })` from `utils/mailer.js`; `requireAuth` from `middleware/auth.js`
- Produces: `GET /api/university/domains`, `POST /api/university/verify`, `POST /api/university/confirm` — consumed by Tasks 7 and 8

- [ ] **Step 1: Add the rate limiter**

In `backend:middleware/rateLimit.js`, add before `module.exports`:

```js
// Sending has no per-message cost on the current Resend plan, but the monthly
// allowance is finite and an unthrottled send endpoint is a spam relay pointed
// at arbitrary addresses. Same shape as otpSendLimiter.
const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification emails requested. Please try again later.' }
})
```

Change the export to:

```js
module.exports = { loginLimiter, registerLimiter, otpSendLimiter, otpCheckLimiter, publicGetLimiter, verifyEmailLimiter }
```

- [ ] **Step 2: Write the route file**

Create `backend:routes/university.js`:

```js
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { requireAuth } = require('../middleware/auth')
const { verifyEmailLimiter, publicGetLimiter } = require('../middleware/rateLimit')
const { matchDomain } = require('../utils/universityDomains')
const { sendEmail } = require('../utils/mailer')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const FRONTEND_URL = 'https://linguaxchange-frontend.vercel.app'
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

// GET /api/university/domains — which universities can be verified. Public:
// the settings page shows it before anyone submits anything.
router.get('/domains', publicGetLimiter, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('university_domains')
      .select('domain, name')
      .order('name')
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not fetch universities' })
  }
})

// POST /api/university/verify — send a confirmation link.
//
// The response never reveals whether the address already belongs to another
// account. Otherwise this becomes a way to test which university addresses
// have accounts here — the same enumeration the password-reset flow refuses.
router.post('/verify', requireAuth, verifyEmailLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const genericResponse = { message: 'If that address can be verified, a confirmation email has been sent.' }

  try {
    const { data: allowlist } = await supabase
      .from('university_domains')
      .select('domain, name')

    const matched = matchDomain(email, allowlist || [])
    // An unknown domain is the one case worth naming: the member needs to know
    // to ask for their university rather than assume the site is broken.
    if (!matched) {
      return res.status(400).json({ error: 'That university is not supported yet. Ask us to add it.' })
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('university_email', email)
      .maybeSingle()
    if (existing && existing.id !== req.userId) return res.json(genericResponse)

    const rawToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    const { error } = await supabase
      .from('users')
      .update({
        university_email: email,
        university_token: hashedToken,
        university_token_expires: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      })
      .eq('id', req.userId)
    if (error) return res.status(400).json({ error: error.message })

    await sendEmail({
      to: email,
      subject: 'Confirm your university email — LinguaXchange',
      text: `Confirm that this address belongs to you: ${FRONTEND_URL}/university/confirm?token=${rawToken}\n\nThis link expires in 24 hours. If you didn't ask for this, you can ignore this email.`
    })

    res.json(genericResponse)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not send the confirmation email' })
  }
})

// POST /api/university/confirm — redeem the token. Public, because the person
// clicking the link may not be signed in on that device. The token is the
// credential.
router.post('/confirm', async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token : ''
  if (!token) return res.status(400).json({ error: 'Missing token' })

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const { data: user } = await supabase
      .from('users')
      .select('id, university_email, university_token_expires')
      .eq('university_token', hashedToken)
      .maybeSingle()

    if (!user || !user.university_token_expires || new Date(user.university_token_expires) < new Date()) {
      return res.status(400).json({ error: 'That link is invalid or has expired.' })
    }

    const domain = user.university_email.slice(user.university_email.lastIndexOf('@') + 1)
    const { data: uni } = await supabase
      .from('university_domains')
      .select('name')
      .eq('domain', domain)
      .maybeSingle()

    const { error } = await supabase
      .from('users')
      .update({
        university_domain: domain,
        university_verified_at: new Date().toISOString(),
        university_token: null,
        university_token_expires: null,
      })
      .eq('id', user.id)
    if (error) return res.status(400).json({ error: error.message })

    res.json({ success: true, university: uni?.name || domain })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not confirm that address' })
  }
})

module.exports = router
```

- [ ] **Step 3: Mount it**

In `backend:index.js`, alongside the other route requires:

```js
const universityRoutes = require('./routes/university')
```

and alongside the other mounts:

```js
app.use('/api/university', universityRoutes)
```

- [ ] **Step 4: Verify the routes respond**

```bash
cd /Users/kinghamin/linguaxchange-backend && PORT=3001 node index.js
```

In another terminal — read-only or auth rejections, no writes:

```bash
curl -s -i http://localhost:3001/api/university/domains
```
Expected: `200` with `[{"domain":"ucm.es","name":"Universidad Complutense de Madrid"}]`.

```bash
curl -s -i -X POST http://localhost:3001/api/university/verify -H 'Content-Type: application/json' -d '{"email":"a@ucm.es"}'
```
Expected: `401` — sending requires a signed-in user.

```bash
curl -s -i -X POST http://localhost:3001/api/university/confirm -H 'Content-Type: application/json' -d '{"token":"nonsense"}'
```
Expected: `400` with `{"error":"That link is invalid or has expired."}` — importantly NOT a 500.

Stop the server and confirm it is stopped.

- [ ] **Step 5: Run the suite**

```bash
TZ=UTC npx jest
```

Expected: 32 suites, 200 tests passing. This task adds no tests: there is no HTTP-level test infrastructure and you must not add any.

- [ ] **Step 6: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add routes/university.js middleware/rateLimit.js index.js
git commit -m "Add university email verification"
```

---

### Task 5: Record routes

**Files:**
- Create: `backend:routes/records.js`
- Modify: `backend:index.js`

**Interfaces:**
- Consumes: `summarise` from Task 3; `requireAuth`
- Produces: `POST /api/records/share`, `DELETE /api/records/share`, `GET /api/records/:token`. The GET returns `{ name, university, verifiedAt, generatedAt, attendedCount, taughtCount, attendedMinutes, taughtMinutes, languages, levels, firstActivity, lastActivity }` — consumed by Tasks 7 and 9.

- [ ] **Step 1: Write the route file**

Create `backend:routes/records.js`:

```js
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { requireAuth } = require('../middleware/auth')
const { publicGetLimiter } = require('../middleware/rateLimit')
const { summarise } = require('../utils/participation')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// POST /api/records/share — create the link, or rotate it.
//
// Rotating is the revoke: a new token invalidates every link already shared,
// which is the only control a member has once a URL has left their hands.
router.post('/share', requireAuth, async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex')
    const { error } = await supabase
      .from('users')
      .update({ record_token: token })
      .eq('id', req.userId)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ token })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not create the link' })
  }
})

router.delete('/share', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ record_token: null })
      .eq('id', req.userId)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not revoke the link' })
  }
})

// GET /api/records/:token — the record itself.
//
// Unauthenticated on purpose: the point is handing this to a university office
// that has no account. The token is the credential, so it is 32 random bytes,
// and a wrong one is a flat 404 with no hint that some other token would work.
router.get('/:token', publicGetLimiter, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, first_name, last_name, university_domain, university_verified_at')
      .eq('record_token', req.params.token)
      .maybeSingle()

    if (!user) return res.status(404).json({ error: 'Record not found' })

    // Attended: exactly what the confirm-attendance flow sets. Not "joined" —
    // joining proves nothing happened.
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('attended, class_sessions(session_date, classes(language_code, level, duration_minutes))')
      .eq('student_id', user.id)
      .eq('attended', true)

    // Taught: the teacher's own sessions that have already finished. Not
    // classes.status = 'completed' — that needs a manual admin action almost
    // nothing triggers, so a record built on it would under-count everyone.
    const { data: taughtClasses } = await supabase
      .from('classes')
      .select('language_code, level, duration_minutes, class_sessions(session_date, status)')
      .eq('teacher_id', user.id)

    const now = Date.now()

    const attended = (enrollments || []).map(e => ({
      language_code: e.class_sessions?.classes?.language_code,
      level: e.class_sessions?.classes?.level,
      duration_minutes: e.class_sessions?.classes?.duration_minutes,
      date: e.class_sessions?.session_date,
    }))

    const taught = (taughtClasses || []).flatMap(c =>
      (c.class_sessions || [])
        .filter(s => s.status !== 'cancelled' && new Date(s.session_date).getTime() < now)
        .map(s => ({
          language_code: c.language_code,
          level: c.level,
          duration_minutes: c.duration_minutes,
          date: s.session_date,
        }))
    )

    let university = null
    if (user.university_domain) {
      const { data: uni } = await supabase
        .from('university_domains')
        .select('name')
        .eq('domain', user.university_domain)
        .maybeSingle()
      university = uni?.name || user.university_domain
    }

    res.json({
      // The member chose to share this, and the full name is what makes it
      // usable on a CV. The email address is never included.
      name: `${user.first_name} ${user.last_name}`.trim(),
      university,
      verifiedAt: user.university_verified_at,
      generatedAt: new Date().toISOString(),
      ...summarise({ attended, taught }),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not load the record' })
  }
})

module.exports = router
```

- [ ] **Step 2: Mount it**

In `backend:index.js`:

```js
const recordRoutes = require('./routes/records')
```

```js
app.use('/api/records', recordRoutes)
```

- [ ] **Step 3: Verify**

```bash
cd /Users/kinghamin/linguaxchange-backend && PORT=3001 node index.js
```

```bash
curl -s -i http://localhost:3001/api/records/definitely-not-a-real-token
```
Expected: `404` with `{"error":"Record not found"}`.

```bash
curl -s -i -X POST http://localhost:3001/api/records/share
```
Expected: `401`.

Stop the server. Confirm it is stopped.

- [ ] **Step 4: Run the suite**

```bash
TZ=UTC npx jest
```

Expected: 32 suites, 200 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add routes/records.js index.js
git commit -m "Serve a participation record at a revocable token URL"
```

---

### Task 6: Translations

All five languages together, so no page ships with a missing key — an absent key does not throw, it renders as the raw key string on a live page.

**Files:**
- Modify: `frontend:lib/i18n/translations.js`

**Interfaces:**
- Consumes: nothing
- Produces: the `university.*` key namespace, consumed by Tasks 7 and 8

- [ ] **Step 1: Insert a `university` block into each language**

The file has five top-level blocks whose openers `  EN: {`, `  KO: {`, `  ES: {`, `  DE: {`, `  PT: {` are each unique. Several languages share identical string *values* (`langKorean` is `'Coreano'` in both ES and PT), so anchor on the openers, never on values. Edit bottom-up (PT, DE, ES, KO, EN) so line numbers for unedited blocks stay valid, assert each anchor is found exactly once, and write nothing if any assertion fails.

Insert immediately after each opener:

EN:
```js
    university: {
      title: 'University',
      subtitle: 'Verify a university email to show a badge on your profile.',
      emailLabel: 'University email address',
      send: 'Send confirmation email',
      sending: 'Sending…',
      sent: 'Check your university inbox for the confirmation link.',
      verifiedAt: 'Verified {date}',
      confirming: 'Confirming…',
      confirmed: 'Verified. Your badge is on your profile.',
      confirmFailed: 'That link is invalid or has expired.',
      recordTitle: 'Participation record',
      recordSubtitle: 'A link showing the classes you have attended and taught. Anyone with the link can open it.',
      recordCreate: 'Create share link',
      recordCopy: 'Copy link',
      recordCopied: 'Copied',
      recordRotate: 'Replace link',
      recordRevoke: 'Revoke link',
      recordRotateNote: 'Replacing the link stops the old one working.',
    },
```

KO:
```js
    university: {
      title: '대학교',
      subtitle: '대학교 이메일을 인증하면 프로필에 배지가 표시돼요.',
      emailLabel: '대학교 이메일 주소',
      send: '인증 메일 보내기',
      sending: '보내는 중…',
      sent: '대학교 메일함에서 인증 링크를 확인하세요.',
      verifiedAt: '{date} 인증됨',
      confirming: '확인 중…',
      confirmed: '인증됐어요. 프로필에 배지가 표시됩니다.',
      confirmFailed: '유효하지 않거나 만료된 링크예요.',
      recordTitle: '활동 기록',
      recordSubtitle: '들은 수업과 가르친 수업을 보여주는 링크예요. 링크가 있으면 누구나 볼 수 있어요.',
      recordCreate: '공유 링크 만들기',
      recordCopy: '링크 복사',
      recordCopied: '복사됨',
      recordRotate: '링크 새로 만들기',
      recordRevoke: '링크 해제',
      recordRotateNote: '링크를 새로 만들면 이전 링크는 작동하지 않아요.',
    },
```

ES:
```js
    university: {
      title: 'Universidad',
      subtitle: 'Verifica un correo universitario para mostrar una insignia en tu perfil.',
      emailLabel: 'Correo universitario',
      send: 'Enviar correo de confirmación',
      sending: 'Enviando…',
      sent: 'Revisa tu correo universitario para encontrar el enlace.',
      verifiedAt: 'Verificado el {date}',
      confirming: 'Confirmando…',
      confirmed: 'Verificado. Tu insignia ya aparece en tu perfil.',
      confirmFailed: 'Ese enlace no es válido o ha caducado.',
      recordTitle: 'Registro de participación',
      recordSubtitle: 'Un enlace con las clases a las que has asistido y las que has impartido. Cualquiera con el enlace puede abrirlo.',
      recordCreate: 'Crear enlace',
      recordCopy: 'Copiar enlace',
      recordCopied: 'Copiado',
      recordRotate: 'Cambiar enlace',
      recordRevoke: 'Anular enlace',
      recordRotateNote: 'Al cambiar el enlace, el anterior deja de funcionar.',
    },
```

DE:
```js
    university: {
      title: 'Universität',
      subtitle: 'Bestätige eine Hochschul-E-Mail, um ein Abzeichen im Profil zu zeigen.',
      emailLabel: 'Hochschul-E-Mail-Adresse',
      send: 'Bestätigungsmail senden',
      sending: 'Wird gesendet…',
      sent: 'Der Bestätigungslink liegt in deinem Hochschulpostfach.',
      verifiedAt: 'Bestätigt am {date}',
      confirming: 'Wird bestätigt…',
      confirmed: 'Bestätigt. Dein Abzeichen ist im Profil.',
      confirmFailed: 'Dieser Link ist ungültig oder abgelaufen.',
      recordTitle: 'Teilnahmenachweis',
      recordSubtitle: 'Ein Link mit den Kursen, die du besucht und gegeben hast. Wer den Link hat, kann ihn öffnen.',
      recordCreate: 'Link erstellen',
      recordCopy: 'Link kopieren',
      recordCopied: 'Kopiert',
      recordRotate: 'Link ersetzen',
      recordRevoke: 'Link widerrufen',
      recordRotateNote: 'Ein neuer Link macht den alten unbrauchbar.',
    },
```

PT:
```js
    university: {
      title: 'Universidade',
      subtitle: 'Verifique um e-mail universitário para mostrar um selo no seu perfil.',
      emailLabel: 'E-mail universitário',
      send: 'Enviar e-mail de confirmação',
      sending: 'Enviando…',
      sent: 'Procure o link de confirmação no seu e-mail universitário.',
      verifiedAt: 'Verificado em {date}',
      confirming: 'Confirmando…',
      confirmed: 'Verificado. O selo já aparece no seu perfil.',
      confirmFailed: 'Esse link é inválido ou expirou.',
      recordTitle: 'Registro de participação',
      recordSubtitle: 'Um link com as aulas que você assistiu e deu. Qualquer pessoa com o link pode abrir.',
      recordCreate: 'Criar link',
      recordCopy: 'Copiar link',
      recordCopied: 'Copiado',
      recordRotate: 'Trocar link',
      recordRevoke: 'Revogar link',
      recordRotateNote: 'Trocar o link faz o anterior parar de funcionar.',
    },
```

- [ ] **Step 2: Verify structurally, not by grepping text**

A missing key does not throw — it renders as the raw key on a live page — so check the parsed object. The file is ESM in a package without `"type": "module"`, so copy it verbatim to a `.mjs`, import that, and delete the copy:

```bash
cd /Users/kinghamin/linguaxchange-frontend
cp lib/i18n/translations.js /tmp/t.mjs
node --input-type=module -e "
import { translations } from '/tmp/t.mjs';
const keys = ['title','subtitle','emailLabel','send','sending','sent','verifiedAt','confirming','confirmed','confirmFailed','recordTitle','recordSubtitle','recordCreate','recordCopy','recordCopied','recordRotate','recordRevoke','recordRotateNote'];
let n = 0, bad = 0;
for (const l of ['EN','KO','ES','DE','PT']) for (const k of keys) {
  if (translations[l]?.university?.[k]) n++; else { console.log('MISSING', l, k); bad++; }
}
console.log(n + ' present, ' + bad + ' missing');
console.log('KO:', translations.KO.university.title, '| PT:', translations.PT.university.title);
"
rm -f /tmp/t.mjs
```

Expected: `90 present, 0 missing`, and the KO/PT titles printed as `대학교` and `Universidade` — proving no language received another's text.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add lib/i18n/translations.js
git commit -m "Add university and record translations"
```

---

### Task 7: Settings — verify and share

**Files:**
- Modify: `frontend:app/settings/page.js`

**Interfaces:**
- Consumes: `GET /api/university/domains`, `POST /api/university/verify` (Task 4); `POST` and `DELETE /api/records/share` (Task 5); `university.*` keys (Task 6)
- Produces: nothing downstream

- [ ] **Step 1: Add the tab**

`app/settings/page.js:228` renders the tab bar from an array. Add an entry after the `prefs` line:

```js
            { key: 'university', label: 'university.title' },
```

- [ ] **Step 2: Add state**

Alongside the other `useState` calls:

```js
  const [uniEmail, setUniEmail] = useState('')
  const [uniDomains, setUniDomains] = useState([])
  const [uniBusy, setUniBusy] = useState(false)
  const [uniMessage, setUniMessage] = useState('')
  const [recordToken, setRecordToken] = useState(null)
  const [copied, setCopied] = useState(false)
```

Add to the existing mount `useEffect`:

```js
    fetch(`${API}/api/university/domains`)
      .then(r => r.json())
      .then(d => setUniDomains(Array.isArray(d) ? d : []))
      .catch(e => console.warn('universities: could not load', e.message))
```

- [ ] **Step 3: Add the handlers**

Alongside the other handlers in the component:

```js
  // Not every failure comes back as JSON — a proxy error page is HTML, and
  // res.json() then throws, losing the real status.
  const readError = async (res, fallback) => {
    const data = await res.json().catch(() => ({}))
    return data.error || `${fallback} (HTTP ${res.status})`
  }

  const sendUniVerification = async () => {
    setUniBusy(true)
    setUniMessage('')
    try {
      const res = await fetch(`${API}/api/university/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uniEmail }),
      })
      setUniMessage(res.ok ? t('university.sent') : await readError(res, 'Could not send'))
    } catch (e) {
      setUniMessage('Could not send')
    } finally {
      setUniBusy(false)
    }
  }

  const createRecordLink = async () => {
    try {
      const res = await fetch(`${API}/api/records/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (!res.ok) { setUniMessage(await readError(res, 'Could not create the link')); return }
      const data = await res.json()
      setRecordToken(data.token)
      setCopied(false)
    } catch (e) { setUniMessage('Could not create the link') }
  }

  const revokeRecordLink = async () => {
    try {
      const res = await fetch(`${API}/api/records/share`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (!res.ok) { setUniMessage(await readError(res, 'Could not revoke the link')); return }
      setRecordToken(null)
    } catch (e) { setUniMessage('Could not revoke the link') }
  }
```

- [ ] **Step 4: Add the panel**

After the last existing `{tab === '...' && ( ... )}` block:

```jsx
        {tab === 'university' && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-navy/15 rounded-xl p-5">
              <p className="font-display font-bold text-navy mb-1">{t('university.title')}</p>
              <p className="text-navy/60 text-sm mb-4">{t('university.subtitle')}</p>

              {user.university_verified_at ? (
                <p className="text-brand-teal font-bold text-sm">
                  🎓 {user.university_domain} · {t('university.verifiedAt', {
                    date: new Date(user.university_verified_at).toLocaleDateString()
                  })}
                </p>
              ) : (
                <>
                  <label className="block text-navy/70 text-sm font-bold mb-1">{t('university.emailLabel')}</label>
                  <input type="email" value={uniEmail} onChange={e => setUniEmail(e.target.value)}
                    placeholder={uniDomains[0] ? `you@${uniDomains[0].domain}` : ''}
                    className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-sm mb-3 focus:border-brand-red focus:outline-none"/>
                  <button onClick={sendUniVerification} disabled={uniBusy || !uniEmail.trim()}
                    className="bg-brand-red text-white px-5 py-2 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-50 hover:bg-brand-red-dark transition-colors">
                    {uniBusy ? t('university.sending') : t('university.send')}
                  </button>
                  {/* Naming the supported universities up front saves someone
                      typing an address that can never work. */}
                  {uniDomains.length > 0 && (
                    <p className="text-navy/40 text-xs mt-3">{uniDomains.map(d => d.name).join(' · ')}</p>
                  )}
                </>
              )}
              {uniMessage && <p className="text-navy/60 text-sm mt-3">{uniMessage}</p>}
            </div>

            <div className="bg-white border-2 border-navy/15 rounded-xl p-5">
              <p className="font-display font-bold text-navy mb-1">{t('university.recordTitle')}</p>
              <p className="text-navy/60 text-sm mb-4">{t('university.recordSubtitle')}</p>

              {recordToken ? (
                <>
                  <input readOnly value={`${window.location.origin}/record/${recordToken}`}
                    onFocus={e => e.target.select()}
                    className="w-full border-2 border-navy/20 rounded-full px-4 py-2 text-xs mb-3 text-navy/70"/>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}/record/${recordToken}`)
                      setCopied(true)
                    }}
                      className="bg-navy text-white px-4 py-2 rounded-full text-sm font-bold border-2 border-navy">
                      {copied ? t('university.recordCopied') : t('university.recordCopy')}
                    </button>
                    <button onClick={createRecordLink}
                      className="bg-white text-navy px-4 py-2 rounded-full text-sm font-bold border-2 border-navy/30 hover:border-navy">
                      {t('university.recordRotate')}
                    </button>
                    <button onClick={revokeRecordLink}
                      className="text-brand-red text-sm font-bold hover:underline px-2">
                      {t('university.recordRevoke')}
                    </button>
                  </div>
                  <p className="text-navy/40 text-xs mt-3">{t('university.recordRotateNote')}</p>
                </>
              ) : (
                <button onClick={createRecordLink}
                  className="bg-brand-red text-white px-5 py-2 rounded-full text-sm font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
                  {t('university.recordCreate')}
                </button>
              )}
            </div>
          </div>
        )}
```

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 6: Verify what you can**

Start the dev server with `preview_start` using the `linguaxchange-frontend` entry in `.claude/launch.json`. If port 3000 is occupied by a process you did not start, do NOT kill it — use another port.

You cannot sign in (no credentials, and you must not obtain any), so `/settings` redirects to login. Verify what is verifiable and state plainly what is not:

1. `npm run build` proves the JSX compiles.
2. Navigate to `/settings`; report the redirect.
3. `read_console_messages` — confirm no React error from the new code.
4. Confirm the allowlist is readable unauthenticated:
   `curl -s https://linguaxchange-backend-production.up.railway.app/api/university/domains`

Do NOT attempt to authenticate, create credentials, or read `.env`.

- [ ] **Step 7: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add app/settings/page.js
git commit -m "Add university verification and record sharing to settings"
```

---

### Task 8: The confirm page

**Files:**
- Create: `frontend:app/university/confirm/page.js`

**Interfaces:**
- Consumes: `POST /api/university/confirm` (Task 4); `university.*` keys (Task 6)
- Produces: the `/university/confirm` route, linked from the verification email

- [ ] **Step 1: Write the page**

Create `frontend:app/university/confirm/page.js`:

```jsx
'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../../../lib/i18n/LanguageContext'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function ConfirmUniversity() {
  const { t } = useLanguage()
  const [state, setState] = useState('working')
  const [university, setUniversity] = useState('')

  useEffect(() => {
    // Read off window.location rather than useSearchParams(), which would drag
    // a Suspense boundary into an otherwise plain client page — the same call
    // the class creation page makes.
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setState('failed'); return }

    fetch(`${API}/api/university/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setState('failed'); return }
        setUniversity(data.university || '')
        setState('done')
      })
      .catch(() => setState('failed'))
  }, [])

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center px-4 md:px-8 py-4 border-b border-navy/10 bg-white">
        <a href="/" className="font-display font-bold text-lg text-navy">Lingua<span className="text-brand-red">Xchange</span></a>
      </nav>
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="font-display font-extrabold text-2xl text-navy mb-3">
          {state === 'working' && t('university.confirming')}
          {state === 'done' && t('university.confirmed')}
          {state === 'failed' && t('university.confirmFailed')}
        </p>
        {state === 'done' && university && (
          <p className="text-navy/60 mb-6">🎓 {university}</p>
        )}
        {state !== 'working' && (
          <a href="/profile" className="inline-block bg-brand-red text-white px-6 py-3 rounded-full font-bold border-2 border-navy hover:bg-brand-red-dark transition-colors">
            {t('common.profile')}
          </a>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: succeeds, and `/university/confirm` appears in the route list.

- [ ] **Step 3: Verify the failure paths**

In the browser, open `/university/confirm?token=nonsense`.

Expected: the invalid-or-expired message and a profile button — not a crash, not a blank page, not a spinner that never resolves. Check `read_console_messages` for React errors.

Then open `/university/confirm` with no token at all. Expected: the same failure message, reached with no network request.

- [ ] **Step 4: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add app/university/confirm/page.js
git commit -m "Add the university confirmation page"
```

---

### Task 9: The record page and robots

**Files:**
- Create: `frontend:app/record/[token]/page.js`
- Modify: `frontend:app/robots.js`

**Interfaces:**
- Consumes: `GET /api/records/:token` (Task 5)
- Produces: the `/record/[token]` route

- [ ] **Step 1: Write the page**

Create `frontend:app/record/[token]/page.js`:

```jsx
import { notFound } from 'next/navigation'

const API = 'https://linguaxchange-backend-production.up.railway.app'

// Never cached: a record is read by someone deciding whether to trust it, and a
// stale one understates what the member has done since. It is also revocable,
// and a cached copy would outlive the revocation.
export const dynamic = 'force-dynamic'

// English only, like the guide and class pages: this is a server component and
// the translation layer is a client-side React context.
export const metadata = {
  title: 'Participation record | LinguaXchange',
  // The page names a real person and lists their activity. It is shared
  // deliberately by that person and must never enter a search index.
  robots: { index: false, follow: false },
}

const hours = mins => (mins / 60).toFixed(mins % 60 === 0 ? 0 : 1)
const day = iso => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null)

export default async function RecordPage({ params }) {
  const { token } = await params

  let record = null
  try {
    const res = await fetch(`${API}/api/records/${token}`, { cache: 'no-store' })
    if (res.ok) record = await res.json()
  } catch (e) {
    // Falls through to notFound rather than showing a broken page.
  }
  if (!record) notFound()

  const rows = [
    ['Classes attended', record.attendedCount, `${hours(record.attendedMinutes)} h`],
    ['Classes taught', record.taughtCount, `${hours(record.taughtMinutes)} h`],
  ]

  return (
    <main className="min-h-screen bg-cream print:bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border-2 border-navy rounded-2xl p-8 print:border-0 print:p-0">
          <p className="text-navy/50 text-xs font-bold uppercase tracking-wide mb-1">Participation record</p>
          <h1 className="font-display font-extrabold text-3xl text-navy mb-2">{record.name}</h1>

          {record.university && (
            <p className="text-navy/70 mb-6">
              🎓 {record.university}
              {record.verifiedAt && <span className="text-navy/40"> · verified {day(record.verifiedAt)}</span>}
            </p>
          )}

          <table className="w-full mb-6">
            <tbody>
              {rows.map(([label, count, time]) => (
                <tr key={label} className="border-t border-navy/10">
                  <td className="py-3 text-navy/70">{label}</td>
                  <td className="py-3 text-right font-bold text-navy">{count}</td>
                  <td className="py-3 text-right text-navy/60 w-20">{time}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {record.languages.length > 0 && (
            <p className="text-navy/70 text-sm mb-1">
              <span className="font-bold">Languages:</span> {record.languages.join(', ')}
            </p>
          )}
          {record.levels.length > 0 && (
            <p className="text-navy/70 text-sm mb-1">
              <span className="font-bold">Levels:</span> {record.levels.join(', ')}
            </p>
          )}
          {record.firstActivity && (
            <p className="text-navy/70 text-sm">
              <span className="font-bold">Active:</span> {day(record.firstActivity)} – {day(record.lastActivity)}
            </p>
          )}

          {record.attendedCount === 0 && record.taughtCount === 0 && (
            /* An honest empty record is more credible than a broken page, and
               refusing to generate one would make the feature look broken for
               every new member. */
            <p className="text-navy/50 text-sm">No classes attended or taught yet.</p>
          )}

          <p className="text-navy/40 text-xs mt-8 pt-4 border-t border-navy/10">
            Generated {day(record.generatedAt)} by LinguaXchange · linguaxchange.com
          </p>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Disallow it in robots**

In `frontend:app/robots.js`, add to the `disallow` array after `'/teachers/'`:

```js
        '/teachers/',
        // Participation records name a real person and list their activity.
        // The link is shared deliberately by that person, never discovered.
        '/record/',
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: succeeds; `/record/[token]` appears as `ƒ` (dynamic).

- [ ] **Step 4: Verify**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/record/definitely-not-a-real-token
```
Expected: `404`.

```bash
curl -s http://localhost:3000/robots.txt | grep record
```
Expected: a `Disallow: /record/` line.

```bash
curl -s http://localhost:3000/sitemap.xml | grep -c record
```
Expected: `0`.

You cannot test a real record without a token, which needs a signed-in account — say so plainly rather than implying the success path was tested.

- [ ] **Step 5: Commit**

```bash
cd /Users/kinghamin/linguaxchange-frontend
git add "app/record/[token]/page.js" app/robots.js
git commit -m "Add the participation record page"
```

---

### Task 10: The badge on profiles

**Files:**
- Modify: `backend:routes/users.js:14-15`
- Modify: `frontend:app/profile/page.js`

**Interfaces:**
- Consumes: `university_domain` and `university_verified_at` from Task 1
- Produces: nothing downstream

- [ ] **Step 1: Expose the two badge fields**

`backend:routes/users.js:14` defines `PUBLIC_FIELDS` and line 15 defines `USER_FIELDS`. Add `university_domain, university_verified_at` to both strings.

Do NOT add `university_email` to either. The address is stored only to enforce uniqueness and must never leave the server.

- [ ] **Step 2: Show the badge**

In `frontend:app/profile/page.js`, render this where the profile header shows the member's name:

```jsx
{profile?.university_verified_at && (
  /* The date is the point: a university address keeps working after
     graduation, so the badge states when it was checked rather than
     implying the person is enrolled today. */
  <p className="text-brand-teal font-bold text-sm mt-1">
    🎓 {profile.university_domain}
    <span className="text-navy/40 font-medium">
      {' · '}{new Date(profile.university_verified_at).toLocaleDateString()}
    </span>
  </p>
)}
```

- [ ] **Step 3: Build and run the backend suite**

```bash
cd /Users/kinghamin/linguaxchange-frontend && npm run build
cd /Users/kinghamin/linguaxchange-backend && TZ=UTC npx jest
```

Expected: build succeeds; 32 suites, 200 tests passing.

- [ ] **Step 4: Confirm the address is not exposed**

```bash
curl -s https://linguaxchange-backend-production.up.railway.app/api/users/1 | grep -c university_email
```

Expected: `0`. If this returns anything else, STOP and report it — the verification address is leaking on a public endpoint.

- [ ] **Step 5: Commit**

```bash
cd /Users/kinghamin/linguaxchange-backend
git add routes/users.js
git commit -m "Expose the university badge fields, never the address"

cd /Users/kinghamin/linguaxchange-frontend
git add app/profile/page.js
git commit -m "Show the university badge with its verification date"
```

---

### Task 11: End-to-end verification

Everything is built. This is the only place the whole path runs together, and it needs a real signed-in account, so the repo owner does it.

- [ ] **Step 1: Verify a real address**

Sign in, go to `/settings` → University, submit a real `@ucm.es` address. Confirm the success message appears and an email arrives.

- [ ] **Step 2: Confirm**

Click the link. Expect the confirmation page, then the badge with today's date on `/profile`.

- [ ] **Step 3: Check the failure paths**

- Submit `you@gmail.com` — expect "That university is not supported yet."
- Submit `attacker@ucm.es.evil.com` — expect the same rejection. **If this succeeds, STOP and report it: the domain match is wrong and every badge is worthless.**
- Reuse the confirmation link a second time — expect invalid or expired.

- [ ] **Step 4: Create and check the record**

Create the share link and open it in a logged-out private window. Confirm the name, badge, counts and hours are right, and that no email address appears anywhere on the page or in its HTML source.

- [ ] **Step 5: Check revocation**

Press "Replace link", then open the old URL. Expect a 404. This is the only control a member has after a link has been shared, so it has to work.

- [ ] **Step 6: Print**

Print the record to PDF from the browser. Confirm it fits one page and the card border does not produce an odd box.

---

## Deferred, recorded so it is not lost

- **`FRONTEND_URL` in `routes/auth.js:20` is `https://linguaxchange-frontend.vercel.app`,** not `linguaxchange.com`. The verification email inherits that, so its link points at the Vercel domain rather than the real one. It works, but it looks wrong in an email to a university address. Changing it touches password reset too, so it is its own change.
- **Re-verification.** A badge outlives the studentship; the date keeps the claim honest, but nothing expires.
- **The badge gates nothing** — no filter, no students-only classes. That is a permission model, worth deciding once anyone has verified.
- **A revoked token returns 404,** indistinguishable from one that never existed. Deliberate.
