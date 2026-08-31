# University Badge and Participation Record — Design

**Date:** 2026-08-31
**Status:** Approved for planning
**Scope:** Email verification against an allowlist of university domains, and a revocable share link showing what a member has actually done on the site.

## Why these two together

The stated long-term goal is collaborating with universities. Two things have to exist before that conversation can happen, and they share a data model, so building them separately would mean touching the same migration twice.

**The badge** is how the site can say "we have N verified students at your institution." Without it there is no way to distinguish a student from anyone else, and no way to answer the first question a university office will ask.

**The record** is how a university sees what those students did. Universities fund what they can measure. Right now nothing on the site is provable to a third party: a member can say they attended six classes, and nobody can check.

Both are useful before any partnership exists. The badge lowers the barrier to joining a video call with a stranger, which is the site's hardest ask. The record gives a student something for an Erasmus application or a CV.

## Scope

**In scope**

- Verifying a university email address against an allowlist, by emailed token
- A badge on the profile and teacher profile, showing the university and the date verified
- A participation record at an unguessable, revocable URL
- Admin-managed allowlist, seeded with Universidad Complutense de Madrid

**Out of scope for v1**

- **The badge gates nothing.** No students-only classes, no filter, no permissions. That is a permission model and a separate decision, worth making only once it is known whether anyone verifies at all.
- Bulk or institutional verification. One member, one address.
- Automatic re-verification. A graduate keeps a working address for years; see Risks.
- Any paid service. Email goes through Resend, already in use and free at this volume.

## Data model

```sql
create table if not exists university_domains (
  domain text primary key,        -- 'ucm.es', lowercase, no leading @
  name text not null,             -- 'Universidad Complutense de Madrid'
  created_at timestamptz not null default now()
);

alter table users add column if not exists university_email text unique;
alter table users add column if not exists university_domain text;
alter table users add column if not exists university_verified_at timestamptz;
alter table users add column if not exists university_token text;
alter table users add column if not exists university_token_expires timestamptz;
alter table users add column if not exists record_token text unique;

alter table university_domains enable row level security;
```

RLS enabled with no policies, matching every other table here: the backend holds the service-role key and the frontend never queries Supabase directly.

`university_email` is unique so the same address cannot verify two accounts. `university_domain` is stored rather than derived at read time, so the badge needs no join on every profile render; the display name is looked up from `university_domains` when the profile loads.

Adding a university is an insert, not a deploy.

## Domain matching

The rule is exact, case-insensitive equality on the part after the last `@`:

- `Student@UCM.ES` matches `ucm.es` — the address is lowercased before comparison
- `alumno@estudiantes.ucm.es` does **not** match `ucm.es` — a subdomain is its own row if it should qualify
- `attacker@ucm.es.evil.com` does **not** match

That last case is why this is equality and never a suffix or `includes` test. An `endsWith('ucm.es')` check would accept `ucm.es.evil.com` and issue a badge asserting the holder is a Complutense student.

## Verification flow

It mirrors the password reset at `routes/auth.js:312`, because that flow already solves this problem correctly and its shape is known-good in this codebase.

1. Member submits a university address from settings.
2. The domain is checked against the allowlist. An unknown domain is rejected with a message naming the supported universities, so the member knows to ask rather than assume the site is broken.
3. A raw token is generated with `crypto.randomBytes(32).toString('hex')`. Its SHA-256 hash goes in `university_token` with a 24-hour expiry. **The raw token exists only in the email.**
4. The email links to `${FRONTEND_URL}/university/confirm?token=<raw>`, sent through `utils/mailer.js`'s `sendEmail({ to, subject, text })`.
5. That page posts the token back. The backend hashes it, finds the user, checks the expiry, sets `university_domain` and `university_verified_at`, and clears both token columns.

**Step 2 does not reveal whether an address is already taken.** Like the reset flow's generic response, it reports that a confirmation email has been sent either way. Otherwise the endpoint becomes a way to test which university addresses already have accounts.

Sends are rate-limited with the existing middleware in `middleware/rateLimit.js`.

## The record

**It counts only what the site can prove.** Nothing self-declared appears.

