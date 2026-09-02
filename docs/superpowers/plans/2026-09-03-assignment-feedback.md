# Assignment Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A student posts up to 300 words for one banana; a native speaker of that language answers with tagged annotations on spans of the text plus one short overall comment, and never with corrected text.

**Architecture:** Backend first and independently testable through the API, then frontend. Mirrors the existing class-request feature throughout: a pure validator in `utils/`, a router that charges before inserting, expiry evaluated on read, and refunds claimed by conditional update on the existing five-minute cron. Feedback earnings take a distinct `credit_transactions` type so the weekly cap is an exact count and `creditSpendGate` keeps treating only teaching as teaching.

**Tech Stack:** Backend — Node/Express 5, Supabase (PostgREST), Jest. Frontend — Next.js App Router, React 19, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-03-assignment-feedback-design.md`

## Global Constraints

- Two repositories: `linguaxchange-backend` and `linguaxchange-frontend`. Every task states which.
- All new timestamp columns are `timestamptz`. The database has no naive timestamp columns as of 2026-09-02 and must not gain one.
- No route returns a raw database message. Failed calls go through `fail(res, status, message, cause)` from `utils/failure.js`.
- User-facing strings are added to all five languages in `lib/i18n/translations.js` (en, ko, es, de, pt). A missing translation renders the key.
- `credit_transactions.type` and `notifications.type` are closed `CHECK` lists. Inserting an unlisted value fails, and the application does not check that insert's error — so the migration lands before the code that writes it.
- `assignment_requests.body` is immutable after insert. Annotation offsets point into it.
- Levels are stored as CEFR. Korean displays through `levelLabel(languageCode, level)` from `lib/languages.js`.
- Costs and limits are constants in one file each, never inline literals.

---

## File Structure

**Backend (`linguaxchange-backend`)**

| File | Responsibility |
|---|---|
| `migrations/add_assignment_feedback.sql` | Two tables, one credit type, one notification type |
| `utils/assignmentValidation.js` | Pure: word count, request validation, annotation validation, category list |
| `utils/assignmentCredits.js` | Weekly cap check, earning on release, expiry refunds |
| `routes/assignments.js` | Board, post, withdraw, submit feedback, acknowledge |
| `tests/assignmentValidation.test.js` | Unit tests for the pure validator |
| `tests/assignmentCredits.test.js` | Unit tests for the cap boundary |
| `routes/cron.js` | Modified: auto-release and expiry refunds on the existing tick |
| `index.js` | Modified: mount the router |

**Frontend (`linguaxchange-frontend`)**

| File | Responsibility |
|---|---|
| `components/AssignmentBoard.js` | The board, rendered as a third tab |
| `components/AssignmentForm.js` | Post a request, with a live word counter |
| `components/AnnotationEditor.js` | Select a span, tag it, write a note |
| `components/FeedbackView.js` | Render feedback a student received |
| `app/assignments/[id]/page.js` | One request and its feedback |
| `app/classes/ClassesBrowseClient.js` | Modified: third tab |
| `lib/i18n/translations.js` | Modified: new strings in five languages |
| `lib/assignments.js` | Shared word-count rule, so the counter matches the server |

---

### Task 1: Database migration

**Repository:** `linguaxchange-backend`

**Files:**
- Create: `migrations/add_assignment_feedback.sql`

**Interfaces:**
- Consumes: nothing
- Produces: tables `assignment_requests`, `assignment_feedback`; `credit_transactions.type` accepts `'earned_feedback'`; `notifications.type` accepts `'assignment_answered'`

- [ ] **Step 1: Write the migration**

```sql
-- Assignment feedback: a student posts a short passage, a native speaker
-- annotates it. Never corrected text — see the design doc for why that
-- constraint shapes the schema.

create table if not exists assignment_requests (
  id                 serial primary key,
  student_id         integer not null references users(id),
  language_code      text not null,
  level              text,
  prompt             text not null,
  -- Immutable after insert. Annotation offsets point into this string, so an
  -- edit would silently move every annotation onto the wrong words with no
  -- error and no way to detect it afterwards.
  body               text not null,
  expires_at         timestamptz not null,
  credit_refunded_at timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists assignment_requests_open_idx
  on assignment_requests (language_code, expires_at);

create table if not exists assignment_feedback (
  id                 serial primary key,
  -- Unique, and this is how "first response wins" is enforced. The database
  -- rejects the second submission rather than the application checking and
  -- racing, the same reliance on a constraint that enforce_class_capacity.sql
  -- uses for seats.
  request_id         integer not null unique references assignment_requests(id),
  reviewer_id        integer not null references users(id),
  annotations        jsonb not null default '[]'::jsonb,
  overall            text,
  created_at         timestamptz not null default now(),
  acknowledged_at    timestamptz,
  credit_released_at timestamptz
);

create index if not exists assignment_feedback_unreleased_idx
  on assignment_feedback (credit_released_at, created_at);

-- The backend holds the service-role key and the frontend never queries
-- Supabase directly, so RLS on with no policies closes the anon-key hole.
alter table assignment_requests enable row level security;
alter table assignment_feedback enable row level security;

-- Feedback earnings get their own type rather than reusing 'earned'. Two
-- consequences, both wanted: the weekly cap becomes an exact count of typed
-- rows, and creditSpendGate.hasEverTaught keeps counting only 'earned', so
-- reviewing does not exempt anyone from the anti-freeloading gate.
alter table credit_transactions drop constraint credit_transactions_type_check;
alter table credit_transactions add constraint credit_transactions_type_check
  check (type in ('spent', 'earned', 'refunded', 'earned_feedback'));

-- notifications.type is a closed list; an insert of an unlisted type fails and
-- nothing checks that error.
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('student_joined', 'class_starting_soon', 'class_started',
                  'request_fulfilled', 'credit_added', 'assignment_answered'));
```

- [ ] **Step 2: Run it in the Supabase SQL editor**

Paste the file's contents and run. Expected: `Success. No rows returned.`

- [ ] **Step 3: Verify the tables and constraints exist**

Run in the SQL editor:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_name in ('assignment_requests','assignment_feedback')
order by table_name, ordinal_position;

select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname in ('credit_transactions_type_check','notifications_type_check');
```

Expected: every timestamp column reads `timestamp with time zone`; both check constraints list the new values.

- [ ] **Step 4: Commit**

```bash
git add migrations/add_assignment_feedback.sql
git commit -m "Add assignment feedback tables and credit type"
```

---

### Task 2: Request validation

**Repository:** `linguaxchange-backend`

