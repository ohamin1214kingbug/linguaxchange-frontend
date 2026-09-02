# Assignment Feedback — Design

**Date:** 2026-09-03
**Status:** Approved for planning
**Scope:** A student posts a short passage in a language they are learning and pays one banana. A native speaker answers with tagged annotations on spans of the text plus one short overall comment. No corrected text, anywhere, by construction.

## Why this, and why now

The site has four upcoming classes and no enrolments this month. That is not a demand problem; it is a coincidence problem. **A live class needs a teacher and a student free at the same hour.** With five accounts that almost never happens, and no amount of feature work changes the arithmetic.

Feedback on writing is asynchronous. It needs only that somebody gets to it eventually. A marketplace this thin can support asynchronous work long before it can support synchronous work, which makes this the first feature that has a chance of being used by the people already here.

It also serves the two stated goals at once. University collaboration is a distribution strategy — one conversation puts fifty students on the site. Public growth is a compounding strategy — the guides rank and bring strangers. Assignment feedback is useful to both audiences without forking the product, because it is not a university-specific feature.

## The line this feature sits on

Correcting university coursework is close to academic misconduct, and the site's stated goal is institutional partnership. A service known for fixing UCM essays is the specific thing that gets named in an academic-integrity policy.

So the product is **language feedback, never corrected text**. The reviewer marks what is wrong and explains why. They do not supply the fixed sentence.

This is enforced by the shape of the form rather than by a rule in the guidelines: no field accepts a rewritten version. That is not the same as being impossible — see Risks — but a policy expressed as an absent input field is obeyed far more often than one expressed as a paragraph nobody reads.

The tagged categories are what make this defensible. After five requests a student can be shown that they have been told *verb agreement* eleven times. A corrected document cannot do that, which is the honest answer to why this is a teaching tool rather than an essay service.

## Scope

**In scope**

- A student posts up to 300 words, with a prompt saying what they were trying to write, for one banana
- A public board of open requests, filterable by language
- Any native speaker of that language may answer; first response wins
- Feedback is a set of annotations (span, category, note) plus one short overall comment
- Expiry with automatic refund when nobody answers
- Banana released to the reviewer on acknowledgement, or automatically after 72 hours
- A weekly cap on bananas earned from reviewing
- University badge displayed on feedback where the reviewer has one

**Out of scope for v1**

- Editing feedback after submission
- Threaded replies or conversation between student and reviewer
- More than one reviewer per request
- Ratings or reviewer reputation
- File upload of any kind. Text is pasted. File in / file out is the interaction that invites a corrected document back, and avoiding it removes storage, virus scanning and format handling entirely
- Rich text. Plain text only; annotation offsets depend on it
- A second currency. See Economy

## Data model

Two tables.

```sql
assignment_requests
  id              serial primary key
  student_id      integer not null references users(id)
  language_code   text not null            -- KO/ES/DE/EN/PT/FR/IT
  level           text                     -- nullable; CEFR stored, as everywhere else
  prompt          text not null            -- "what were you trying to say?"
  body            text not null            -- the passage; immutable once posted
  expires_at      timestamptz not null
  credit_refunded_at timestamptz
  created_at      timestamptz not null default now()

assignment_feedback
  id              serial primary key
  request_id      integer not null unique references assignment_requests(id)
  reviewer_id     integer not null references users(id)
  annotations     jsonb not null           -- [{start, end, category, note}, ...]
  overall         text                     -- one short comment, hard length limit
  created_at      timestamptz not null default now()
  acknowledged_at timestamptz
  credit_released_at timestamptz
```

`request_id` is unique, which is how "first response wins" is enforced: the database rejects the second submission rather than the application checking and racing. This is the same reliance on a constraint rather than application logic that `enforce_class_capacity.sql` already uses for seats.

Annotations are `jsonb` rather than a third table because they are only ever read alongside their feedback and never queried on their own. Category statistics remain possible through `jsonb_array_elements` when the learning-record view is built.

Every timestamp is `timestamptz`. The database has no naive timestamp columns as of 2026-09-02 and must not gain one.

`level` stores CEFR. Korean requests display it through `levelLabel`, so a Korean board entry reads `A2 · TOPIK 2` while a Spanish one reads `A2` — the same rule as classes and guides. Storing TOPIK here would break the cross-language filter for the same reason it would there.

### body is immutable

Annotation offsets point into `body`. If the text could be edited after feedback existed, every annotation would silently move onto the wrong words — a corruption with no error and no way to detect it after the fact. There is no update path for `body`; a student who wants to change the text withdraws and posts again.

