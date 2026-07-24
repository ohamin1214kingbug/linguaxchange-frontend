# LinguaXchange — Progress Notes

_Last updated: 2026-07-24. Written so a fresh Claude session can pick up this project with zero prior context._

## 1. Project overview

LinguaXchange is a language-exchange platform where students book/join live video classes with teachers in five languages: English, Korean, Spanish, German, Portuguese. It's a two-repo project: a Next.js frontend and an Express/Supabase backend, both solo-developer projects owned by the user (ohamin1214kingbug on GitHub). Early phases focused on fixing real security/logic bugs, adding email + password reset, and adding tests. The project then went through a full visual redesign (cream/navy/red "sticker" style matching reference screenshots), and then a **full i18n (translation) rollout** with a language-switcher bar — this is now **complete** across all user-facing pages.

## 2. What's been built

**Backend** (`/Users/kinghamin/linguaxchange-backend`):
- JWT auth (`middleware/auth.js`: `requireAuth`, `requireAdmin` via `ADMIN_EMAILS` env allowlist), applied to all protected routes in `routes/*.js`
- Class scheduling fixed: session created at class creation, enrollment joins existing session (not a new one)
- Recurring classes generate real multiple sessions (`utils/sessionDates.js`)
- Password reset flow: DB migration (`migrations/add_password_reset_columns.sql`), backend endpoints in `routes/auth.js`, frontend pages
- Real transactional email via Resend (`utils/mailer.js`), sending from verified domain `notifications@linguaxchange.com` (moved off Gmail SMTP because Railway blocks outbound SMTP)
- Embedded video classroom via Jitsi Meet (`external_api.js`, HMAC-based unguessable room names) — replaced an earlier Zoom Video SDK attempt
- Jest test suite: 4 suites / 28 tests covering pure-function logic (`utils/sessionDates.js`, `utils/pickSession.js`, `utils/roomName.js`, auth/validators)

**Frontend** (`/Users/kinghamin/linguaxchange-frontend`):
- Full visual redesign: cream/navy/red palette, Baloo 2 (display) + Inter (body) fonts, thick-border "sticker" card style — applied to home, auth pages, dashboard, classes (browse + create), profile, teacher profile, admin, classroom nav
- i18n infrastructure (see Architecture below) — `lib/i18n/translations.js`, `lib/i18n/LanguageContext.js`, `components/LanguageSwitcher.js`
- Translated pages (i18n rollout complete): home (`app/page.js`), all auth pages (`app/auth/login`, `app/auth/register`, `app/auth/forgot-password`, `app/auth/reset-password`), dashboard (`app/dashboard/page.js`), browse classes (`app/classes/page.js`), create-class form (`app/classes/create/page.js`), profile (`app/profile/page.js`), teacher profile (`app/teachers/[id]/page.js`). Intentionally left in English: `app/admin/page.js` (internal-only tool) and most of `app/classroom/[sessionId]/page.js` (third-party Jitsi UI chrome).

## 3. Tech stack & architecture

- **Frontend**: Next.js 16.2.10 (App Router, Turbopack), React 19, Tailwind CSS v4 (CSS-based `@theme inline` config in `app/globals.css`, no `tailwind.config.js`). Deployed to **Vercel**.
- **Backend**: Express 5, `@supabase/supabase-js` (service-role key) as the DB client, `jsonwebtoken` + `bcrypt` for custom auth (no Supabase Auth). Deployed to **Railway** at `https://linguaxchange-backend-production.up.railway.app`. Frontend calls this URL directly (hardcoded `const API = ...` at the top of most page files — no env var indirection currently).
- **Email**: Resend API (HTTPS-based; chosen specifically because Railway blocks outbound SMTP).
- **Testing**: Jest, backend only. Pattern: extract pure functions out of route handlers into `utils/*.js` so they're unit-testable without hitting the DB.
- **i18n**: Deliberately dependency-free (no `next-intl`/`react-i18next`) — a small custom Context-based system, appropriate for the app's size and the project's "no unnecessary dependencies" convention.
  - `lib/i18n/translations.js` — `UI_LANGUAGES` array (code/flag/label) + `translations` object keyed by `EN`/`KO`/`ES`/`DE`/`PT`, each with namespaces: `common`, `home`, `auth`, `dashboard`, `classes`, `profile`, `teacher`. Key counts are verified equal across all 5 languages via an ad hoc node script.
  - `lib/i18n/LanguageContext.js` — `LanguageProvider` (wraps `{children}` in `app/layout.js`), `useLanguage()` hook exposing `{ language, setLanguage, t }`. `t(key, vars)` does flat dotted lookup (`t('home.title')`), falls back to English if a key/lang is missing, supports `{placeholder}` interpolation via `.replaceAll()`. Language choice persists to `localStorage` under key `site_language`.
  - `components/LanguageSwitcher.js` — flag dropdown button, click-outside-to-close.
  - **Established page pattern** for translating a page: add `'use client'`, import `useLanguage` + `LanguageSwitcher`, destructure `t` from `useLanguage()`, replace hardcoded strings with `t('namespace.key')`, drop `<LanguageSwitcher />` into the nav, and localize any hardcoded `LANGS`/`LANGUAGES` label objects via `t('home.langKorean')` etc.
