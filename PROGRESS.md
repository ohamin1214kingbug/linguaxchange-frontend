# GongbuLeng — Progress Notes

_Last updated: 2026-10-07. Written so a fresh Claude session can pick up this project with zero prior context. Earlier name: LinguaXchange (renamed 2026-09-22)._

## 1. Project overview

**GongbuLeng** (공부 "study" + *leng* from *lenguaje*; always written with a capital L) is a language-exchange platform: members teach the language they know and learn the ones they don't, in small live video classes paid for with credits instead of money. Classes cover seven languages — Korean, Spanish, German, English, Portuguese, French, Italian — and the UI is translated into five (EN, KO, ES, DE, PT). Free study guides (A1–B2, all seven languages) bring in visitors from search.

Two repos, one developer (Hamin Oh, `ohamin1214kingbug` on GitHub, a UCM Madrid student): a Next.js frontend and an Express/Supabase backend.

## 2. What's been built

**Backend** (`/Users/kinghamin/linguaxchange-backend`, Express 5):
- Custom JWT auth (`middleware/auth.js`): `requireAuth` checks the token, suspension and a per-user revocation cutoff (`token_valid_after`), and **fails closed** if the user row can't be read. `requireAdmin` uses the `ADMIN_EMAILS` allowlist. Passwords use bcrypt; Supabase Auth is used only for Google sign-in.
- Classes (one-off and recurring sessions), enrollments with an atomic capacity trigger, class requests (students ask for a class; others can +1), writing feedback (assignments), reviews, reports, suspensions, account deletion with anonymisation, data export, participation records shared by revocable token, university email verification, badges, streaks, in-app notifications, reminder emails.
- Credits: balances change only through the `spend_credit` / `add_credit` SQL functions (atomic); every change is recorded in `credit_transactions` through `utils/creditLedger.js`, which logs `[CREDIT_LEDGER]` if a history row fails to save.
- Video: Jitsi as a Service (JaaS, `8x8.vc`) with signed room JWTs (`JAAS_APP_ID`, `JAAS_KID`, `JAAS_PRIVATE_KEY`).
- Email: Resend, sending from `notifications@gongbuleng.com`.
- Cron endpoints (`routes/cron.js`) for reminders, refunds of expired requests, notifications and health checks.
- One-off scripts in `scripts/`: `testFixtures.js` (throwaway `.invalid` accounts), `announceRename.js` (the rename email; already sent to all 5 approved members — its sent-log makes re-runs skip them).
- Tests: Jest, **50 suites / 383 tests** (`npx jest`).

**Frontend** (`/Users/kinghamin/linguaxchange-frontend`, Next.js App Router):
- Cream/navy/red "sticker" design, Baloo 2 + Inter fonts.
- Pages: home, browse classes (with a class-request board and writing-feedback tab), class detail, create class, classroom (JaaS), dashboard, history, people, saved teachers, profile/settings, teacher profiles, participation record, study guides, legal pages, admin, all auth flows.
- Study guides: 28 PDFs (7 languages × A1–B2). Source markdown in `docs/resources/*.md`, built by `scripts/buildGuides.mjs` (headless Chrome, Noto Sans KR), uploaded through the admin page, served at `/guides/:file` via a rewrite to the Supabase storage bucket `resources`. English guides (`en-*`) are written in Spanish for Spanish speakers; the rest in English. Portuguese follows Brazilian usage.
- Sign-up funnel: a logged-out visitor who requests or joins a class is sent to register and returned afterwards to the same filtered board (`rememberReturnPath` / `takeReturnPath` in `lib/auth.js`), with any half-typed request restored (`lib/requestDraft.js`).
- Tests: Node's built-in runner, **18 tests** (`npm test`) — translation parity across the five UI languages, return-path safety, request drafts.

## 3. Tech stack & architecture

- **Frontend**: Next.js 16.3 (App Router, Turbopack), React 19.3, Tailwind CSS v4 (`@theme inline` in `app/globals.css`). Deployed on **Vercel** at `https://gongbuleng.com`.
- **Backend**: Express 5, `@supabase/supabase-js` with the service-role key, `jsonwebtoken`, `bcrypt`, `helmet`, `express-rate-limit`. Deployed on **Railway** (project `pretty-perfection`) at `https://linguaxchange-backend-production.up.railway.app` — the host keeps the old name on purpose.
- **Database**: Supabase Postgres. RLS is enabled with no policies on every table (deny-all for the public key); only the backend's service-role key reads or writes. `EXECUTE` on the SECURITY DEFINER functions is revoked from `anon` and `authenticated`.
- **i18n**: hand-rolled. `lib/i18n/translations.js` (keys `EN`/`KO`/`ES`/`DE`/`PT`), `lib/i18n/LanguageContext.js` (`useLanguage()` → `t(key, vars)`, falls back to English, then to the key). `tests/translations.test.mjs` fails if the languages drift apart.
- **SEO**: sitemap (`app/sitemap.js`, revalidates hourly), robots, per-page metadata, `WebSite` structured data naming the site GongbuLeng. Search Console domain property `gongbuleng.com`; sitemap reads "Success"; change of address filed from `linguaxchange.com`.
- **Security headers** (frontend `next.config.mjs`): `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`. No `Permissions-Policy` (the classroom iframe needs camera/microphone/screen share) and no full CSP yet.
- **Conventions**: backend logic that can break is pulled into `utils/*.js` so Jest can test it without a database; route tests drive `router.handle()` with mocked Supabase clients (no supertest).