Offsets are computed against the exact stored string. The server must not normalise whitespace or Unicode on read, or the offsets it hands the frontend will not match the text the frontend renders.

## Lifecycle

```
open ──answered──> answered ──acknowledged──> acknowledged
 │                    │
 │                    └── 72h ──> auto-released
 └── 72h unanswered ──> expired, banana refunded
```

Expiry is evaluated on read, not by a cleanup job, matching `routes/classRequests.js`. Nothing looks at stale rows, so deleting them buys nothing.

Both timers ride the cron that already runs every five minutes — the one whose secret drift left it 401ing from cron-job.org between July and 2 September. `refundExpiredRequests` already does exactly this shape of work for class requests and is the model to follow: claim the row with a conditional update first, so two overlapping ticks cannot refund the same request twice.

## Economy

**Cost:** one banana to post a request. Same as a class.

**Limit:** 300 words. A banana buys a 60-minute class; if it also bought careful annotation of a 2,000-word essay, nobody would ever choose to teach. 300 words is roughly ten minutes of a reviewer's time — small enough that someone says yes on a bus, which is the behaviour an open board depends on. Students with longer texts split them across requests.

**Earning:** the reviewer earns one banana, released when the student acknowledges or automatically 72 hours later. Acknowledgement mirrors attendance confirmation, where the recipient releases the credit rather than the provider claiming the work is done. The automatic release exists because at this size one unresponsive student is enough to make a reviewer decide the feature is not worth their time.

**Cap:** at most three bananas per reviewer per rolling seven days from feedback.

Without a cap, reviewing is strictly better than teaching — the same banana for a tenth of the work — and the rational response is to stop offering classes. Live classes are the part universities would actually want, so the economy must not quietly compete with them.

### A separate transaction type, and what follows from it

Feedback earnings get their own `credit_transactions` type rather than reusing `earned`.

The cap then becomes an exact count of typed rows over a window, rather than a string match on a description field.

And `creditSpendGate.hasEverTaught` continues to count only `earned`, so **reviewing does not exempt a user from the anti-freeloading gate**. Someone who only ever corrects paragraphs still cannot drain their last banana without teaching. This was going to happen by accident had feedback reused `earned`; making it a distinct type resolves it in the direction that protects live classes.

`credit_transactions.type` is a closed `CHECK` list (see `fix_credit_transactions_type_constraint.sql`). Adding a type requires a migration, and an insert of an unlisted type fails silently from the application's point of view.

### Why not a second currency

A separate "banana peel" for assignment help was considered and rejected.

It breaks on one question: who wants peels? Reviewers earn them, and the only thing a peel buys is having your own writing reviewed — a service a native speaker of that language does not need. The incentive to review collapses, unless peels convert to bananas, at which point it is one currency with an exchange rate to argue about.

It also doubles the explanation burden. The banana already needed an in-product explainer shown on every page load because one currency was not obviously understood. Two would need two balances, two ledgers, two low-balance nudges, two navbar displays, and two things to explain to a university.

The weekly cap solves the same problem — feedback must not become the easy way to farm bananas — with one integer and no new concept. A second currency becomes the right answer if feedback volume ever dwarfs classes and the two economies genuinely need separate prices; adding it then is no harder than adding it now.

The banana peel is kept as the **icon** for assignment requests. It carries the association without the ledger.

## Permissions and provenance

A reviewer must have the request's language as their declared native language (`users.teach_language`), and must not be the student.

No other gate. A university-only restriction was considered and rejected: the site has one verified user, so it would starve the feature before it had any.

Where the reviewer has `university_verified_at`, the badge shows on the feedback. This is what makes the feature demonstrable to an institution — "your students get feedback from verified members of your university" — without the badge being a permission. `users.university_domain` and `university_verified_at` are already in the public column whitelist; the email columns are not and must stay out.

## Backend

New router, `routes/assignments.js`:

- `GET /` — the open board. Public, like the class-request board: the point is that reviewers can see demand. Expired requests are filtered on read
- `POST /` — post a request. Validates language, word count and prompt; charges one banana through the existing atomic RPC
- `DELETE /:id` — withdraw your own before it is answered; refunds
- `POST /:id/feedback` — submit feedback. Rejects the reviewer's own request, a language mismatch, a second submission (unique constraint), and a reviewer over their weekly cap
- `POST /:id/acknowledge` — student releases the banana. Idempotent by conditional transition, like attendance confirmation

New `utils/assignmentValidation.js` for the pure parts — word count, annotation shape, offset bounds — so they are testable without a database, matching how `utils/resources.js` and `utils/classRequests.js` are split today.