- **Repo/folder conventions**: `app/<route>/page.js` per page (App Router), shared UI in `components/`, i18n in `lib/i18n/`. No component library — everything hand-rolled with Tailwind utility classes.

## 4. Current state / what's working

- All backend functionality (auth, classes, enrollments, credits, reviews, video/Jitsi, password reset, email) is live and verified working in earlier sessions.
- Visual redesign is complete and live across all pages.
- i18n infrastructure is complete and verified: language switching works, persists across reload, falls back to English correctly.
- **i18n rollout is complete.** All user-facing pages translated and verified: home, all 4 auth pages, dashboard, browse classes, create-class form, profile, teacher profile. `npx next build` passes cleanly (14 routes, no errors); browser-verified end-to-end in Korean and Spanish (language switching, form validation, save/join flows) with no console errors. Committed and pushed (`16d7c5b`).
- Translation dictionary key counts verified equal across all 5 languages (EN/KO/ES/DE/PT): common 12, home 30, auth 69, dashboard 29, classes 69, profile 27, teacher 8.
- A pre-existing unrelated CSS bug was fixed opportunistically while working on the home page: a decorative "Hola" badge that overlapped the hero stat badge (moved from `-top-4 left-0` to `-top-16 left-4`).
- The `message.includes('Successfully')`-style fragile string-matching bug (see Known issues below) has been fixed everywhere it was found: `app/dashboard/page.js`, `app/classes/page.js`, and `app/teachers/[id]/page.js` all now use an explicit `messageOk` boolean state instead.
- `LanguageSwitcher` is present in the nav of every translated page, including `app/classes/create/page.js`, `app/profile/page.js`, and `app/teachers/[id]/page.js` (added in the same pass — the established page pattern requires it, and it was initially missed, then caught and fixed before commit).

## 5. In progress / next steps

Task #31 ("Translate dashboard, classes, profile, teacher profile pages") is **complete**. There is no known in-progress frontend or backend work as of this update. Possible next steps (not started, no priority assigned):

- Address the class-topic i18n limitation described below (would need a topic-code schema change).
- Any new page/feature work would follow the established page pattern (see Architecture section 3) — add `useLanguage`, translate strings, drop in `<LanguageSwitcher />`, use `messageOk` for any success/error banner.

**Known scoping decision (communicated)**: `app/admin/page.js` and most of `app/classroom/[sessionId]/page.js` are intentionally left in English — admin is an internal-only tool the site owner (English speaker) uses, and the classroom page is mostly third-party Jitsi UI chrome, not ours to translate.

There is also a known, not-yet-solved deeper issue: class `topic` values are stored as free English text in the DB when a class is created (selected from the `TOPICS` list or custom text), so translating the *display* of `cls.topic` on the browse-classes and teacher-profile pages isn't straightforward — it would require storing a topic code instead of raw text and translating on render. Out of scope for now; flagged as a possible future improvement, not a bug to fix.

## 6. Known issues & gotchas

