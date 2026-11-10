# GongbuLeng — Progress Notes

_Last updated: 2026-11-10. Written so a fresh Claude session can pick up this project with zero prior context. Earlier name: LinguaXchange (renamed 2026-09-22)._

## 1. Project overview

**GongbuLeng** (공부 "study" + *leng* from *lenguaje*; always written with a capital L) is a language-exchange platform: members teach the language they know and learn the ones they don't, in small live video classes paid for with credits instead of money. Classes cover seven languages — Korean, Spanish, German, English, Portuguese, French, Italian — and the UI is translated into seven (EN, KO, ES, DE, PT, FR, IT). Free study guides (A1–B2, all seven languages) bring in visitors from search.

Two repos, one developer (Hamin Oh, `ohamin1214kingbug` on GitHub, a UCM Madrid student): a Next.js frontend and an Express/Supabase backend.

## 2. What's been built

**Backend** (`/Users/kinghamin/linguaxchange-backend`, Express 5):
- Custom JWT auth (`middleware/auth.js`): `requireAuth` checks the token, suspension and a per-user revocation cutoff (`token_valid_after`), and **fails closed** if the user row can't be read. `requireAdmin` uses the `ADMIN_EMAILS` allowlist. Passwords use bcrypt; Supabase Auth is used only for Google sign-in.
- Classes (one-off and recurring sessions), enrollments with an atomic capacity trigger, class requests (students ask for a class; others can +1), writing feedback (assignments), reviews, reports, suspensions, account deletion with anonymisation, data export, participation records shared by revocable token, university email verification, badges, streaks, in-app notifications (`notifications.type` is a closed CHECK list; a new type needs a migration run in Supabase, latest `migrations/add_account_approved_notification_type.sql`), reminder emails.
- Credits: balances change only through the `spend_credit` / `add_credit` SQL functions (atomic); every change is recorded in `credit_transactions` through `utils/creditLedger.js`, which logs `[CREDIT_LEDGER]` if a history row fails to save.
- Banana (credit) rules, as the code enforces them:
  - Sign-up grants **3** (`SIGNUP_CREDIT_GRANT`, `routes/auth.js`, email and Google paths).
  - Joining a class costs 1; cancelling **24h+** before start refunds it (`utils/enrollmentCancel.js`).
  - A class request costs 1, refunded if unanswered within **24h** (`utils/classRequests.js`).
  - Writing feedback pays the reviewer 1, auto-released after **72h** (`utils/assignmentCredits.js`).
  - The **last banana is locked until the member has taught once** (`utils/creditSpendGate.js`; "taught" = any `earned` row; fails open).
  - Ledger types: `spent`, `earned` (teaching only), `refunded`, `earned_feedback`, `bonus` (invite rewards and admin grants). Anything that is not teaching must never be logged as `earned`, or it unlocks the last banana. Admin grants were `earned` until 2026-11-07; rows from before then still are.
  - Invite a friend: an invited member's first class (their attendance confirm, or the 72-hour payout) gives them and the inviter 1 `bonus` banana each, once (`users.referral_rewarded_at` is the lock); the inviter is paid for at most 10 friends (`utils/referrals.js`, logs `[REFERRAL]`).
  - Teachers earn **1 per student**, paid when the student confirms attendance **or automatically 72h after class** (`utils/attendancePayout.js`, swept by the reminders cron). `class_enrollments.teacher_paid_at` is the single lock both paths claim, so nothing pays twice. A student with an open report against the teacher or class holds the payout for admin review. Only sessions from the last 14 days are swept. The cron response's `attendancePaid` is `null` when the sweep fails, not 0.