## 4. Current state / what's working

- Rename to GongbuLeng is complete and live: `linguaxchange.com` 308-redirects to `gongbuleng.com` (paths kept), `www.gongbuleng.com` redirects to the apex, Google sign-in shows "GongbuLeng", email comes from the new domain, guides and PDFs carry the new name.
- Accessibility: home, classes, guides, a guide page and login score 100 on Lighthouse; brand red is `#da1f33` and secondary text uses `text-navy/65`.
- 28 guides live; the guides page title and description are built from the guides that exist.
- 0 open Dependabot alerts in both repos (as of 2026-10-03); dependencies at their latest minor versions.

## 5. In progress / next steps

- **No public classes yet** — the biggest gap. The funnel from guides to class requests works; teachers need to post classes.
- Run one real sign-up through the new funnel end to end (logged out → guide → request → register → back on the board). Not yet done; it creates a real account.
- Two major upgrades deliberately deferred: `dotenv` 18 (backend) and `eslint` 10 (frontend).
- Lint: 85 errors / 35 warnings in the app's own code, none a runtime bug (React-Compiler-style rules, `<a>` instead of `<Link>`, unescaped apostrophes). Converting the 31 internal `<a>` links to `<Link>` would speed up navigation; the owner chose to skip it for now.
- Open question: confirm the database stops a student enrolling twice in the same session (a unique constraint on `class_enrollments (user_id, class_session_id)`); needs a duplicate check and SQL run by the owner.
- 2026-10-30: a scheduled task reminds the owner to clean up the old domain (auto-renew `linguaxchange.com`, remove old Supabase redirect URLs and the old Resend domain). Do **not** remove `linguaxchange.com` from Vercel or Search Console — the redirect and change of address depend on them.

## 6. Known issues & gotchas

- **UCM's campus network blocked `gongbuleng.com`** (category `newly-registered-domain`) when checked on 2026-09-30; the domain was registered 2026-09-19. Expected to clear about 32 days after registration if the filter is Palo Alto's — unconfirmed. `linguaxchange.com` is not blocked but redirects into the block.
- **Two-repo cwd trap**: always `cd` explicitly into the frontend or backend before git or build commands.
- **Lint picks up `.claude/worktrees/`** (each worktree carries its own `.next` build) unless `".claude/**"` is in `eslint.config.mjs` `globalIgnores`. The ecc plugin's config-protection hook blocks Claude from editing that file; the owner has to add the line or disable the hook.
- **Supabase reads that ignore `error`** were the source of real bugs (shared records showing 0 classes, refunds silently skipped). New code checks `error` and fails loudly or retries.
- The frontend hardcodes the API URL (`const API = 'https://linguaxchange-backend-production.up.railway.app'`) in many files; there is no central config.
- Both repos' `origin` remotes embed a GitHub token in the URL — never print `git remote -v` into shared output.
- Pages are cached (ISR, mostly hourly): after an admin change, the guides page and sitemap can take up to an hour or two to update.

## 7. Environment / config notes

- Repos: `github.com/ohamin1214kingbug/linguaxchange-frontend` (Vercel team HAMINKINGBUG) and `github.com/ohamin1214kingbug/linguaxchange-backend` (Railway). Repo and project names still say linguaxchange on purpose.
- Domains: `gongbuleng.com` (primary) and `linguaxchange.com` (redirect), DNS on Vercel.
- Supabase project ref: `shrsxgzrdbxlptwzuevb`. Site URL `https://gongbuleng.com`; redirect URL `https://gongbuleng.com/auth/callback`.
- Google sign-in: Cloud project `913341791233`, owned by `ohamin96@gmail.com`; branding published as GongbuLeng.
- Contact address on legal pages: `gongbuleng.team@gmail.com`.
- Backend env vars include the Supabase URL and service-role key (`SUPABASE_URL`, `SUPABASE_KEY`), `JWT_SECRET`, `ADMIN_EMAILS`, `RESEND_API_KEY`, the `JAAS_*` keys and Twilio credentials. Read names from the code, never values from `.env`.

## 8. Decisions made (don't re-litigate)

- **Brand spelling is GongbuLeng** (capital L). Domain and email addresses stay lowercase.
- **i18n stays hand-rolled**, and success/error banners use an explicit boolean, never string-matching on translated text.
- **No fake stats or testimonials** on the home page.
- **Resend over SMTP** (Railway blocks outbound SMTP).
- **Video: JaaS (8x8.vc)**, replacing an earlier Zoom attempt and free Jitsi.
- **Guides**: A1–B2 only for now (no C1). English guides in Spanish; Portuguese guides follow Brazilian usage and link to Celpe-Bras (INEP).
- **Credit history is logged, not rolled back**: a failed history save logs `[CREDIT_LEDGER]` rather than undoing the student's join or refund.
- **Admin approval only gates teachers publishing classes**; new members can browse and request classes immediately.
- **Workflow**: work on a branch, merge to `main` with `--no-ff` ("Merge: …"), push only when the owner asks, commit messages explain why, and each commit carries the `Co-Authored-By` trailer for the model that wrote it.