**Files:**
- Create: `utils/assignmentValidation.js`
- Test: `tests/assignmentValidation.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `countWords(text) -> number`, `validateAssignmentRequest(body) -> {ok, language_code, level, prompt, body} | {ok:false, error}`, constants `MAX_WORDS = 300`, `MAX_PROMPT = 200`, `REQUEST_TTL_HOURS = 72`, `expiresAt(from) -> Date`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/assignmentValidation.test.js
const {
  countWords, validateAssignmentRequest, MAX_WORDS, expiresAt
} = require('../utils/assignmentValidation')

describe('countWords', () => {
  test('counts whitespace-separated tokens', () => {
    expect(countWords('hola que tal')).toBe(3)
  })

  test('ignores leading, trailing and repeated whitespace', () => {
    expect(countWords('  hola   que \n tal  ')).toBe(3)
  })

  test('an empty or whitespace-only string is zero, not one', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n  ')).toBe(0)
  })

  test('a non-string is zero rather than throwing', () => {
    expect(countWords(null)).toBe(0)
    expect(countWords(undefined)).toBe(0)
    expect(countWords(42)).toBe(0)
  })
})

describe('validateAssignmentRequest', () => {
  const good = {
    language_code: 'ES',
    level: 'B1',
    prompt: 'An email to my landlord about the heating',
    body: 'Estimado señor, le escribo porque la calefacción no funciona.'
  }

  test('accepts a well-formed request and returns cleaned fields', () => {
    const r = validateAssignmentRequest(good)
    expect(r.ok).toBe(true)
    expect(r.language_code).toBe('ES')
    expect(r.level).toBe('B1')
    expect(r.prompt).toBe(good.prompt)
    expect(r.body).toBe(good.body)
  })

  test('rejects an unknown language', () => {
    const r = validateAssignmentRequest({ ...good, language_code: 'XX' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/language/i)
  })

  test('accepts a missing level, since a passage need not have one', () => {
    const r = validateAssignmentRequest({ ...good, level: undefined })
    expect(r.ok).toBe(true)
    expect(r.level).toBe(null)
  })

  test('rejects a level that is not on the CEFR ladder', () => {
    expect(validateAssignmentRequest({ ...good, level: 'B3' }).ok).toBe(false)
  })

  test('requires a prompt, because feedback without intent is guesswork', () => {
    expect(validateAssignmentRequest({ ...good, prompt: '   ' }).ok).toBe(false)
  })

  test('accepts exactly MAX_WORDS and rejects one more', () => {
    const at = Array(MAX_WORDS).fill('palabra').join(' ')
    const over = Array(MAX_WORDS + 1).fill('palabra').join(' ')
    expect(validateAssignmentRequest({ ...good, body: at }).ok).toBe(true)
    const r = validateAssignmentRequest({ ...good, body: over })
    expect(r.ok).toBe(false)
    expect(r.error).toContain(String(MAX_WORDS))
  })

  test('rejects an empty body', () => {
    expect(validateAssignmentRequest({ ...good, body: '   ' }).ok).toBe(false)
  })

  test('preserves the body exactly, because annotation offsets index into it', () => {
    const spaced = 'uno  dos\ttres'
    const r = validateAssignmentRequest({ ...good, body: spaced })
    expect(r.body).toBe(spaced)
  })
})

describe('expiresAt', () => {
  test('is 72 hours after the given moment', () => {
    const from = new Date('2026-09-03T10:00:00Z')
    expect(expiresAt(from).toISOString()).toBe('2026-09-06T10:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/assignmentValidation.test.js`
Expected: FAIL — `Cannot find module '../utils/assignmentValidation'`

- [ ] **Step 3: Write the implementation**

```javascript
// utils/assignmentValidation.js
// Pure. No database, no network — so the rules are testable in milliseconds
// and the route stays a thin shell around them, matching utils/classRequests.js.

const LANGUAGES = ['KO', 'ES', 'DE', 'EN', 'PT', 'FR', 'IT']
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

// One banana buys a 60-minute class. If it also bought annotation of a
// 2,000-word essay nobody would ever choose to teach, so the unit is small:
// roughly ten minutes of a reviewer's time. Students split longer texts.
const MAX_WORDS = 300
const MAX_PROMPT = 200

// Long enough that an asynchronous reviewer in another timezone can get to
// it, short enough that a student is not left waiting a week for a refund.
const REQUEST_TTL_HOURS = 72

// Whitespace-separated tokens. Known wrong for Korean, where spacing is not
// word-delimiting the way it is in Spanish, so a 300-"word" Korean passage is
// materially longer and its reviewer is underpaid for the same banana. Left
// as-is for v1; revisit with a character limit for CJK if Korean requests
// become common. The frontend counter must use this same rule or the live
// count will disagree with the error message.
function countWords(text) {
  if (typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function expiresAt(from = new Date()) {
  return new Date(from.getTime() + REQUEST_TTL_HOURS * 60 * 60 * 1000)
}

function validateAssignmentRequest(body = {}) {
  const language_code = String(body.language_code || '').toUpperCase()
  if (!LANGUAGES.includes(language_code)) return { ok: false, error: 'Pick a language' }

  const level = body.level ? String(body.level).toUpperCase() : null
  if (level && !LEVELS.includes(level)) return { ok: false, error: 'Pick a valid level' }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt) return { ok: false, error: 'Say what you were trying to write' }
  if (prompt.length > MAX_PROMPT) {
    return { ok: false, error: `Keep that to ${MAX_PROMPT} characters or fewer` }
  }

  // Deliberately NOT trimmed or normalised. Annotation offsets index into the
  // stored string, so it must round-trip byte-identical.
  const text = typeof body.body === 'string' ? body.body : ''
  const words = countWords(text)
  if (words === 0) return { ok: false, error: 'Paste the text you want feedback on' }
  if (words > MAX_WORDS) {
    return { ok: false, error: `Keep it to ${MAX_WORDS} words or fewer — split a longer text into separate requests` }
  }

  return { ok: true, language_code, level, prompt, body: text }
}

module.exports = {
  countWords, validateAssignmentRequest, expiresAt,
  LANGUAGES, LEVELS, MAX_WORDS, MAX_PROMPT, REQUEST_TTL_HOURS,
}
```

- [ ] **Step 4: Run the tests**

Run: `npx jest tests/assignmentValidation.test.js`
Expected: PASS, 12 tests

- [ ] **Step 5: Commit**

```bash
git add utils/assignmentValidation.js tests/assignmentValidation.test.js
git commit -m "Add assignment request validation"
```

---

### Task 3: Annotation validation

**Repository:** `linguaxchange-backend`

**Files:**
- Modify: `utils/assignmentValidation.js`
- Modify: `tests/assignmentValidation.test.js`