Every failed database call goes through `utils/failure.js`. No route returns a raw Postgres message.

### Word counting is a validation decision, not a detail

"300 words" needs one definition, applied server-side, and the client must use the same one or the counter will disagree with the error message. Whitespace-separated tokens after trimming is the proposed rule. It is wrong for Korean, where spacing is not word-delimited in the way it is in Spanish — a 300-"word" Korean passage is substantially longer than a Spanish one. Accepted for v1 and recorded under Risks.

## Frontend

- `/assignments` — the board, with the language filter, mirroring the class-requests tab
- `/assignments/new` — post a request; live word counter using the server's counting rule
- `/assignments/[id]` — the request, its feedback if any, and the annotation editor for a qualifying reviewer

The annotation editor is the only genuinely new interaction on the site: select a span of rendered text, choose a category, write a note. Everything else follows existing patterns.

Categories are a fixed list, translated in all five languages, stored as stable keys rather than display strings so that translating them later does not orphan existing data.

## Notifications

`notifications.type` is a closed `CHECK` list. This needs a migration adding at least `assignment_answered`, following `add_credit_added_notification_type.sql`. An insert with an unlisted type fails silently, so the migration must land before the code that writes it.

## Abuse

The existing report route is the backstop. There is no new moderation surface in v1.

The payment gate is not a quality gate: auto-release means poor feedback is eventually paid. That is a deliberate trade — the alternative leaves honest reviewers unpaid by unresponsive students, which at five users is the more damaging failure.

## Testing

Pure functions get unit tests, following `tests/`:

- Word counting at the boundary: 299, 300, 301, and the same passage with irregular whitespace
- Annotation validation: offsets outside the body, inverted ranges, overlapping spans, unknown categories, empty notes
- The weekly cap at the boundary: third submission of the week succeeds, fourth is refused, and the window rolls correctly
- Expiry and refund selection, mirroring the existing `refundExpiredRequests` tests

Integration checks worth doing by hand before release: a second reviewer's submission is refused by the unique constraint; withdrawing an answered request does not double-refund; an acknowledgement after auto-release does not pay twice.

## Risks

**The policy is enforced by form shape, not inspection.** A reviewer can still type corrected sentences into the overall comment. Mitigated by keeping that box short and visible, and by the report route — not by claiming it is impossible. If it becomes common, the response is a shorter limit or moderation, not abandoning the feature.

**Non-Spanish languages will get silence.** Most current users are Spanish natives, so Korean, German and Italian requests will often expire unanswered. Expiry-and-refund makes that harmless rather than solved. It is the same cold-start the class board has, and the honest position is that this feature does not fix it.

**Word counting is wrong for Korean.** A 300-word Korean passage under whitespace counting is materially longer than a Spanish one, which means Korean reviewers are underpaid relative to Spanish ones for the same banana. Revisit with a character-based limit for CJK if Korean requests become common.

**The cap is a guess.** Three per week is not derived from anything. It should be revisited once there is data on whether reviewing actually competes with teaching, and it should be a constant in one place so that changing it is a one-line edit.

**Annotation offsets are fragile across normalisation.** If any layer trims, collapses whitespace or normalises Unicode between storage and rendering, annotations land on the wrong words silently. The body must round-trip byte-identical from database to browser.

## Decisions that would otherwise surface during planning

**The board is a third tab on `/classes`, beside Classes and Student requests.** Not a new top-level nav entry. The navigation already fails at 375px with five items — on 2026-09-02 both *Explore* and *Sign in* were hidden with no menu to reveal them, and a returning student on a phone could not log in. Adding a sixth item makes that worse. The tab strip is also where someone already looks to ask "what can I do here".

**A student cannot withdraw a request once it has been answered.** Withdrawal exists only while a request is open. The reviewer has already done the work by then, and a withdrawal that took the banana back would make reviewing unsafe — the one thing the economy cannot afford at this size. After an answer the student's only actions are acknowledging, or letting the automatic release happen.

**One shared category list across all seven languages**, stored as stable keys and translated for display: word order, agreement, tense and aspect, vocabulary choice, register, spelling, punctuation, naturalness, and grammar-other.

Per-language lists were considered and rejected for v1: they multiply the translation work by seven and there is no evidence yet about which categories reviewers actually reach for. `grammar-other` is the escape hatch, and its usage rate is the signal for what to add — if Korean reviewers keep selecting it, that is the argument for adding *particles* and *spacing* as Korean-specific entries.
