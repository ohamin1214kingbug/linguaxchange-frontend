# Reporting a user, and doing something about it

**Date:** 2026-09-03
**Status:** design, approved in chat, not implemented

## The problem

Someone is harassed in a class or in a message. Today they can file a report:
`POST /api/reports` exists, the `reports` table is live, and the admin
dashboard has a Reports tab that lists pending and handled reports.

Then nothing happens. The queue shows the reporter's name and a bare numeric
id for whoever they reported. There is no way to attach a screenshot, no
category to say what kind of incident it was, and — the part that matters —
no action an admin can take. There is no suspend, no ban, and no delete
button anywhere in the moderation flow. A confirmed harasser keeps their
account.

This design closes that loop: report with evidence, review it, act on it.

## What already exists

Worth being precise about, because most of the reporting half is built.

| Piece | State |
|---|---|
| `reports` table | Live. `id, reporter_id, report_type, reported_id, reported_type, reason, status, notes, created_at, updated_at` |
| `POST /api/reports` | Any signed-in user. Validates through `utils/reports.js`. |
| `GET /api/reports` | Admin queue, newest first, joins the reporter |
| `PATCH /api/reports/:id` | Admin sets status and notes |
| Admin Reports tab | Renders pending and handled |
| Report button | On the teacher profile page |
| `utils/accountDeletion.js` | Anonymize-not-delete, already used by self-service account deletion |
| `token_valid_after` | Per-user cutoff that invalidates issued JWTs |

What is missing is evidence, categories, the reported user's identity in the
queue, and every enforcement action.

## Reporting

### Categories

`reports.category`, a new column with a CHECK constraint:

`harassment`, `inappropriate_content`, `spam_or_scam`, `no_show`, `other`

The existing free-text `reason` stays and stays required — a category alone
never tells you what happened. Categories exist so the queue can be sorted by
severity rather than only by date, and so "harassment" never sits unread
below eight no-shows.

`no_show` is included because it will otherwise be filed as `other` on day
one. It is the most common complaint on a booking site and it is not a
safety issue; keeping it separate stops it from diluting the ones that are.

### Evidence

Up to 3 images per report, `jpeg`, `png` or `webp`, 5MB each.

Uploaded as base64 in the JSON body to the backend, which writes them with
the service-role key. This is the same trust boundary the avatar upload and
the class-material PDF upload already defend the same way (`routes/users.js`,
`utils/pdfUpload.js`): the browser never holds a Supabase key, and the
storage policies stay shut.

The bytes are validated, not the declared MIME type. A base64 payload can
claim to be anything; `utils/pdfUpload.js` already checks the `%PDF-` magic
bytes for exactly this reason, and the image path needs the equivalent.

**The bucket is private.** Every existing bucket on the site is public and
served through `getPublicUrl` — that is correct for an avatar and wrong for
a screenshot of someone being harassed. A public URL is permanent,
unauthenticated and shareable; evidence must not have one. The admin views
it through a signed URL minted on request, expiring in 60 minutes.

New column: `reports.evidence_paths text[]`, storage paths rather than URLs,
because a signed URL is generated per view and a stored one would be a
stale link within the hour.

### Rate limit

One open (`pending`) report per reporter per reported user. A second attempt
returns 409 with a message saying the existing report is still being
reviewed.

This is the cheapest defence against a retaliation flood: someone who has
just been reported filing twenty reports back. It does not stop a determined
person with several accounts, and it is not meant to — phone verification
and `utils/phoneAccountLimit.js` are the control for that.

## Reviewing

### The queue

`GET /api/reports` gains the reported user — name, email, user code, and
their current suspension state. An admin should not have to cross-reference
`U000012` against the Users tab to know who they are ruling on.

Not a PostgREST embed: `reported_id` is a class id when `report_type` is
`'class'`, so a foreign key to `users` cannot exist on that column and an
embed would be wrong for half the rows. The route reads the ids of the
user-type reports and fetches those users in one follow-up query.

`reported_type` duplicates `report_type` (`utils/reports.js` sets both from
the same field). Left alone here — collapsing a redundant column is a
migration with no user-visible benefit, and this change is already touching
the auth path.

Sort: pending first, then by category severity (harassment above no-show),
then newest first.