**Interfaces:**
- Consumes: `countWords` and the module from Task 2
- Produces: `CATEGORIES` (array of stable keys), `MAX_OVERALL = 500`, `MAX_NOTE = 300`, `MAX_ANNOTATIONS = 40`, `validateFeedback({annotations, overall}, body) -> {ok, annotations, overall} | {ok:false, error}`

- [ ] **Step 1: Write the failing test**

Append to `tests/assignmentValidation.test.js`:

```javascript
const { validateFeedback, CATEGORIES, MAX_ANNOTATIONS } = require('../utils/assignmentValidation')

describe('validateFeedback', () => {
  const body = 'Estimado señor, le escribo porque la calefacción no funciona.'
  const ann = (over = {}) => ({ start: 0, end: 8, category: 'register', note: 'Too formal for a landlord you know.', ...over })

  test('accepts well-formed annotations', () => {
    const r = validateFeedback({ annotations: [ann()], overall: 'Solid tenses.' }, body)
    expect(r.ok).toBe(true)
    expect(r.annotations).toHaveLength(1)
    expect(r.annotations[0].category).toBe('register')
  })

  test('requires at least one annotation, since the point is marking spans', () => {
    const r = validateFeedback({ annotations: [], overall: 'Looks fine!' }, body)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/at least one/i)
  })

  test('rejects an offset past the end of the body', () => {
    const r = validateFeedback({ annotations: [ann({ end: body.length + 1 })] }, body)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/outside/i)
  })

  test('rejects a negative start', () => {
    expect(validateFeedback({ annotations: [ann({ start: -1 })] }, body).ok).toBe(false)
  })

  test('rejects an inverted range', () => {
    expect(validateFeedback({ annotations: [ann({ start: 10, end: 4 })] }, body).ok).toBe(false)
  })

  test('rejects a zero-length span, which marks nothing', () => {
    expect(validateFeedback({ annotations: [ann({ start: 5, end: 5 })] }, body).ok).toBe(false)
  })

  test('rejects an unknown category', () => {
    const r = validateFeedback({ annotations: [ann({ category: 'vibes' })] }, body)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/categor/i)
  })

  test('requires a note explaining why, because that is the whole product', () => {
    const r = validateFeedback({ annotations: [ann({ note: '  ' })] }, body)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/why/i)
  })

  test('rejects more annotations than the cap', () => {
    const many = Array(MAX_ANNOTATIONS + 1).fill(null).map(() => ann())
    expect(validateFeedback({ annotations: many }, body).ok).toBe(false)
  })

  test('allows an absent overall comment', () => {
    const r = validateFeedback({ annotations: [ann()] }, body)
    expect(r.ok).toBe(true)
    expect(r.overall).toBe(null)
  })

  test('rejects an overall comment past the limit, which is what keeps a rewrite out', () => {
    const long = 'a'.repeat(501)
    const r = validateFeedback({ annotations: [ann()], overall: long }, body)
    expect(r.ok).toBe(false)
  })

  test('every category is a stable lowercase key, never a display string', () => {
    for (const c of CATEGORIES) expect(c).toMatch(/^[a-z][a-z-]*$/)
  })

  test('keeps only the four known annotation fields', () => {
    const r = validateFeedback({ annotations: [ann({ evil: 'x' })] }, body)
    expect(Object.keys(r.annotations[0]).sort()).toEqual(['category', 'end', 'note', 'start'])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/assignmentValidation.test.js -t validateFeedback`
Expected: FAIL — `validateFeedback is not a function`

- [ ] **Step 3: Write the implementation**

Append to `utils/assignmentValidation.js`, above `module.exports`:

```javascript
// Stable keys, translated for display. Storing display strings would orphan
// existing rows the first time a translation is edited.
//
// One shared list across all seven languages for v1. Per-language lists
// multiply translation work by seven with no evidence yet about which
// categories reviewers reach for — 'grammar-other' is the escape hatch, and
// its usage rate is the signal for what to add. Heavy use by Korean reviewers
// would be the argument for adding particles and spacing.
const CATEGORIES = [
  'word-order', 'agreement', 'tense', 'vocabulary', 'register',
  'spelling', 'punctuation', 'naturalness', 'grammar-other',
]

const MAX_NOTE = 300
// Short on purpose. This box is the one place a reviewer could paste a
// rewritten version, and the policy against corrected text is enforced by the
// shape of the form rather than by inspection. Short and visible beats long
// and unpoliced.
const MAX_OVERALL = 500
const MAX_ANNOTATIONS = 40

function validateFeedback(input = {}, body = '') {
  const raw = Array.isArray(input.annotations) ? input.annotations : []
  if (raw.length === 0) {
    return { ok: false, error: 'Mark at least one part of the text' }
  }
  if (raw.length > MAX_ANNOTATIONS) {
    return { ok: false, error: `Keep it to ${MAX_ANNOTATIONS} marks or fewer` }
  }

  const annotations = []
  for (const a of raw) {
    const start = Number(a?.start)
    const end = Number(a?.end)
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      return { ok: false, error: 'A mark is missing its position' }
    }
    if (start < 0 || end > body.length) {
      return { ok: false, error: 'A mark falls outside the text' }
    }
    if (end <= start) {
      return { ok: false, error: 'A mark has to cover at least one character' }
    }

    const category = String(a?.category || '')
    if (!CATEGORIES.includes(category)) {
      return { ok: false, error: 'Pick a category for every mark' }
    }

    const note = typeof a?.note === 'string' ? a.note.trim() : ''
    if (!note) return { ok: false, error: 'Say why each mark is wrong' }
    if (note.length > MAX_NOTE) {
      return { ok: false, error: `Keep each note to ${MAX_NOTE} characters or fewer` }
    }

    // Rebuilt rather than spread, so an unexpected field cannot ride into
    // jsonb and out to the browser.
    annotations.push({ start, end, category, note })
  }

  const overall = typeof input.overall === 'string' ? input.overall.trim() : ''
  if (overall.length > MAX_OVERALL) {
    return { ok: false, error: `Keep the overall comment to ${MAX_OVERALL} characters or fewer` }
  }

  return { ok: true, annotations, overall: overall || null }
}
```

Add to the exports: `validateFeedback, CATEGORIES, MAX_NOTE, MAX_OVERALL, MAX_ANNOTATIONS`.

- [ ] **Step 4: Run the tests**

Run: `npx jest tests/assignmentValidation.test.js`
Expected: PASS, 25 tests

- [ ] **Step 5: Commit**

```bash
git add utils/assignmentValidation.js tests/assignmentValidation.test.js
git commit -m "Add annotation validation for assignment feedback"
```

---

### Task 4: The weekly earning cap

**Repository:** `linguaxchange-backend`