- Video: Jitsi as a Service (JaaS, `8x8.vc`) with signed room JWTs (`JAAS_APP_ID`, `JAAS_KID`, `JAAS_PRIVATE_KEY`).
- Email: Resend, sending from `notifications@gongbuleng.com`.
- Cron endpoints (`routes/cron.js`) for reminders, refunds of expired requests, notifications and health checks.
- One-off scripts in `scripts/`: `testFixtures.js` (throwaway `.invalid` accounts), `announceRename.js` (the rename email; sent to all 5 approved members at the time), `announceApproved.js` (the "your account is approved" email for members approved before approval emails existed; sent to 8 members on 2026-11-07, admins skipped). Each keeps a git-ignored sent-log so re-runs skip anyone already mailed; run them locally with the current `RESEND_API_KEY` in `.env`.
- Rate limits (`middleware/rateLimit.js`): the tight limits are keyed on the account or phone, because a campus network puts many members behind one address. Login (also change-password and account delete) counts only failed attempts, 10 per account+address and 50 per address per 15 min; register 30 per address per hour; send-otp 3 per phone and 20 per address per hour; verify-otp 10 per phone+address, 50 per address; university email 5 per member, 20 per address; public GETs 100 per address per minute. `app.set('trust proxy', 2)`: Railway adds two hops, so one hop made every visitor look like a Railway edge server.
- Uploads are base64 JSON. `/api/users`, `/api/classes`, `/api/resources` and `/api/reports` accept 21mb (three 5MB report images); everything else 100kb.
- Alerts (2026-11-07), both sent after the response and never failing the action itself:
  - Class alerts: members follow a language and optionally a level (`class_alerts` table, `migrations/add_class_alerts.sql`, run in Supabase; `/api/class-alerts`). Mailed when a class becomes visible: at creation for an approved teacher, or on admin approval (`utils/classAlerts.js`, logs `[CLASS_ALERT]`).
  - Request emails: posting a class request mails every member whose `teach_language` matches, with the time in their own zone, unless `notification_preferences.request_emails` is false (`utils/requestAlerts.js`, logs `[REQUEST_ALERT]`).
- `PATCH /api/users/:id` rejects a `timezone` Intl cannot use (`isValidTimezone` in `utils/timezonePolicy.js`).
- Invites (2026-11-07): the invite code is the public member code (`U000012`). Register and Google sign-up accept `invite_code` and store `users.referred_by`; an unknown code is ignored, never a reason to refuse signup. `GET /api/referrals` gives the dashboard's counts. Migration `migrations/add_referrals.sql` (run 2026-11-07; its first version failed because it left `earned_feedback` out of the type check).
- Push notifications (2026-11-07): every place that saves an in-app notification also calls `pushNotifications(rows)` (`utils/push.js`, `web-push` pinned to 3.6.7), which sends to the member's devices and forgets ones that unsubscribed (404/410). Devices subscribe through `/api/push` (`push_subscriptions`, `migrations/add_push_subscriptions.sql`, run). Without `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` nothing is sent and `GET /api/push/key` returns 404. A new notification type has to go through `pushNotifications` too, or it reaches the bell only.
- Tests: Jest, **59 suites / 424 tests** (`npx jest`).