Each report card shows the reporter, the reported user, the category, the
reason, the evidence thumbnails, and the enforcement buttons.

### Evidence viewing

`GET /api/reports/:id/evidence/:index` — admin only, returns a 60-minute
signed URL. Rendered as a thumbnail that opens full size.

## Acting

Three outcomes. All three are admin-only and all three write to
`reports.notes` and set `status`, so the queue records what was decided.

### 1. Dismiss

`PATCH /api/reports/:id` with `status: 'rejected'`. Already built.

### 2. Suspend

New columns on `users`:

- `suspended_until timestamptz` — null means not suspended
- `suspension_reason text`

`POST /api/admin/users/:id/suspend` with `{ until, reason }`.
`POST /api/admin/users/:id/unsuspend` clears both.

A permanent ban is a far-future date rather than a separate boolean. One
column with one meaning beats two columns that can disagree.

**Enforcement point:** `middleware/auth.js`. `requireAuth` already reads the
user's row on every authenticated request to check `token_valid_after`, so
`suspended_until` joins that existing `select` — no extra query, no new round
trip. A suspended user gets 403 with the date their suspension ends.

**Live sessions:** suspending also bumps `token_valid_after` to now, which
invalidates every JWT already issued to that account. Without this, a
suspended user with an open tab keeps working until their token expires,
which is not a suspension.

**What suspension does not do:** it does not cancel their enrolments or
refund their students. If a suspended teacher has classes booked, those
classes still exist and their students are still enrolled. Handling that is
real work — refunds, notifications, whether a partial suspension should let
a teacher finish a course they started — and bolting a guess onto this
change would be worse than leaving it visible. The admin sees the user's
upcoming classes on the report card and cancels them by hand.

### 3. Delete

Reuses `utils/accountDeletion.js` unchanged. It anonymizes rather than
deleting the row, because `classes`, `class_enrollments`, `class_reviews` and
`credit_transactions` all cascade from `users(id)` — a real DELETE would take
other people's booking history and the financial record with it.

Guarded by a typed confirmation: the admin types the user's code
(`U000012`) to enable the button. It is irreversible and it sits inches from
Suspend, which is not.

## Notifying

The reported user is told they have been suspended, with the reason and the
end date, through the existing `utils/mailer.js`. Someone locked out with no
explanation will file a support request, and answering it by hand is worse
than sending the mail.

The reporter is told their report was reviewed and closed. Not what the
outcome was — that is the reported user's private matter, and telling a
reporter "we banned them" invites reports filed to get that result.

## What this does not include

- **Appeals.** A suspended user cannot contest it in-app; they email. Adding
  an appeals queue before a single suspension has ever been issued is
  building for a volume that does not exist.
- **Automatic action.** No threshold of reports auto-suspends anyone. Every
  action is a human decision. Auto-suspension is a brigading weapon.
- **Reporting from inside the classroom.** Reports are filed from a user's
  profile. A panic button inside the video call is a genuinely good idea and
  a separate piece of work.
- **Class reports.** `report_type: 'class'` already validates and stores.
  Enforcement here is user-only; a bad class is handled by talking to the
  teacher.

## Testing

Unit, no network, matching the existing suites:

- `utils/reports.js` — category validation, evidence count and size limits,
  image magic-byte checks against a PNG, a JPEG, and a text file renamed
  to `.png`
- Suspension window — active, expired, never-suspended, far-future
- `isTokenStillValid` against a bumped `token_valid_after`

Live verification before it is called done, in the pattern used for the
credit RPCs and the assignment feature:

1. File a report from a second account with an image attached
2. Confirm the evidence is **not** reachable at a public URL
3. Suspend that account, confirm an open session dies on its next request
4. Unsuspend, confirm access returns
5. Delete a throwaway account, confirm the classes it taught survive

## Order of work

1. Migration: `category`, `evidence_paths`, `suspended_until`,
   `suspension_reason`, private bucket
2. Suspension: middleware check, admin endpoints, token invalidation — the
   part with teeth, and the part that touches every route
3. Reporting: categories and evidence upload
4. Admin UI: enriched queue, evidence viewer, the three action buttons
5. Mail

Suspension lands before the reporting improvements deliberately. A better
report form with nothing behind it is the state we are already in.
