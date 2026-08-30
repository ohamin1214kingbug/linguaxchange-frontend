# Resources Page — Design

**Date:** 2026-08-30
**Status:** Approved for planning
**Scope:** Spanish, levels A1–B1, learner audience. One admin-managed resource per (language, level, audience).

## Why this first

LinguaXchange has roughly two active users and eight classes. A marketplace with no supply cannot be grown by adding marketplace features. The resources page is the only planned feature that delivers value with zero users: it is static, indexable, and shareable, and it gives the project something concrete to send to universities and to post in language-learning communities.

It is therefore built as a growth asset first and a product feature second. Every decision below favours reach over conversion.

## Scope

**In scope for v1**

- Spanish only, levels A1, A2, B1
- Learner audience only ("what to study at this level")
- Admin creates and manages every resource; users never upload
- Public read with no authentication
- A resource is either a hosted PDF or a curated outbound link

**Out of scope for v1**

- Teacher-audience guides ("what to teach", "how to teach"). The schema carries an `audience` column from day one so these need no migration later.
- Other languages. Adding one is data entry, not code.
- Long-form article bodies per resource. Revisit if these pages rank.
- User-submitted resources.

**Explicitly deferred, tracked elsewhere**

- `hreflang` / `alternates.languages` in `app/layout.js`. The site has five full translations and currently claims none of them to search engines. Same SEO effort, unrelated feature.

## Content risk

The Spanish source material comes from a third-party website whose licence is not yet established. This is the highest-risk part of the feature and it is a legal question, not a technical one.

The design removes the risk from the critical path: a resource row can point at a hosted PDF **or** at an external URL. Curated links can ship immediately regardless of licence. A PDF is only hosted once its licence is confirmed as public domain, Creative Commons, or owned outright.

Rules:

- Never host third-party material without a confirmed licence.
- When hosting CC or public-domain material, `attribution` is required and rendered on the page.
- When the licence is unknown or restrictive, set `source_url` and leave `pdf_url` null. The page links out.

## Data model

```sql
create table resources (
  id serial primary key,
  language_code text not null,           -- KO/ES/DE/EN/PT/FR/IT
  level text not null,                   -- A1..C2
  audience text not null default 'learner',
  title text not null,
  description text,
  pdf_url text,                          -- hosted copy, null when linking out
  source_url text,                       -- external original, null when hosted
  attribution text,                      -- required when pdf_url is set from a CC source
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (language_code, level, audience)
);
alter table resources enable row level security;
```

RLS is enabled with no policies, matching every other table in this project: the backend uses the service-role key and the frontend never queries Supabase directly, so this closes the anon-key hole without needing policies.

The unique constraint on `(language_code, level, audience)` is what makes the public grid a simple lookup and prevents duplicate cells.

A row with neither `pdf_url` nor `source_url` is incomplete and is not rendered publicly.

## Storage

New Supabase bucket `resources`: public, PDF only, 10MB ceiling — the same configuration as the existing `class-materials` bucket.

Object path is `{language_code}-{level}-{audience}.pdf`, stable across re-uploads, written with `upsert: true`. Because the path is stable, the stored URL carries a `?v={timestamp}` cache-buster; without it a replaced PDF keeps serving the old cached copy.

## Backend

New `routes/resources.js`, mounted at `/api/resources` in `index.js`.

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/resources` | public | List every complete resource |
| `GET /api/resources/:lang/:level` | public | One resource, for the detail page |
| `POST /api/resources` | admin | Create or update a row |
| `POST /api/resources/:id/pdf` | admin | Upload or clear the PDF |
| `DELETE /api/resources/:id` | admin | Remove row and stored object |

Reads are deliberately unauthenticated. Crawlers and logged-out visitors are the audience; requiring a token here would defeat the reason the feature is being built.

Writes use the existing `requireAuth, requireAdmin` middleware pair.

The upload handler mirrors `routes/classes.js` `POST /:id/materials-pdf` closely, because that endpoint already solves this problem correctly:

- base64 in a JSON body, so the browser never needs the Supabase anon key and storage policies stay shut
- `%PDF-` magic-byte check on the decoded buffer, since a base64 payload can claim any MIME type
- explicit 10MB check before upload, so a bad request fails with a useful message rather than a storage error
- `{ pdf: null }` clears the PDF and removes the stored object

Rather than copy that logic a second time, extract the shared parts (decode, validate, upload, cache-bust) into a small helper both routes call. This is the second real caller, which is the point at which sharing pays.

## Public pages

**`/resources`** — a language × level grid. In v1 only the Spanish row has content. Cells backed by a row are links; cells without one render greyed and unlinked, so sparse coverage reads as deliberate rather than broken. This matters: the grid will be mostly empty for a long time.

**`/resources/[language]/[level]`** — title, description, language and level chips, and a primary action that is either "Download PDF" (hosted) or "Open resource" (outbound, `rel="noopener"`). Attribution renders beneath when present. Per-page `metadata` sets title, description and Open Graph tags.

**`app/sitemap.js`** currently returns four hardcoded URLs. It becomes dynamic, fetching resources and emitting one entry per complete row alongside the existing static paths. This is the mechanism by which the feature actually reaches search engines; without it the pages exist but are undiscoverable.

**Entry points** — a Resources link in the navbar and in the homepage footer. Without these the page is reachable only by URL, which is the state `/admin` is in today.

## Admin

A fifth tab in `/admin`, alongside users, classes, reports and credits, following the same pill-tab pattern already in that file.

The form carries: language select, level select, title, description, an either/or between PDF upload and source URL, and attribution. Below it, a list of existing resources with replace and delete.

Validation worth enforcing in the UI, not only the API: a resource needs exactly one of PDF or source URL, and hosted PDFs sourced externally need attribution.

## Internationalisation

Page chrome — headings, buttons, empty states, the grid labels — follows the existing pattern in `lib/i18n/translations.js` with keys added to all five languages (EN, KO, ES, DE, PT).

Resource titles and descriptions are admin-entered content and are **not** translated. A Korean visitor will see Korean UI wrapped around an English or Spanish title. This is a known seam, accepted for v1 on the grounds that the resources are themselves language-specific and the audience for a Spanish A1 guide is reading Spanish or English anyway. If the page set grows past a handful of languages, revisit.

## Testing

**Backend**

- non-PDF payload rejected with a clear message
- payload over 10MB rejected
- a file whose bytes are not `%PDF-` rejected even when the MIME type claims otherwise
- write routes return 403 without an admin token
- read routes return 200 with no token at all

**Manual verification**

- upload a real PDF through the admin tab, then download it in a logged-out browser
- confirm the new URL appears in `/sitemap.xml`
- confirm a row with only `source_url` renders an outbound link rather than a download
- confirm an empty grid cell is not a link

## Risks

**Content is the bottleneck, not the code.** The build is roughly a day. Writing or sourcing three good A1–B1 guides is the long pole. Do not ship the page with a single document in it; an almost-empty resources page reads worse than no resources page.

**Licence uncertainty on the Spanish source.** Handled by the link-out path above, but it must be resolved before anything is hosted.

**The sitemap change is the feature.** If `app/sitemap.js` is left static, the pages are built and then never found, and the entire justification for building this first evaporates.