**Frontend** (`/Users/kinghamin/linguaxchange-frontend`, Next.js App Router):
- Cream/navy/red "sticker" design, Baloo 2 + Inter fonts.
- Pages: home, browse classes (with a class-request board and writing-feedback tab), class detail, create class, classroom (JaaS), dashboard, history, people, saved teachers, profile/settings, teacher profiles, participation record, study guides, legal pages, admin, all auth flows.
- Study guides: 28 PDFs (7 languages × A1–B2). Source markdown in `docs/resources/*.md`, built by `scripts/buildGuides.mjs` (headless Chrome, Noto Sans KR), uploaded through the admin page, served at `/guides/:file` via a rewrite to the Supabase storage bucket `resources`. English guides (`en-*`) are written in Spanish for Spanish speakers; the rest in English. Portuguese follows Brazilian usage.
- Guides page (`/resources`, `app/resources/ResourcesGridClient.js`, redesigned 2026-11-10): the site Navbar, then one card per language in its own brand colour (`LANGUAGE_COLORS`: band, flag circle, tinted level buttons; Italian uses `brand-coral`), a guide count, and a last yellow card linking to classes. Colours are decoration only; text stays navy on the tints. A missing level shows as a dashed "coming soon" button.
- Dashboard welcome card (dismissible, `localStorage` key `welcomeCardDismissed`) explains the banana cycle and the rules above in all five languages. The home page's final "Join today" section is hidden from logged-in members.
- Sign-up funnel: a logged-out visitor who requests or joins a class is sent to register and returned afterwards to the same filtered board (`rememberReturnPath` / `takeReturnPath` in `lib/auth.js`), with any half-typed request restored (`lib/requestDraft.js`).
- Turning readers into teachers: each guide page has "Teach a class with this guide", which opens the class form prefilled with language, level, topic and the guide as material (logged-out visitors sign up first and come back). The dashboard shows a "Teach your first class" checklist until the member has an `earned` transaction (hideable, `localStorage` key `firstClassChecklistDismissed`).
- Browse page: picking a language shows the class alert bar (`components/ClassAlertToggle.js`). Dashboard: "Add to calendar" .ics download on upcoming classes (`lib/calendar.js`). Settings: switch for the request emails; the preferences PATCH replaces the whole JSON object, so every key must be sent.
- Time zone: detected at sign-in; the navbar asks the member to switch or keep when the device zone differs from the saved one ("keep" pins it as manual; answer remembered per pair in `tzPromptDismissed`). The date picker names the device zone it uses.
- Level check (`lib/levelQuiz.js`, `components/LevelQuiz.js`): at the bottom of every guide, 12 questions (3 per level, A1–B2) in all seven languages; the result is the first level with fewer than 2 of 3 right, plus the score and each missed question with both answers. Questions are written by Claude and **not yet reviewed by native speakers**. English questions are grammar only (its guides are read by Spanish speakers); Portuguese follows Brazilian usage.
- Invites: any page with `?invite=U000012` keeps the code for a logged-out visitor until signup (`lib/invite.js`, `localStorage` key `inviteCode`); the dashboard's invite card shows the member's link and counts.
- Gift reveal (`components/GiftReveal.js`): an unread `credit_added` notification (invite reward or admin grant) opens as a small card with a gift box to tap, a banana with the amount, and Collect, which marks it read. Oldest first, one at a time; reduced-motion users get no animation. A first full-screen version was judged too much.
- Push: Settings → "Notifications on this device" (`components/PushToggle.js`, `lib/push.js`); hidden while the backend has no keys or the browser can't push; on an iPhone not added to the Home Screen it explains how. `public/sw.js` shows each push and opens the page it is about. Logout unsubscribes the device.
- Tests: Node's built-in runner, **45 tests** (`npm test`) — translation parity across the seven UI languages, return-path safety, request drafts, time zone aliases, calendar files, level-check sets and scoring, invite codes, push key conversion.

## 3. Tech stack & architecture

- **Frontend**: Next.js 16.4 (App Router, Turbopack), React 19.3, Tailwind CSS v4 (`@theme inline` in `app/globals.css`). Deployed on **Vercel** at `https://gongbuleng.com`.
- **Backend**: Express 5, `@supabase/supabase-js` with the service-role key, `jsonwebtoken`, `bcrypt`, `helmet`, `express-rate-limit`. Deployed on **Railway** (project `pretty-perfection`) at `https://linguaxchange-backend-production.up.railway.app` (also what cron-job.org calls).
- **How the browser reaches the API** (since 2026-11-05): same-origin, at `gongbuleng.com/api/...`, so it works wherever the site itself resolves (see the UCM gotcha below). Client code uses `const API = ''`.
  - `proxy.js` (Next 16's middleware) rewrites `/api/*` to Railway and adds `x-client-ip` (the visitor, from Vercel's `x-forwarded-for`) and `x-proxy-secret`. The backend trusts `x-client-ip` for rate limiting only when the secret matches `API_PROXY_SECRET` (timing-safe). The secret is set in both Railway and Vercel (Production); a Vercel env change needs a **Redeploy** to apply.
  - Four upload endpoints (`/api/classes/:id/materials-pdf`, `/api/resources/:id/pdf`, `/api/users/:id/avatar`, `/api/reports`) are excluded from `proxy.js`'s matcher and go through a plain rewrite in `next.config.mjs` instead: a Vercel function rejects request bodies over 4.5MB (`FUNCTION_PAYLOAD_TOO_LARGE`), a rewrite does not (20MB tested). Those routes have no rate limit. Keep the two lists in sync. Locally, `next dev` still stops rewrites at ~10MB.
  - Server-rendered files (`app/sitemap.js`, `app/record/[token]/page.js`, `app/classes/page.js`, `app/classes/[id]/page.js`, `app/resources/page.js`, `app/resources/[language]/[level]/page.js` and its `opengraph-image.js`) call the Railway host directly; they run on Vercel, not on campus.
