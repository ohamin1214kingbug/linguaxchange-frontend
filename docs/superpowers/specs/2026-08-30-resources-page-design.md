# Resources Page — Design

**Date:** 2026-08-30
**Status:** Approved for planning
**Scope:** Spanish, levels A1–B2, learner audience. One admin-managed resource per (language, level, audience).

## Why this first

LinguaXchange has roughly two active users and eight classes. A marketplace with no supply cannot be grown by adding marketplace features. The resources page is the only planned feature that delivers value with zero users: it is static, indexable, and shareable, and it gives the project something concrete to send to universities and to post in language-learning communities.

It is therefore built as a growth asset first and a product feature second. Every decision below favours reach over conversion.

## Scope

**In scope for v1**

- Spanish only, levels A1, A2, B1, B2
- Learner audience only ("what to study at this level")
- Admin creates and manages every resource; users never upload
- Public read with no authentication
- Each resource is a guide LinguaXchange writes and hosts, optionally linking to the official exam syllabus it aligns with

**Out of scope for v1**

- Teacher-audience guides ("what to teach", "how to teach"). The schema carries an `audience` column from day one so these need no migration later.
- Other languages. Adding one is data entry, not code.
- Long-form article bodies per resource. Revisit if these pages rank.
- User-submitted resources.

**Explicitly deferred, tracked elsewhere**

- `hreflang` / `alternates.languages` in `app/layout.js`. The site has five full translations and currently claims none of them to search engines. Same SEO effort, unrelated feature.

## Content source and licence

The candidate source was UNED's *prueba libre* syllabus pages for Spanish A1, A2 and B1. Checked 2026-08-30, both findings were disqualifying:

- The pages carry no PDFs at all. They are HTML syllabus pages, so there was never a file to host.
- The footer reads "© 2024 UNED. ALL RIGHTS RESERVED" — no open licence of any kind.

So none of that material can be hosted, and reproducing the syllabus prose is out. Retyping the same topic list in the same order is also out: in the EU the selection and arrangement of a syllabus can attract database right independently of copyright.

**LinguaXchange writes its own guides.** What a CEFR level covers is fact — present indicative, greetings, nationalities — and facts carry no copyright. Guides are written upward from the CEFR descriptors rather than downward from any one institution's page, which keeps clear of the database-right problem as well.

This is not merely the safe option, it is the better one. A page of outbound links has no unique content and ranks for nothing, which would abandon the reason this feature is being built first. Guides we own are indexable, quotable and attributable to us.

Each guide names the official exam syllabus it aligns with and links to it. Naming a public university's public exam as a reference is ordinary nominative use, and it supplies exactly the credibility a university partnership needs.

Rules:

- Never host third-party material without a confirmed licence.
- `source_url` is a reference link, not a content source. Nothing is copied from it.
- `attribution` stays empty for material we wrote. It is only for third-party material under a confirmed open licence, and it renders on the page when set.

## Data model

```sql
create table resources (
  id serial primary key,
  language_code text not null,           -- KO/ES/DE/EN/PT/FR/IT
  level text not null,                   -- A1..C2
  audience text not null default 'learner',
  title text not null,
  description text,
  pdf_url text,                          -- our hosted guide; required to publish
  source_url text,                       -- optional official syllabus we align with
  attribution text,                      -- only for third-party material under an open licence
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (language_code, level, audience)
);
alter table resources enable row level security;
```

RLS is enabled with no policies, matching every other table in this project: the backend uses the service-role key and the frontend never queries Supabase directly, so this closes the anon-key hole without needing policies.

The unique constraint on `(language_code, level, audience)` is what makes the public grid a simple lookup and prevents duplicate cells.

A row without `pdf_url` is incomplete and is not rendered publicly. `source_url` is optional and independent — a row may carry both.

## Where the guides come from

The guide text is written and version-controlled as Markdown in `docs/resources/{language}-{level}.md` — `es-a1.md`, `es-a2.md`, `es-b1.md`, `es-b2.md` are already drafted. Markdown is the editable source of truth; the PDF is a build output.

Converting Markdown to PDF is a manual step for now: export once per guide and upload through the admin tab. Three guides do not justify a conversion pipeline, and the upload endpoint does not care how the file was produced. Automate it if the guide count grows past roughly a dozen or the guides start changing often.

## Storage

New Supabase bucket `resources`: public, PDF only, 10MB ceiling — the same configuration as the existing `class-materials` bucket.

Object path is `{language_code}-{level}-{audience}.pdf`, stable across re-uploads, written with `upsert: true`. Because the path is stable, the stored URL carries a `?v={timestamp}` cache-buster; without it a replaced PDF keeps serving the old cached copy.

## Backend

New `routes/resources.js`, mounted at `/api/resources` in `index.js`.

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/resources` | public | List every published resource |
| `GET /api/resources/all` | admin | List every resource, drafts included |
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

**`/resources/[language]/[level]`** — title, description, language and level chips, and "Download PDF" as the primary action. When `source_url` is set, a secondary "Official exam syllabus" link renders beneath it (`rel="noopener"`), clearly subordinate to the guide itself. Attribution renders below that when present. Per-page `metadata` sets title, description and Open Graph tags.

**`app/sitemap.js`** currently returns four hardcoded URLs. It becomes dynamic, fetching resources and emitting one entry per complete row alongside the existing static paths. This is the mechanism by which the feature actually reaches search engines; without it the pages exist but are undiscoverable.

**Entry points** — a Resources link in the navbar and in the homepage footer. Without these the page is reachable only by URL, which is the state `/admin` is in today.

## Admin

A fifth tab in `/admin`, alongside users, classes, reports and credits, following the same pill-tab pattern already in that file.

The form carries: language select, level select, title, description, PDF upload, an optional source URL, and an optional attribution. Below it, a list of existing resources with replace and delete.

Validation worth enforcing in the UI, not only the API: a resource cannot be published without a PDF, and any resource carrying `attribution` must say which licence permits it.

## Internationalisation

Page chrome on the grid page — headings, buttons, empty states, the grid labels — follows the existing pattern in `lib/i18n/translations.js` with keys added to all five languages (EN, KO, ES, DE, PT).

The detail page is the exception, and is English-only. It has to be server-rendered so a crawler sees the content without running JavaScript, and this project's translation layer is a client-side React context that a server component cannot call. Translating it means moving i18n server-side, which is a larger change than this feature. The page's own chrome is kept minimal so the untranslated surface stays small.

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
- confirm a row with both `pdf_url` and `source_url` renders the download first and the syllabus link second
- confirm an empty grid cell is not a link

## Risks

**Content is the bottleneck, not the code.** The build is roughly a day. Writing four good A1–B2 guides is the long pole. Do not ship the page with a single document in it; an almost-empty resources page reads worse than no resources page.

**Guide quality is the whole bet.** Because the guides are ours, nothing else props them up: a thin guide is a page that ranks for nothing and embarrasses us in front of a university. They need to be genuinely useful to a learner deciding what to study next.

**The sitemap change is the feature.** If `app/sitemap.js` is left static, the pages are built and then never found, and the entire justification for building this first evaporates.