**Files:**
- Create: `utils/assignmentCredits.js`
- Test: `tests/assignmentCredits.test.js`

**Interfaces:**
- Consumes: `add_credit` RPC (existing), `credit_transactions` table
- Produces: `WEEKLY_FEEDBACK_CAP = 3`, `FEEDBACK_TYPE = 'earned_feedback'`, `isOverCap(countInWindow) -> boolean`, `countFeedbackEarnings(userId, since) -> number`, `releaseFeedbackCredit(reviewerId) -> {ok}`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/assignmentCredits.test.js
// isOverCap is pure, but the module builds a Supabase client — mock it so this
// stays a fast unit test, the same approach as tests/creditSpendGate.test.js.
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }))

const { isOverCap, WEEKLY_FEEDBACK_CAP } = require('../utils/assignmentCredits')

describe('isOverCap', () => {
  test('allows the first review of the week', () => {
    expect(isOverCap(0)).toBe(false)
  })

  test('allows reviews up to the cap', () => {
    expect(isOverCap(WEEKLY_FEEDBACK_CAP - 1)).toBe(false)
  })

  test('refuses once the cap has been reached', () => {
    // Having already earned WEEKLY_FEEDBACK_CAP this week, the next one is refused.
    expect(isOverCap(WEEKLY_FEEDBACK_CAP)).toBe(true)
  })

  test('refuses beyond the cap', () => {
    expect(isOverCap(WEEKLY_FEEDBACK_CAP + 5)).toBe(true)
  })

  test('the cap exists to stop reviewing beating teaching, so it is small', () => {
    // A banana buys a 60-minute class or ~10 minutes of annotation. Without a
    // cap the rational move is to stop teaching, and live classes are the part
    // universities want.
    expect(WEEKLY_FEEDBACK_CAP).toBeLessThanOrEqual(5)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx jest tests/assignmentCredits.test.js`
Expected: FAIL — `Cannot find module '../utils/assignmentCredits'`

- [ ] **Step 3: Write the implementation**

```javascript
// utils/assignmentCredits.js
const { createClient } = require('@supabase/supabase-js')

let client
function db() {
  if (!client) client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
  return client
}

// Its own transaction type, not 'earned'. Two consequences, both deliberate:
// the cap below is an exact count of typed rows rather than a string match on
// a description, and creditSpendGate.hasEverTaught keeps counting only
// 'earned' — so reviewing paragraphs does not exempt anyone from the
// anti-freeloading gate. Reusing 'earned' would have granted that exemption
// by accident.
const FEEDBACK_TYPE = 'earned_feedback'

// One banana buys a 60-minute class or roughly ten minutes of annotation.
// Uncapped, reviewing is strictly better than teaching and the rational
// response is to stop offering classes — which is the part universities
// actually want. Three is a guess; revisit once there is data on whether the
// two actually compete.
const WEEKLY_FEEDBACK_CAP = 3
const WINDOW_DAYS = 7

function isOverCap(countInWindow) {
  return countInWindow >= WEEKLY_FEEDBACK_CAP
}

function windowStart(now = new Date()) {
  return new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
}

// Fails closed: a lookup error refuses the earning rather than granting it,
// because the failure mode of the opposite is an uncapped currency.
async function countFeedbackEarnings(userId, since = windowStart()) {
  const { count, error } = await db()
    .from('credit_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', FEEDBACK_TYPE)
    .gte('created_at', since.toISOString())

  if (error) {
    console.error('feedback cap lookup failed', error)
    return WEEKLY_FEEDBACK_CAP
  }
  return count || 0
}

// Atomic add through the same RPC every other credit path uses. Never
// read-modify-write.
async function releaseFeedbackCredit(reviewerId) {
  const { data: balanceAfter, error } = await db()
    .rpc('add_credit', { p_user_id: reviewerId, p_amount: 1 })
  if (error || balanceAfter === null) {
    console.error('feedback credit release failed', error)
    return { ok: false }
  }

  await db().from('credit_transactions').insert([{
    user_id: reviewerId,
    amount: 1,
    type: FEEDBACK_TYPE,
    description: 'Assignment feedback',
  }])

  return { ok: true, balance: balanceAfter }
}

module.exports = {
  isOverCap, countFeedbackEarnings, releaseFeedbackCredit, windowStart,
  WEEKLY_FEEDBACK_CAP, FEEDBACK_TYPE, WINDOW_DAYS,
}
```

- [ ] **Step 4: Run the tests**

Run: `npx jest tests/assignmentCredits.test.js`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add utils/assignmentCredits.js tests/assignmentCredits.test.js
git commit -m "Add the weekly cap on bananas earned from feedback"
```

---

### Task 5: Board, post and withdraw

**Repository:** `linguaxchange-backend`

**Files:**
- Create: `routes/assignments.js`
- Modify: `index.js`

**Interfaces:**
- Consumes: `validateAssignmentRequest`, `expiresAt` (Task 2); `chargeForRequest`, `refundForRequest` from `utils/requestCredits.js`; `fail` from `utils/failure.js`; `requireAuth` from `middleware/auth.js`
- Produces: `GET /api/assignments`, `GET /api/assignments/:id`, `POST /api/assignments`, `DELETE /api/assignments/:id`

- [ ] **Step 1: Write the router**

```javascript
// routes/assignments.js
const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { requireAuth } = require('../middleware/auth')
const { fail } = require('../utils/failure')
const { validateAssignmentRequest, expiresAt } = require('../utils/assignmentValidation')
const { chargeForRequest, refundForRequest } = require('../utils/requestCredits')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// The student's name is shown; their email never is.
const SELECT = `
  id, language_code, level, prompt, body, expires_at, created_at, student_id,
  student:users!student_id(id, first_name, last_name, photo_url),
  assignment_feedback(
    id, reviewer_id, annotations, overall, created_at, acknowledged_at,
    reviewer:users!reviewer_id(id, first_name, last_name, photo_url,
                              university_domain, university_verified_at)
  )
`

// university_domain and university_verified_at are already in the public
// column whitelist; the pending and confirmed email columns are not and must
// stay out.

// How many open requests one person may have at once. Without a cap one
// student can bury the board, exactly as in class requests.
const MAX_OPEN_PER_USER = 3

// GET /api/assignments — the open board. Public, like the class-request
// board: the point is that reviewers can see demand before signing up.
// Expiry is evaluated here rather than by a cleanup job, matching
// routes/classRequests.js — nothing reads stale rows, so deleting them buys
// nothing.
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('assignment_requests')
      .select(SELECT)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (req.query.language_code) {
      query = query.eq('language_code', String(req.query.language_code).toUpperCase())
    }

    const { data, error } = await query
    if (error) return fail(res, 400, 'Could not fetch assignment requests', error)
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not fetch assignment requests' })
  }
})

// GET /api/assignments/:id — one request, expired or not.
//
// Separate from the board because the board filters on expires_at: an
// answered request passes its expiry and disappears from the list, but its own
// page must keep working for the student who is about to acknowledge it.
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('assignment_requests')
      .select(SELECT)
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) return fail(res, 400, 'Could not fetch the request', error)
    if (!data) return res.status(404).json({ error: 'Request not found' })
    res.json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not fetch the request' })
  }
})

// POST /api/assignments
router.post('/', requireAuth, async (req, res) => {
  const check = validateAssignmentRequest(req.body)
  if (!check.ok) return res.status(400).json({ error: check.error })

  try {
    const { count } = await supabase
      .from('assignment_requests')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', req.userId)
      .gt('expires_at', new Date().toISOString())

    if ((count || 0) >= MAX_OPEN_PER_USER) {
      return res.status(400).json({
        error: `You already have ${MAX_OPEN_PER_USER} open requests. Wait for one to be answered or withdraw it.`
      })
    }

    // Charged before the row exists, so a student who cannot afford feedback
    // never posts a request for it. If the insert then fails the banana goes
    // straight back — inserting first would leave a free request standing
    // whenever the charge failed.
    const charge = await chargeForRequest(req.userId)
    if (!charge.ok) return res.status(400).json({ error: charge.error })

    const { ok, ...fields } = check
    const { data, error } = await supabase
      .from('assignment_requests')
      .insert([{ ...fields, student_id: req.userId, expires_at: expiresAt().toISOString() }])
      .select(SELECT)
      .single()

    if (error) {
      await refundForRequest(req.userId, 'Assignment request could not be posted')
      return fail(res, 400, 'Could not post your request', error)
    }
    res.status(201).json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not post your request' })
  }
})

// DELETE /api/assignments/:id — withdraw your own, only while unanswered.
//
// Once someone has written feedback the work is done and the banana is theirs
// to be released. A withdrawal that clawed it back would make reviewing unsafe,
// which is the one thing this economy cannot afford at its current size.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('assignment_requests')
      .select('id, assignment_feedback(id)')
      .eq('id', req.params.id)
      .eq('student_id', req.userId)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'Request not found' })
    if ((existing.assignment_feedback || []).length > 0) {
      return res.status(400).json({ error: 'This has already been answered — acknowledge it instead' })
    }

    // Conditional delete returning the row: the refund happens only if this
    // call is the one that removed it, so a double click cannot refund twice.
    const { data: deleted, error } = await supabase
      .from('assignment_requests')
      .delete()
      .eq('id', req.params.id)
      .eq('student_id', req.userId)
      .is('credit_refunded_at', null)
      .select('id')

    if (error) return fail(res, 400, 'Could not withdraw your request', error)
    if (!deleted || deleted.length === 0) return res.status(404).json({ error: 'Request not found' })

    await refundForRequest(req.userId, 'Assignment request withdrawn')
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not withdraw your request' })
  }
})

module.exports = router
```

- [ ] **Step 2: Mount it**

In `index.js`, beside the other routers:

```javascript
const assignmentRoutes = require('./routes/assignments')
app.use('/api/assignments', assignmentRoutes)
```

- [ ] **Step 3: Verify against a running server**

```bash
node --check routes/assignments.js
CRON_SECRET=local-test-only PORT=3999 node index.js &
curl -s -o /dev/null -w "board %{http_code}\n" http://localhost:3999/api/assignments
curl -s -X POST http://localhost:3999/api/assignments -H 'Content-Type: application/json' -d '{}'
```

Expected: board returns `200`; the bodyless POST returns `401` (no token), not `500`.

- [ ] **Step 4: Commit**

```bash
git add routes/assignments.js index.js
git commit -m "Add the assignment request board, posting and withdrawal"
```

---

### Task 6: Submitting feedback

**Repository:** `linguaxchange-backend`

**Files:**
- Modify: `routes/assignments.js`

**Interfaces:**
- Consumes: `validateFeedback` (Task 3); `isOverCap`, `countFeedbackEarnings` (Task 4)
- Produces: `POST /api/assignments/:id/feedback`

- [ ] **Step 1: Add the route**

Insert before `module.exports`:

```javascript
const { validateFeedback } = require('../utils/assignmentValidation')
const { isOverCap, countFeedbackEarnings } = require('../utils/assignmentCredits')

// POST /api/assignments/:id/feedback — answer a request.
//
// First response wins, and that is enforced by the unique constraint on
// request_id rather than by checking first and racing.
router.post('/:id/feedback', requireAuth, async (req, res) => {
  try {
    const { data: request } = await supabase
      .from('assignment_requests')
      .select('id, student_id, language_code, body, expires_at')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!request) return res.status(404).json({ error: 'Request not found' })
    if (new Date(request.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'This request has expired' })
    }
    if (request.student_id === req.userId) {
      return res.status(400).json({ error: "You can't answer your own request" })
    }

    // The only permission gate: the reviewer speaks the language natively.
    // A university restriction was considered and rejected — with one verified
    // user it would starve the feature before it had any.
    const { data: reviewer } = await supabase
      .from('users')
      .select('teach_language')
      .eq('id', req.userId)
      .maybeSingle()

    if (!reviewer || reviewer.teach_language !== request.language_code) {
      return res.status(403).json({ error: 'You can only give feedback in your own native language' })
    }

    const earned = await countFeedbackEarnings(req.userId)
    if (isOverCap(earned)) {
      return res.status(400).json({ error: "You've reached this week's feedback limit. Teach a class to keep earning." })
    }

    const check = validateFeedback(req.body, request.body)
    if (!check.ok) return res.status(400).json({ error: check.error })

    const { data, error } = await supabase
      .from('assignment_feedback')
      .insert([{
        request_id: request.id,
        reviewer_id: req.userId,
        annotations: check.annotations,
        overall: check.overall,
      }])
      .select('id, created_at')
      .single()

    if (error) {
      // 23505 is the unique violation on request_id: somebody answered first.
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Someone answered this first' })
      }
      return fail(res, 400, 'Could not save your feedback', error)
    }

    // Best effort. A failed notification must not fail the feedback that was
    // already written.
    await supabase.from('notifications').insert([{
      user_id: request.student_id,
      type: 'assignment_answered',
      message: 'Your writing has feedback',
    }])

    res.status(201).json(data)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not save your feedback' })
  }
})
```

- [ ] **Step 2: Verify the module still loads**

Run: `node --check routes/assignments.js && npx jest --silent`
Expected: parses; the existing suite still passes.

- [ ] **Step 3: Commit**

```bash
git add routes/assignments.js
git commit -m "Add feedback submission with the language gate and weekly cap"
```

---

### Task 7: Acknowledgement, auto-release and expiry

**Repository:** `linguaxchange-backend`

**Files:**
- Modify: `routes/assignments.js`
- Modify: `utils/assignmentCredits.js`
- Modify: `routes/cron.js`

**Interfaces:**
- Consumes: `releaseFeedbackCredit` (Task 4); `refundForRequest` from `utils/requestCredits.js`
- Produces: `POST /api/assignments/:id/acknowledge`; `releaseDueFeedback(now)`, `refundExpiredAssignments(now)` on the cron

- [ ] **Step 1: Add the acknowledge route**

Insert into `routes/assignments.js` before `module.exports`:

```javascript
const { releaseFeedbackCredit } = require('../utils/assignmentCredits')

// POST /api/assignments/:id/acknowledge — the student releases the banana.
//
// Same shape as attendance confirmation: the recipient releases the credit
// rather than the provider claiming the work is done. Idempotent by
// conditional transition, so a double click pays once.
router.post('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const { data: request } = await supabase
      .from('assignment_requests')
      .select('id, student_id')
      .eq('id', req.params.id)
      .eq('student_id', req.userId)
      .maybeSingle()

    if (!request) return res.status(404).json({ error: 'Request not found' })

    const now = new Date().toISOString()
    const { data: released, error } = await supabase
      .from('assignment_feedback')
      .update({ acknowledged_at: now, credit_released_at: now })
      .eq('request_id', request.id)
      .is('credit_released_at', null)
      .select('id, reviewer_id')

    if (error) return fail(res, 400, 'Could not acknowledge the feedback', error)

    // No row transitioned: already released, by an earlier click or by the
    // cron's automatic release. Report success — the outcome the caller wanted
    // is already true.
    if (!released || released.length === 0) {
      return res.json({ success: true, already: true })
    }

    await releaseFeedbackCredit(released[0].reviewer_id)
    res.json({ success: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Could not acknowledge the feedback' })
  }
})
```

- [ ] **Step 2: Add the two cron jobs**

Append to `utils/assignmentCredits.js`, above `module.exports`:

```javascript
// A student who never comes back must not leave a reviewer unpaid. At five
// users one unresponsive student is enough to make reviewing feel pointless,
// so the banana releases on its own after this long.
const AUTO_RELEASE_HOURS = 72

// Claimed with a conditional update first, so two overlapping cron ticks
// cannot pay the same reviewer twice — the pattern refundExpiredRequests
// already uses.
async function releaseDueFeedback(now = new Date()) {
  const cutoff = new Date(now.getTime() - AUTO_RELEASE_HOURS * 60 * 60 * 1000)
  let released = 0
  try {
    const { data: due } = await db()
      .from('assignment_feedback')
      .select('id, reviewer_id')
      .is('credit_released_at', null)
      .lt('created_at', cutoff.toISOString())

    for (const row of due || []) {
      const { data: claimed } = await db()
        .from('assignment_feedback')
        .update({ credit_released_at: now.toISOString() })
        .eq('id', row.id)
        .is('credit_released_at', null)
        .select('id')

      if (claimed && claimed.length > 0) {
        await releaseFeedbackCredit(row.reviewer_id)
        released++
      }
    }
  } catch (e) {
    console.error('releaseDueFeedback failed', e)
  }
  return { released }
}

// An unanswered request expires and the banana goes back. This is the answer
// to the supply problem: a German request nobody can answer costs the student
// nothing but time.
async function refundExpiredAssignments(now = new Date()) {
  const { refundForRequest } = require('./requestCredits')
  let refunded = 0
  try {
    const { data: stale } = await db()
      .from('assignment_requests')
      .select('id, student_id, assignment_feedback(id)')
      .lt('expires_at', now.toISOString())
      .is('credit_refunded_at', null)

    for (const row of stale || []) {
      // Answered requests are not refunded; their banana goes to the reviewer.
      if ((row.assignment_feedback || []).length > 0) continue

      const { data: claimed } = await db()
        .from('assignment_requests')
        .update({ credit_refunded_at: now.toISOString() })
        .eq('id', row.id)
        .is('credit_refunded_at', null)
        .select('id')

      if (claimed && claimed.length > 0) {
        await refundForRequest(row.student_id, 'Assignment request expired unanswered')
        refunded++
      }
    }
  } catch (e) {
    console.error('refundExpiredAssignments failed', e)
  }
  return { refunded }
}
```

Add to the exports: `releaseDueFeedback, refundExpiredAssignments, AUTO_RELEASE_HOURS`.

- [ ] **Step 3: Call them on the existing tick**

In `routes/cron.js`, add the import and two calls inside `handleSendReminders`, before `recordRun`:

```javascript
const { releaseDueFeedback, refundExpiredAssignments } = require('../utils/assignmentCredits')

// ... inside handleSendReminders, after requestsRefunded:
const { released: feedbackReleased } = await releaseDueFeedback()
const { refunded: assignmentsRefunded } = await refundExpiredAssignments()
```

Add both to the JSON response object.

- [ ] **Step 4: Verify**

```bash
node --check routes/assignments.js && node --check utils/assignmentCredits.js && node --check routes/cron.js
npx jest --silent
CRON_SECRET=local-test-only PORT=3999 node index.js &
curl -s "http://localhost:3999/api/cron/send-class-reminders?secret=local-test-only"
```

Expected: all parse, suite passes, and the cron response now includes `feedbackReleased` and `assignmentsRefunded`, both `0`.

- [ ] **Step 5: Commit**

```bash
git add routes/assignments.js utils/assignmentCredits.js routes/cron.js
git commit -m "Release feedback credits on acknowledgement or after 72 hours"
```

---

### Task 8: Shared word count and translations

**Repository:** `linguaxchange-frontend`

**Files:**
- Create: `lib/assignments.js`
- Modify: `lib/i18n/translations.js`

**Interfaces:**
- Consumes: nothing
- Produces: `countWords(text)`, `MAX_WORDS`, `CATEGORIES`; the `assignments.*` translation namespace

- [ ] **Step 1: Create the shared rule**

```javascript
// lib/assignments.js
// The word-count rule is duplicated from the backend's
// utils/assignmentValidation.js on purpose — the two repositories share no
// code. It must stay identical, or the live counter will disagree with the
// error the server returns.
export const MAX_WORDS = 300

export function countWords(text) {
  if (typeof text !== 'string') return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// Stable keys. Display strings come from t('assignments.category.<key>'), so
// editing a translation never orphans stored data.
export const CATEGORIES = [
  'word-order', 'agreement', 'tense', 'vocabulary', 'register',
  'spelling', 'punctuation', 'naturalness', 'grammar-other',
]
```

- [ ] **Step 2: Add English strings**

In `lib/i18n/translations.js`, inside the `en` object, add an `assignments` namespace:

```javascript
    assignments: {
      tab: 'Writing feedback',
      boardEmpty: 'Nothing waiting for feedback right now.',
      post: 'Get feedback on your writing',
      promptLabel: 'What were you trying to write?',
      promptPlaceholder: 'An email to my landlord about the heating',
      bodyLabel: 'Your text',
      wordCount: '{n} / {max} words',
      tooLong: 'Too long — keep it to {max} words or fewer',
      costNote: 'Costs 1 banana. Refunded if nobody answers within 72 hours.',
      submit: 'Post for feedback',
      withdraw: 'Withdraw',
      answered: 'Answered',
      awaiting: 'Waiting for feedback',
      giveFeedback: 'Give feedback',
      notYourLanguage: 'You can only give feedback in your own native language',
      selectSpan: 'Select part of the text to mark it',
      categoryLabel: 'What kind of mistake?',
      noteLabel: 'Why is it wrong?',
      noteHint: 'Explain the mistake. Do not write the corrected version — the point is that they learn to fix it.',
      overallLabel: 'Overall comment (optional)',
      submitFeedback: 'Send feedback',
      acknowledge: 'Got it, thanks',
      acknowledged: 'Acknowledged',
      capReached: "You've reached this week's feedback limit. Teach a class to keep earning.",
      category: {
        'word-order': 'Word order',
        agreement: 'Agreement',
        tense: 'Tense',
        vocabulary: 'Word choice',
        register: 'Register',
        spelling: 'Spelling',
        punctuation: 'Punctuation',
        naturalness: 'Sounds unnatural',
        'grammar-other': 'Grammar (other)',
      },
    },
```

- [ ] **Step 3: Translate into ko, es, de, pt**

Add the same `assignments` block to each of the other four language objects, translating every value. Keys stay identical. `noteHint` matters most — it is where the no-corrected-text rule is stated to the person about to break it.

- [ ] **Step 4: Verify the file still parses and every language has the block**

```bash
npx esbuild lib/i18n/translations.js --loader:.js=jsx --outfile=/dev/null
grep -c "assignments: {" lib/i18n/translations.js
```

Expected: parses; the count is `5`.

- [ ] **Step 5: Commit**

```bash
git add lib/assignments.js lib/i18n/translations.js
git commit -m "Add the shared word-count rule and assignment translations"
```

---

### Task 9: The board tab and the posting form

**Repository:** `linguaxchange-frontend`

**Files:**
- Create: `components/AssignmentBoard.js`
- Create: `components/AssignmentForm.js`
- Modify: `app/classes/ClassesBrowseClient.js`

**Interfaces:**
- Consumes: `countWords`, `MAX_WORDS` (Task 8); `levelLabel` from `lib/languages.js`; `GET/POST /api/assignments` (Task 5)
- Produces: a third tab keyed `assignments`

- [ ] **Step 1: Add the tab**

In `app/classes/ClassesBrowseClient.js`, extend the tab strip:

```javascript
{[['classes', t('requests.tabClasses')],
  ['requests', t('requests.tabRequests')],
  ['assignments', t('assignments.tab')]].map(([key, label]) => (
```

and render it beside the existing branch:

```javascript
{tab === 'assignments' ? (
  <AssignmentBoard language={filter} currentUser={currentUser} langs={LANGS} />
) : tab === 'requests' ? (
```

A third tab rather than a sixth navigation entry: the navigation already fails at 375px with five items, which is the bug fixed on 2026-09-02, and the tab strip is where someone already looks to ask what they can do here.

- [ ] **Step 2: Write the board**

```javascript
// components/AssignmentBoard.js
'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '../lib/i18n/LanguageContext'
import { levelLabel } from '../lib/languages'
import AssignmentForm from './AssignmentForm'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function AssignmentBoard({ language, currentUser, langs }) {
  const { t } = useLanguage()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const load = () => {
    const qs = language && language !== 'all' ? `?language_code=${language}` : ''
    fetch(`${API}/api/assignments${qs}`)
      .then(r => r.json())
      .then(d => setRequests(Array.isArray(d) ? d : []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [language])

  return (
    <div>
      {currentUser && (
        <button onClick={() => setPosting(p => !p)}
          className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy mb-6">
          {t('assignments.post')}
        </button>
      )}

      {posting && <AssignmentForm onPosted={() => { setPosting(false); load() }} />}

      {loading && <p className="text-navy/40">…</p>}

      {!loading && requests.length === 0 && (
        <p className="text-navy/60">{t('assignments.boardEmpty')}</p>
      )}

      {requests.map(r => {
        const answered = (r.assignment_feedback || []).length > 0
        return (
          <a key={r.id} href={`/assignments/${r.id}`}
            className="block bg-white border-2 border-navy rounded-2xl p-5 mb-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{langs[r.language_code]?.flag}</span>
              {r.level && (
                <span className="bg-brand-teal/15 text-brand-teal px-2 py-0.5 rounded-full text-xs font-bold border border-brand-teal/30">
                  {levelLabel(r.language_code, r.level)}
                </span>
              )}
              <span className={`ml-auto text-xs font-bold ${answered ? 'text-brand-teal' : 'text-navy/50'}`}>
                {answered ? t('assignments.answered') : t('assignments.awaiting')}
              </span>
            </div>
            <p className="font-display font-bold text-navy">{r.prompt}</p>
            <p className="text-navy/60 text-sm mt-1 line-clamp-2">{r.body}</p>
          </a>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write the form**

```javascript
// components/AssignmentForm.js
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
```

- [ ] **Step 4: Verify in the browser**

```bash
npx next build
```

Then start the dev server through the preview tooling, open `/classes`, and check: a third tab appears; the word counter increments as you type; pasting 301 words turns it red and disables the button.

- [ ] **Step 5: Commit**

```bash
git add components/AssignmentBoard.js components/AssignmentForm.js app/classes/ClassesBrowseClient.js
git commit -m "Add the assignment board tab and posting form"
```

---

### Task 10: The annotation editor and feedback view

**Repository:** `linguaxchange-frontend`

**Files:**
- Create: `app/assignments/[id]/page.js`
- Create: `components/AnnotationEditor.js`
- Create: `components/FeedbackView.js`

**Interfaces:**
- Consumes: `CATEGORIES` (Task 8); `POST /api/assignments/:id/feedback`, `POST /api/assignments/:id/acknowledge` (Tasks 6 and 7)
- Produces: nothing downstream

- [ ] **Step 1: Write the annotation editor**

```javascript
// components/AnnotationEditor.js
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
            rows={3} className="w-full border-2 border-navy/15 rounded-xl px-3 py-2 text-sm mb-3" />

          <button onClick={() => { setAnnotations(a => [...a, draft]); setDraft(null) }}
            disabled={!draft.note.trim()}
            className="bg-navy text-white px-4 py-2 rounded-full text-xs font-bold disabled:opacity-40">
            +
          </button>
        </div>
      )}

      {annotations.map((a, i) => (
        <div key={i} className="border-l-4 border-brand-red pl-3 mb-3">
          <p className="text-navy font-bold text-sm">“{request.body.slice(a.start, a.end)}”</p>
          <p className="text-navy/60 text-xs">{t(`assignments.category.${a.category}`)} — {a.note}</p>
        </div>
      ))}

      <label className="block text-sm font-bold text-navy mb-2 mt-4">{t('assignments.overallLabel')}</label>
      <textarea value={overall} onChange={e => setOverall(e.target.value)} rows={3} maxLength={500}
        className="w-full border-2 border-navy/15 rounded-xl px-4 py-2.5 mb-4" />

      {error && <p className="text-brand-red text-sm mb-3 font-bold">{error}</p>}

      <button onClick={send} disabled={annotations.length === 0}
        className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy disabled:opacity-40">
        {t('assignments.submitFeedback')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write the feedback view**

```javascript
// components/FeedbackView.js
'use client'
import { useLanguage } from '../lib/i18n/LanguageContext'

export default function FeedbackView({ request, feedback, canAcknowledge, onAcknowledge }) {
  const { t } = useLanguage()

  return (
    <div>
      <div className="bg-white border-2 border-navy rounded-2xl p-5 whitespace-pre-wrap leading-relaxed mb-4">
        {request.body}
      </div>

      {(feedback.annotations || []).map((a, i) => (
        <div key={i} className="border-l-4 border-brand-red pl-3 mb-4">
          <p className="text-navy font-bold text-sm">“{request.body.slice(a.start, a.end)}”</p>
          <p className="text-brand-red text-xs font-bold mt-0.5">
            {t(`assignments.category.${a.category}`)}
          </p>
          <p className="text-navy/70 text-sm mt-1">{a.note}</p>
        </div>
      ))}

      {feedback.overall && (
        <div className="bg-brand-yellow/20 border-2 border-navy rounded-2xl p-4 mb-4">
          <p className="text-navy text-sm">{feedback.overall}</p>
        </div>
      )}

      {/* The reviewer's university badge, where they have one. This is what
          makes the feature demonstrable to an institution without the badge
          being a permission that would starve supply. */}
      {feedback.reviewer?.university_domain && (
        <p className="text-navy/60 text-xs mb-4">
          🎓 {feedback.reviewer.university_domain}
        </p>
      )}

      {canAcknowledge && (
        <button onClick={onAcknowledge}
          className="bg-brand-red text-white px-5 py-2.5 rounded-full text-sm font-bold border-2 border-navy">
          {t('assignments.acknowledge')}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write the page**

```javascript
// app/assignments/[id]/page.js
'use client'
import { useState, useEffect, use } from 'react'
import { useLanguage } from '../../../lib/i18n/LanguageContext'
import Navbar from '../../../components/Navbar'
import AnnotationEditor from '../../../components/AnnotationEditor'
import FeedbackView from '../../../components/FeedbackView'

const API = 'https://linguaxchange-backend-production.up.railway.app'

export default function AssignmentPage({ params }) {
  const { id } = use(params)
  const { t } = useLanguage()
  const [request, setRequest] = useState(null)
  const [user, setUser] = useState(null)

  const load = () => {
    fetch(`${API}/api/assignments/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(setRequest)
      .catch(() => setRequest(null))
  }

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    load()
  }, [id])

  if (!request) return (<><Navbar /><main className="px-4 py-10 max-w-3xl mx-auto" /></>)

  const feedback = (request.assignment_feedback || [])[0]
  const isStudent = user && user.id === request.student_id

  const acknowledge = async () => {
    await fetch(`${API}/api/assignments/${request.id}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    load()
  }

  return (
    <>
      <Navbar />
      <main className="px-4 py-10 max-w-3xl mx-auto">
        <h1 className="font-display font-extrabold text-navy text-2xl mb-1">{request.prompt}</h1>
        <p className="text-navy/50 text-sm mb-6">{request.language_code}</p>

        {feedback ? (
          <FeedbackView request={request} feedback={feedback}
            canAcknowledge={isStudent && !feedback.acknowledged_at}
            onAcknowledge={acknowledge} />
        ) : isStudent ? (
          <p className="text-navy/60">{t('assignments.awaiting')}</p>
        ) : (
          <AnnotationEditor request={request} onSent={load} />
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 4: Verify end to end**

```bash
npx next build
```

Then, with two accounts: post a request as the student, open it as a native speaker of that language, select a span, tag it, add a note, send. Confirm the student sees the annotation against the right words, acknowledges, and the reviewer's balance increases by one.

- [ ] **Step 5: Commit**

```bash
git add app/assignments components/AnnotationEditor.js components/FeedbackView.js
git commit -m "Add the annotation editor and feedback view"
```

---

## Integration checks before release

The unit tests cover the pure rules. These three need two accounts and a
running server, and each one is a place where the money can go wrong:

- [ ] **A second reviewer is refused.** Two reviewers open the same request and
  both submit. The second gets `409 Someone answered this first`, from the
  unique constraint rather than from application logic. Only one
  `assignment_feedback` row exists afterwards.

- [ ] **Withdrawing an answered request does not double-refund.** Post, have it
  answered, then attempt to withdraw. Expect `400`, and confirm the student's
  balance is unchanged.

- [ ] **Acknowledging after automatic release does not pay twice.** Insert a
  feedback row with `created_at` more than 72 hours ago, run the cron once so
  the automatic release fires, then acknowledge through the API. Expect
  `{ success: true, already: true }` and exactly one `earned_feedback`
  transaction for that reviewer.

---

## Notes for whoever executes this

**Task 1 must be run by a human** in the Supabase SQL editor. There is no migration runner in this project; every migration so far has been applied by hand.

**Tasks 1 to 7 are backend and independently testable** through `curl` against a local server. Do not start Task 8 until the API works, or you will be debugging two layers at once.

**The `body` round-trip is the fragile part.** If annotations land on the wrong words, suspect normalisation between the database and the browser before suspecting the offset arithmetic.

**Do not add a field anywhere that accepts a corrected sentence.** That absence is the feature.