- **Database**: Supabase Postgres. RLS is enabled with no policies on every table (deny-all for the public key); only the backend's service-role key reads or writes. `EXECUTE` on the SECURITY DEFINER functions is revoked from `anon` and `authenticated`.
- **i18n**: hand-rolled. `lib/i18n/translations.js` (keys `EN`/`KO`/`ES`/`DE`/`PT`/`FR`/`IT`), `lib/i18n/LanguageContext.js` (`useLanguage()` → `t(key, vars)`, falls back to English, then to the key). `tests/translations.test.mjs` fails if the languages drift apart.
- **SEO**: sitemap (`app/sitemap.js`, revalidates hourly), robots, per-page metadata, `WebSite` structured data naming the site GongbuLeng. Search Console domain property `gongbuleng.com`; sitemap reads "Success"; change of address filed from `linguaxchange.com`.
- **Security headers** (frontend `next.config.mjs`): `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`. No `Permissions-Policy` (the classroom iframe needs camera/microphone/screen share) and no full CSP yet.
- **Conventions**: backend logic that can break is pulled into `utils/*.js` so Jest can test it without a database; route tests drive `router.handle()` with mocked Supabase clients (no supertest).

## 4. Current state / what's working

- Rename to GongbuLeng is complete and live: `linguaxchange.com` 308-redirects to `gongbuleng.com` (paths kept), `www.gongbuleng.com` redirects to the apex, Google sign-in shows "GongbuLeng", email comes from the new domain, guides and PDFs carry the new name.
- Accessibility: home and login score 100 on Lighthouse; brand red is `#da1f33` and secondary text uses `text-navy/65`. Since real classes appeared, the class list scores 94 and a class page 96 (2026-11-07): see the brand-teal gotcha in section 6. The redesigned guides page (2026-11-10) has not been re-scored.
- 28 guides live; the guides page title and description are built from the guides that exist.
- Dependabot (2026-11-05): frontend 0 open alerts (Next.js 16.4.5); backend 2 open, both dev-only (`minimatch` moderate, `deepmerge` low with no fix yet). `follow-redirects` (via twilio → axios) patched to 1.16.2.
- 2026-11-01: every backend secret was rotated after Railway's October security incident (Supabase now on an `sb_secret_` key, legacy JWT keys revoked). `CRON_SECRET` also lives in the URLs of the two cron-job.org jobs.

## 5. In progress / next steps