- Classes attended: rows where `enrollments.attended = true`
- Classes taught: classes owned by the member whose sessions have finished, using the same "has this actually happened" rule as `lib/classSchedule.js` rather than a status flag that nothing sets
- Hours: summed from `classes.duration_minutes`
- Languages and levels covered, as distinct values
- First and last activity date
- The university badge and its verification date, when present
- The date the record was generated

A member with no attended and no taught classes gets a record saying so, rather than an empty page. An honest empty record is more credible than a broken one.

## Backend

Two new route files, mounted in `index.js`.

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/university/domains` | public | the allowlist, for the settings UI |
| `POST /api/university/verify` | user | validate the domain and send the email |
| `POST /api/university/confirm` | public | redeem a token |
| `POST /api/records/share` | user | create or rotate the share token |
| `DELETE /api/records/share` | user | revoke it |
| `GET /api/records/:token` | public | the record |

`GET /api/records/:token` is deliberately unauthenticated — the point is handing the link to someone with no account. The token is the credential, which is why it is 32 random bytes and why rotating it invalidates every link previously shared.

Two pure helpers carry the logic worth testing, following `utils/reports.js`:

- `utils/universityDomains.js` — `matchDomain(email, allowlist)`, returning the matched row or null
- `utils/participation.js` — `summarise(enrollments, taughtClasses)`, returning the counted record

## Frontend

**`/settings`** gains a University section: an address field, the current state, and a resend. Once verified it shows the university name and the date.

**`/university/confirm`** redeems the token and reports success or expiry. Same shape as the existing reset-password page.

**`/record/[token]`** is a server component, so the page works without JavaScript for whoever receives the link. It sets `robots: { index: false, follow: false }`, and `/record/` is added to `Disallow` in `app/robots.js`. Print styles are the export path — browser print-to-PDF, no PDF library.

**The badge** appears on the profile and the teacher profile, showing the university name and the verified date.

Strings follow `lib/i18n/translations.js` in all five languages. The record page itself is English-only, like the guide and class pages and for the same reason: it is a server component, and the translation layer is a client-side context.

## Privacy

The record names a real person and lists their activity. That is why:

- The URL is unguessable rather than sequential, so `/record/41` cannot be walked to `/record/42`
- It is `noindex` and disallowed in robots, so it never enters a search index
- The member creates it deliberately, and rotating the token kills every link already shared
- No email address appears on the record — the university is named, the address is not

The verification address is stored because uniqueness has to be enforced, but no public route exposes it.

## Testing

**Backend, Jest, matching `tests/reports.test.js`:**

- `matchDomain` accepts `Student@UCM.ES` against an allowlist entry of `ucm.es`
- `matchDomain` rejects `attacker@ucm.es.evil.com` — the case a suffix test would wrongly accept
- `matchDomain` rejects a subdomain that is not itself listed
- `matchDomain` rejects an address with no `@`, an empty string, and a non-string
- `summarise` sums hours from `duration_minutes` across attended and taught
- `summarise` counts distinct languages and levels rather than repeating them
- `summarise` returns zeroes, not a crash, for a member with no activity

**Manual:**

- Verify a real `ucm.es` address end to end; confirm the badge and date appear
- Confirm an expired token is refused
- Confirm the same address cannot verify a second account
- Open a record link in a logged-out private window
- Rotate the token and confirm the previous link stops working
- Confirm `/record/<token>` carries `noindex` and is absent from `/sitemap.xml`

## Risks

**A badge outlives the studentship.** University addresses keep working after graduation, so "verified student" drifts into "was a student". Both the badge and the record therefore show the verification *date* rather than implying currency. Re-verification is deferred until it matters.

**The allowlist is the whole trust model.** The badge means exactly as much as the care taken adding rows to `university_domains`. Adding a domain anyone can obtain an address at would quietly devalue every badge already issued.

**Nobody may verify.** With two active members, the immediate audience is approximately zero. This is worth building because it is cheap and it is the prerequisite for the partnership conversation — not because it will be used next week. Building the permission model on top of it now would be speculative, which is why v1 gates nothing.