- **`preview_click` (CDP-based) is unreliable with React state** — clicks sometimes don't register with React's event system. Use `preview_eval` with `document.querySelector(...).click()` instead. Critically, **fire only one `.click()` per `preview_eval` call** — batching multiple synchronous clicks in one eval can clobber each other due to React state-closure batching.
- **English-string-matching for UI logic is a recurring trap** in this codebase (see `messageOk` fix above) — any `message.includes('SomeEnglishWord')` pattern found while translating a page needs the same boolean-state treatment, not just a translated string swap.
- **Two-repo cwd trap (confirmed, easy to hit)**: this is a two-repo project (frontend + backend) opened together, and a shell's working directory persists across tool calls but does *not* auto-track which repo you meant to be in. It's very easy to run a command intending it for the backend right after a frontend command (or vice versa) without an explicit `cd`, and have it silently execute against the wrong repo — `git status`/`git diff` will just report on whatever repo you're already sitting in, with no error. Always `cd /Users/kinghamin/linguaxchange-frontend` or `cd /Users/kinghamin/linguaxchange-backend` explicitly (don't rely on the previous command's directory) before any git or build command, especially when interleaving checks across both repos.
- Both repos' `origin` remotes are HTTPS URLs with an embedded GitHub PAT (visible via `git remote -v`) — be careful not to echo `git remote -v` output verbatim into any shared/logged location; treat it as containing a credential.
- Backend `.env` exists locally (250 bytes) but there's no `.env.example` committed — if a new session needs to know what env vars are required, cross-reference `middleware/auth.js`, `utils/mailer.js`, and the Supabase client init rather than guessing from a template file (none exists).
- Frontend has **no `.env` / env var indirection** for the backend URL — it's a hardcoded string constant (`const API = 'https://linguaxchange-backend-production.up.railway.app'`) repeated at the top of most `page.js` files. If the Railway URL ever changes, it must be updated in every file individually (no central config).
- The translation dictionary (`lib/i18n/translations.js`) is very large (~1000+ lines). When editing it, anchor `Edit` calls on unique closing text near the target section rather than trying to match large blocks — this was the working pattern established across the session.

## 7. Environment / config notes

- **Frontend repo**: `github.com/ohamin1214kingbug/linguaxchange-frontend`, deployed on **Vercel**.
- **Backend repo**: `github.com/ohamin1214kingbug/linguaxchange-backend`, deployed on **Railway**, production URL `https://linguaxchange-backend-production.up.railway.app`.
- **Database**: Supabase (project details not enumerated in this file — check `.env` / Supabase dashboard directly; connection uses the service-role key via `@supabase/supabase-js`).
- **Email**: Resend, sending domain `linguaxchange.com` (custom domain, DNS-verified with DKIM/SPF/MX records already configured — do not need to redo this).
- **Backend env vars in use** (inferred from code, not exhaustively confirmed against `.env`): Supabase URL + service-role key, `JWT_SECRET` (or similar) for `jsonwebtoken`, `ADMIN_EMAILS` (comma-separated allowlist for `requireAdmin`), `RESEND_API_KEY`. Verify exact names in `middleware/auth.js` / `utils/mailer.js` / DB client init before assuming.
- Working directories for a Claude session on this project: frontend at `/Users/kinghamin/linguaxchange-frontend`, backend at `/Users/kinghamin/linguaxchange-backend` (typically opened as "primary" + "additional working directory" pair).

## 8. Decisions made (don't re-litigate)

- **i18n: hand-rolled Context + flat dictionary, not a library.** Reason: app is small, adding `next-intl` or similar would be disproportionate. Keep this pattern for any new pages/namespaces going forward.
- **Message-banner styling must use an explicit boolean state, never string-matching on translated text.** Established as a hard rule after finding it broken in two places already.
- **Admin page and classroom (Jitsi) chrome are out of i18n scope.** Admin is internal/English-only by nature; classroom page is largely third-party UI.
- **No fake/placeholder stats or testimonials on the home page.** The user explicitly required real data only — the platform has no real user metrics yet, so the home page must not fabricate numbers or quotes to look more "finished" than it is.
- **Email delivery: Resend over Gmail SMTP.** Reason: Railway blocks outbound SMTP entirely, so Gmail SMTP silently failed in production; Resend's HTTPS API works around that. Required setting up and verifying a custom domain (`linguaxchange.com`) since Resend's shared sending domain has deliverability/branding limits.
- **Video: Jitsi Meet over Zoom Video SDK.** Reason: free, no account/credential management needed, simpler embed. This was a mid-course correction — an earlier commit added Zoom Video SDK, then it was replaced.
- **Testing: pure-function extraction over mocking the DB.** Backend logic that had real bugs (session-date generation, session-picking on enrollment) was pulled out of route handlers into `utils/*.js` specifically so Jest could test it without a live Supabase connection.
- **Workflow expectation**: commit + push after each logical unit of work (not batched across unrelated features), with commit messages explaining *why*, and the `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer.