- **Few public classes** — the biggest gap (2 upcoming on 2026-11-07: Korean A1, Spanish A2; 0 open requests). Built 2026-11-07 to address it: guide → teach link, first-class checklist, request emails to teachers, class alerts, calendar export, level check, invite a friend, gift reveal, push notifications. Remaining ideas: flashcards from the guides; a waitlist for full classes once classes actually fill. A weekly availability grid for teachers was deliberately skipped: with this few teachers per language, every one of them should hear about every request.
- Have a native speaker of each language skim the level-check questions in `lib/levelQuiz.js`; one wrong answer index gives readers the wrong level.
- Run one real sign-up through the new funnel end to end (logged out → guide → request → register → back on the board). Not yet done; it creates a real account.
- Owner to-do after the secret rotation: review the GitHub security log, Resend log and Twilio usage for anything unusual. (The stale GitHub Actions `CRON_SECRET` was deleted 2026-11-04; no workflow used it.)
- Twilio Verify (2026-11-06/07): Fraud Guard is under Verify > Fraud & Geo Permissions. Account-level overrides set Fraud Guard to Disabled for the US, Canada, Brazil and Australia (left as is; those countries are low risk). Geo Permissions (verified 2026-11-07 from the saved console page): SMS allowed for 50 of 249 countries — Europe (Spain, Portugal, France, Italy, Germany, UK, Ireland, Netherlands, Belgium, Switzerland, Austria, Poland, Sweden, Norway, Denmark, Finland, Greece, Romania, Ukraine), Asia (Korea, Japan, China, Taiwan, Hong Kong, India, Philippines), the Americas (US, Canada, Mexico, Costa Rica, Dominican Republic, Guatemala, Honduras, El Salvador, Panama, Nicaragua, Puerto Rico, Argentina, Bolivia, Brazil, Chile, Colombia, Ecuador, Peru, Paraguay, Uruguay, Venezuela), Morocco, Australia and New Zealand; Voice disabled in all 249. A member from any other country gets "can't send a code right now" until their country is enabled. send-otp allows 20 codes per address per hour, and each costs money.
- Not yet verified on UCM Wi-Fi since the `/api` proxy went live: log in on campus and check the balance and phone banner load.
- Optional cleanup: `api.gongbuleng.com` is no longer used (UCM blocked it too); its Railway custom domain and the CNAME/TXT records can be removed.
- Two major upgrades deliberately deferred: `dotenv` 18 (backend) and `eslint` 10 (frontend).
- Lint: 85 errors / 35 warnings in the app's own code, none a runtime bug (React-Compiler-style rules, `<a>` instead of `<Link>`, unescaped apostrophes). Converting the 31 internal `<a>` links to `<Link>` would speed up navigation; the owner chose to skip it for now.
- Open question: confirm the database stops a student enrolling twice in the same session (a unique constraint on `class_enrollments (user_id, class_session_id)`); needs a duplicate check and SQL run by the owner.
- 2026-10-30: a scheduled task reminds the owner to clean up the old domain (auto-renew `linguaxchange.com`, remove old Supabase redirect URLs and the old Resend domain). Do **not** remove `linguaxchange.com` from Vercel or Search Console — the redirect and change of address depend on them.

## 6. Known issues & gotchas

- **UCM's campus network**:
  - It blocked `gongbuleng.com` as a newly registered domain in September; that has cleared.
  - On 2026-11-04 its DNS (`147.96.1.9` / `147.96.2.4`) was found not to resolve `linguaxchange-backend-production.up.railway.app`. On campus Wi-Fi the site loaded, but every API call failed silently: balance stuck on "•••", no phone banner.
  - Moving the API to `api.gongbuleng.com` worked for about an hour, then UCM blocked that too (it resolves to a Railway host). Fixed 2026-11-05 by serving the API from `gongbuleng.com/api` (see section 3); campus DNS can't block the API without blocking the site. If a page shows "•••" or missing banners on campus, check DNS before debugging code.
  - Many students likely share a few public addresses on campus Wi-Fi, which is why the tight rate limits are per account or phone, not per address.
- **Two-repo cwd trap**: always `cd` explicitly into the frontend or backend before git or build commands.
- **Lint picks up `.claude/worktrees/`** (each worktree carries its own `.next` build) unless `".claude/**"` is in `eslint.config.mjs` `globalIgnores`. The ecc plugin's config-protection hook blocks Claude from editing that file; the owner has to add the line or disable the hook.
- **Supabase reads that ignore `error`** were the source of real bugs (shared records showing 0 classes, refunds silently skipped). New code checks `error` and fails loudly or retries.
- The API base is still repeated per file (`const API = ''` in client code, the Railway URL in the server-rendered files listed in section 3); there is no central config.
- Both repos' `origin` remotes embed a GitHub token in the URL — never print `git remote -v` into shared output.
- **Brand teal (`#2ec4b6`) fails as text colour**: 1.8–1.9:1 on its own tint, 4.5:1 needed. Lighthouse flags the class level badge (`bg-brand-teal/15 text-brand-teal`, "A1 · TOPIK 1") on `/classes` and class pages; `text-brand-teal` is used about 44 times across 15 files. Fix by adding a darker teal for text only, as was done for red. Also on `/classes`: the class card title is an `h3` with no `h2` above it (heading order).
- Pages are cached (ISR, mostly hourly): after an admin change, the guides page and sitemap can take up to an hour or two to update.
- **A member who can't get a phone code** sees the generic "can't send a code right now" (`auth.otpUnavailable`). Check in this order: their country is allowed in Twilio Geo Permissions (section 5; enable it there if not); Railway logs show `[SEND_OTP] 60410`, meaning Fraud Guard blocked it (unblock from Twilio Verify > Logs, which adds the number to the Safe List); Twilio's Verify logs show no attempt at all, meaning Railway's `TWILIO_*` variables point at a different Twilio account than the console (happened in August 2026).

## 7. Environment / config notes

- Repos: `github.com/ohamin1214kingbug/linguaxchange-frontend` (Vercel team HAMINKINGBUG) and `github.com/ohamin1214kingbug/linguaxchange-backend` (Railway). Repo and project names still say linguaxchange on purpose.
- Domains: `gongbuleng.com` (primary) and `linguaxchange.com` (redirect), DNS on Vercel. `api.gongbuleng.com` (CNAME to `1tx8hud0.up.railway.app` plus a `_railway-verify.api` TXT record) is unused since 2026-11-05.
- Supabase project ref: `shrsxgzrdbxlptwzuevb`. Site URL `https://gongbuleng.com`; redirect URL `https://gongbuleng.com/auth/callback`.
- Google sign-in: Cloud project `913341791233`, owned by `ohamin96@gmail.com`; branding published as GongbuLeng.
- Contact address on legal pages: `gongbuleng.team@gmail.com`.
- Backend env vars include the Supabase URL and service-role key (`SUPABASE_URL`, `SUPABASE_KEY`), `JWT_SECRET`, `ADMIN_EMAILS`, `RESEND_API_KEY`, the `JAAS_*` keys, Twilio credentials and `API_PROXY_SECRET` (also on Vercel), and `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` for push (set in Railway 2026-11-07; Railway applies a variable change only after its Deploy). Read names from the code, never values from `.env`.

## 8. Decisions made (don't re-litigate)

- **Brand spelling is GongbuLeng** (capital L). Domain and email addresses stay lowercase.
- **i18n stays hand-rolled**, and success/error banners use an explicit boolean, never string-matching on translated text.
- **No fake stats or testimonials** on the home page.
- **Resend over SMTP** (Railway blocks outbound SMTP).
- **Video: JaaS (8x8.vc)**, replacing an earlier Zoom attempt and free Jitsi.
- **Guides**: A1–B2 only for now (no C1). English guides in Spanish; Portuguese guides follow Brazilian usage and link to Celpe-Bras (INEP).
- **Credit history is logged, not rolled back**: a failed history save logs `[CREDIT_LEDGER]` rather than undoing the student's join or refund.
- **Admin approval only gates teachers publishing classes**; new members can browse and request classes immediately. Approving a member (POST `/api/admin/users/:id/approve`) emails them and adds an `account_approved` in-app notification, only on the not-approved → approved change, so a second click sends nothing (since 2026-11-07; before that approval was silent).
- **Teachers are paid per student, not per class**, and automatically 72h after class unless the student reports a problem — most students never press "confirm attendance", and teaching is the only way to earn.
- **The API is proxied through `gongbuleng.com/api`**, not called on its own hostname, so campus DNS filtering can't separate it from the site.
- **Workflow**: work on a branch, merge to `main` with `--no-ff` ("Merge: …"), push only when the owner asks, commit messages explain why, and each commit carries the `Co-Authored-By` trailer for the model that wrote it.
