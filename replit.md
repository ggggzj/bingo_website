# H1B Checker — website

The marketing site for the H1B Checker extension, plus accounts, plus a growth
dashboard that only the owner can see.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from `PORT`; 8080 on Replit)
- `pnpm --filter @workspace/landing run dev` — run the web app (port from `PORT`; 5173 locally)
- `pnpm --filter @workspace/api-server run test` — the auth and dashboard-gate tests
- `pnpm --filter @workspace/landing run test` — the web app's tests (Vitest + Testing
  Library + jsdom, with MSW answering HTTP; see "Where things live")
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only). **The
  nullable `password_hash` needs one of these to reach a real database.** Safe in this
  direction — dropping a NOT NULL touches no data and every existing row has a password —
  but run it deliberately, against a database you have confirmed: `.harness/backlogs/007`
  exists because this command does not say which one it is about to change.
- `pnpm --filter @workspace/api-server run set-owner-password` — create or change the owner's account (see below)

### Environment

| Variable | Needed by | What it does |
|---|---|---|
| `DATABASE_URL` | api-server, db | Postgres connection string |
| `OWNER_EMAIL` | api-server | Which account may see the growth dashboard. Comma-separated, read case-insensitively. **Unset means nobody** — the dashboard is closed, not open. |
| `STATS_API_BASE_URL` | api-server | Origin of the extension's API, e.g. `https://h1bchecker-production.up.railway.app` |
| `STATS_TOKEN` | api-server | Must match `STATS_TOKEN` on that server. Server-side only; never sent to a browser. |
| `TRUST_PROXY` | api-server | Proxies in front of us. Defaults to 1 in production, 0 elsewhere — see Gotchas. |

### Setting up the owner

The sign-up form **refuses** any address listed in `OWNER_EMAIL`, so the owner's
account is created out of band:

```bash
OWNER_EMAIL=you@example.com DATABASE_URL=... \
  pnpm --filter @workspace/api-server run set-owner-password
```

It asks for the password twice, with the echo off, and never takes it as an argument
— a command line ends up in shell history and in the process list. Re-running it is
also how the owner changes that password; there is no reset flow for an account that
cannot use the form. Afterwards, sign in at `/login` like anyone else.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Tests: Vitest + supertest (api-server only)

## Where things live

- **API contract, source of truth:** `lib/api-spec/openapi.yaml`. Edit it, then run the
  codegen script — `lib/api-client-react/src/generated` and `lib/api-zod/src/generated`
  are generated and should never be edited by hand.
- **DB schema, source of truth:** `lib/db/src/schema/` (`auth.ts`, `coach.ts`).
- **Auth:** `artifacts/api-server/src/lib/auth/` — `password.ts` (scrypt),
  `session.ts` (cookie + token hashing), `owner.ts` (who the owner is),
  `store.ts` (the storage interface) with `drizzle-store.ts` and `memory-store.ts`.
  Routes in `src/routes/auth.ts`.
- **Dashboard data:** `artifacts/api-server/src/routes/stats.ts` is the gate;
  `src/lib/stats/upstream.ts` is the only file that reads or sends `STATS_TOKEN`.
- **Web pages:** `artifacts/landing/src/pages/` — `Home.tsx`, `Login.tsx`,
  `Account.tsx`, `Jobs.tsx`; `src/hooks/use-auth.ts` asks the server who you are.
- **The logged-in area:** `artifacts/landing/src/pages/dashboard/` — `Shell.tsx` (the
  frame: identity, sign-out, the rail), `Rail.tsx`, and `views.tsx`, which is the
  registry the router and the rail both read. `Dashboard.tsx` and `Coach.tsx` are the
  two views it lists; neither is a route any more. `PracticeStatus.tsx` is the one line
  the rail draws under the practice entry — today's graded-of-assigned — and the only
  thing in the rail that fetches.
- **Site chrome:** `artifacts/landing/src/components/SiteHeader.tsx` and
  `SiteFooter.tsx`. The header carries one door into the account — `/dashboard` when
  signed in, `/login` when not.
- **Web tests:** `artifacts/landing/src/test/` — `server.ts` (the MSW server; handlers
  live in each test), `setup.ts` (lifecycle, `jest-dom`, and a `ResizeObserver` stub
  jsdom lacks), `render.tsx` (the app's providers plus an in-memory location, so a test
  can start at a path and assert where a redirect landed).
- **Outbound URLs:** `artifacts/landing/src/lib/links.ts` — the Chrome Web Store
  listing and the privacy policy. The privacy policy is served by the *extension's*
  API (`GET /privacy` on Railway), not by this site.
- **Theme:** `artifacts/landing/src/index.css`.

## Architecture decisions

- **The owner is configuration, not a column.** `OWNER_EMAIL` decides who sees the
  dashboard, so no row in `users` can be edited into an admin, and there is no admin
  flag to get wrong. It also means the sign-up form has to reserve that address —
  sign-up is open and addresses are unverified, so otherwise the first stranger to
  guess it would hold the account the dashboard is keyed to.
- **Sessions are rows, not signed cookies.** The cookie holds an opaque random value
  and `sessions` stores only its SHA-256. Costs a lookup per request; buys the
  ability to actually end a session rather than wait it out.
- **scrypt from `node:crypto`, not bcrypt or argon2.** Those two are native modules,
  and this server is bundled by esbuild and deployed to a host that would have to
  build them. The stored form carries its own parameters (`scrypt$N$r$p$salt$hash`)
  so the cost can be raised later without invalidating existing passwords.
- **Not being the owner answers 404, never 403.** A 403 from `/api/stats/registrations`
  would confirm the route exists and that there is something behind it. `/dashboard`
  renders the ordinary not-found page for the same reason.
- **The dashboard's numbers are proxied, not duplicated.** They live in the
  extension's API. The browser asks this server, this server asks that one with the
  shared secret. Only two numeric query parameters are ever forwarded, both bounds-
  checked, so this route cannot be steered into asking for something else.
- **The home page describes only what the extension actually ships.** Its earlier
  copy claimed USCIS data, real-time updates, historical approval rates and an
  average salary; none of those exist. The badges are the extension's own strings
  (`extension/content.js`), the counts are row counts from `output/employers.csv`
  and `output/employer_aliases.csv`, and the DOL data is refreshed quarterly by
  hand. Check a claim against the extension repo before adding it — that page is
  read by people deciding whether to trust the badge.
- **`COACH_EMAILS` was deleted, not turned into a kill switch.** Opening practice to
  every signed-in user left the variable gating nothing. Keeping it as an off switch was
  considered and rejected because the semantics would **invert**: an unset
  `COACH_EMAILS` used to mean *nobody may practise*, and a kill-switch version makes the
  same empty value mean *everybody*, so restoring an old deployment config would open
  the coach silently. If one is ever wanted it must be a differently-named variable
  whose default points the safe way. Closing practice again is a one-line change to
  `lib/coach/auth.ts`, which is cheaper than owning a variable that means the opposite
  of what it used to.
- **Opening practice needed no migration, because the coach was never single-tenant.**
  `coach_reviews`, `coach_daily_log`, `coach_config` and `coach_api_tokens` have keyed on
  `user_id` and cascaded with the account since the engine landed, and `getConfig`
  provisions a defaults row on first read. A new user's empty state is just their
  absence of rows. The only thing in the way was one predicate in two places.
- **Entitlement draws the rail; the server still refuses.** `views.tsx` decides what a
  viewer is offered, but each view keeps its own server-side refusal — `/dashboard/growth`
  renders the ordinary not-found page for a non-owner because `/api/stats` answers 404,
  exactly as it did when it was its own route. The rail is a convenience, never a
  boundary, and its test proves the point by claiming owner and still being refused.
- **A view is a path segment, and the shell keeps two refusals apart.** `?view=` and
  component state both lose linkability and reload-survival. A segment the app does not
  know is a stale address and redirects to the first entitled view; a segment this viewer
  may not use is a refusal and renders not-found **standing alone**, with no frame around
  it — a frame would confirm there is something here to be refused.
- **The rail shows today's practice progress, through the registry.** The old
  account-page entry printed "Today: 2 of 5 graded · 1 solved but not grilled"; the
  shell dropped it unasked, and the owner asked for it back (2026-09-15). Two ways to
  do it: let `Rail.tsx` call the plan query, or give each registry entry an optional
  `Status` component and let the rail render the slot. The second, because the first
  makes the rail the second place that knows what the practice view is made of, which
  is the thing `views.tsx` exists to prevent. The line is visible only to a viewer with
  two views — the rail is not drawn for one — which is right: a single-view viewer is
  already standing on the practice view, and its own panel shows the same numbers.
- **The switcher is a rail rather than a dropdown.** Asked for as a dropdown, decided as a
  rail (owner, 2026-09-12) on the reference they supplied: a rail still reads at six
  entries and a dropdown does not, and the stated reason for the shell is that more views
  are coming.
- **Auth routes take an `AuthStore`** rather than importing `db` themselves. That seam
  is what lets the tests run the real routes, the real hashing and the real cookies
  against memory instead of Postgres. It used to be stated against a counter-example —
  `routes/waitlist.ts` reached for `db` directly — and with that route deleted
  (2026-09-15) there is no counter-example left: no route imports `db`, only the store
  implementations do. The seam is now how this server reaches the database, not one
  route's better habit.
- **`/jobs` is public and identity-free, and its secret is a third one.** The page reads no
  session and writes nothing, which is what kept the two-account-systems question out of
  shipping it. `POSTINGS_TOKEN` is deliberately not `STATS_TOKEN`: one opens the owner's own
  numbers, the other opens job listings, and sharing a string would mean rotating the
  website's access locks the owner out of their dashboard. Options were one shared secret,
  or reusing the owner token; both were rejected for that blast radius.
- **The jobs proxy forwards an allowlist it builds itself, never the caller's query.** Same
  rule as `stats.ts`, widened because three parameters are free text typed by strangers:
  each is named, typed, bounded and re-encoded, unknown keys are dropped, and out-of-range
  values are dropped rather than refused so a hand-edited URL degrades to a wider page.
- **Nothing on `/jobs` classifies a posting.** Upstream stores no seniority or category, so
  the Experience and Category pickers are title searches that label no row. The alternative
  — inferring from the title — is what makes a competitor's page tag "Sr. Solutions
  Architect" as Entry-Level. A missing row costs one posting; a wrong badge costs the page
  its only advantage. For the same reason a null refusal verdict renders nothing: null means
  no description has been read, not that the employer declines.
- **The mailing list was removed, not hidden (2026-09-15).** The home page ended with a
  "Hear about what comes next" email box that posted to `POST /api/waitlist` and wrote a
  row nothing ever read. `select count(*) from waitlist` against production returned
  **0** — not one address in four months, including the owner's own. Three sizes were on
  the table: hide the section, remove the feature but keep the table, or remove it down
  to the table. The third, because the second's only argument is protecting collected
  data and there is none. Hiding it would have left a dead route, a dead contract path
  and a dead table for the next reader to identify as dead. The production table is
  dropped by hand with one `drop table waitlist;`, deliberately not
  `pnpm --filter @workspace/db run push`, which reconciles the whole schema and would
  carry any drift along with it.

## Product

- A landing page for the **BingoCareer** Chrome extension: what the four badges
  mean, which four job boards it runs on, how the 60-second trial and the
  email-plus-five-questions unlock work, and where the DOL data comes from. It closes
  with one link to the Chrome Web Store.
- Email-and-password accounts: create one, sign in, sign out. `/account` says who you
  are, lets you leave, and offers one way into the dashboard.
- `/dashboard` — the logged-in area: a frame with a rail listing the views this viewer
  may use, and the selected view beside it. A view is a path segment.
  - `/dashboard/growth` — installs, active users, checks, registered emails and
    referral channels for the extension. `OWNER_EMAIL` only.
  - `/dashboard/practice` — the interview coach: today's plan, review schedule, gaps
    and pattern strength. **Any signed-in user**, each on their own rows.
    `/coach` redirects here.

## User preferences

- Every unit of work runs the same loop: build test-first, then a review pass
  (repo standards + does it do only what was asked), then update this file, then
  explain it in plain language.
- The dashboard was explicitly asked to be on this site behind a login, not run
  locally: "只有我的邮箱和密码log进去之后，才能看到dashboard".

- **`users.password_hash` is nullable, and nothing writes a null yet.** An identity
  proven by Google has no password at all, and the database this repo is merging into
  (`.harness/backlogs/018`) already permits one — so the column was relaxed ahead of the
  rows rather than after them. `UserRecord.passwordHash` is `string | null` too, not just
  the column: that is what makes the compiler the thing that finds every reader.
  `createPasswordlessUser` is a separate store method rather than an optional argument to
  `createUser`, so an account nobody can sign into with a password is something a caller
  asks for and cannot omit by accident.

  **Two mechanisms make an absent hash safe, and neither was written for it.**
  `verifyPassword` refuses any stored value it cannot read, on its first two lines, never
  throwing; and `routes/auth.ts` passes `?? DECOY_HASH`, so an absent hash never reaches
  it and the refusal still costs a full scrypt. `password.test.ts` and the "an identity
  with no password" block in `auth.test.ts` exist to catch the removal of either — both
  were verified by breaking the guard and watching them fail. What they **cannot** catch
  is `?? ""` in place of the decoy: that still refuses, but immediately, which leaks by
  timing which addresses signed up with Google. The comment at the call site carries that
  reason for exactly this reason.

## Gotchas

- **`coach.test.ts` runs on a frozen clock, and the instant is deliberate.** Two places
  read the clock independently — the test file's `utcToday()` and the route's own at
  `coach.ts:51` — and several tests build a fixture from the first then assert against
  the second. A run crossing UTC midnight between them saw two different days and
  failed, once, on 2026-09-11, passing on every re-run. `beforeEach` now freezes `Date`
  at `2026-01-15T23:59:59.999Z`: the last millisecond of a UTC day, so the suite sits on
  the boundary every run and a reintroduced live clock fails immediately instead of once
  a quarter. Only `Date` is faked — faking timers would hang supertest.

- **After editing `openapi.yaml`, run the codegen script.** The frontend imports
  generated hooks; nothing else regenerates them.
- **Generated query hooks demand a `queryKey`** when you pass any query option. Pass
  the matching `getXxxQueryKey(params)` helper rather than inventing one.
- **After `pnpm --filter <pkg> add`, run a plain `pnpm install` at the root.** A filtered
  add relinks only that package. Adding jsdom and msw to `landing` changed vitest's peer
  resolution, so pnpm rebuilt it under a new `.pnpm` hash — and `api-server`'s `vitest`
  symlink went on pointing at the old directory, which no longer existed. Its whole suite
  died with `Cannot find module .../vitest/vitest.mjs`, in a package nothing had touched.
  The root install repairs every link; verified 2026-09-12. Same mechanism as the `tsx`
  rule below, arriving from the other direction.
- **`tsx` must stay `catalog:`** in every package. A second version of it changes
  vite's peer-resolution hash, which gives other packages two incompatible copies of
  vite's types and breaks their typecheck with an unrelated-looking error.
- **`OWNER_EMAIL` matches a string; an inbox is not a string.** Gmail delivers
  `you@gmail.com`, `y.o.u@gmail.com` and `you+x@gmail.com` to one place, and this
  comparison sees three addresses. Consequences, both verified: a stranger *can*
  register a dotted spelling of the owner's address, and gets an ordinary account
  with `isOwner: false` and 404 on every `/api/stats*` — no privilege, just a
  squatted row. And the owner who types a dot cannot sign in. Sign-up only reserves
  the exact spellings listed in `OWNER_EMAIL`. Listing more of them widens what is
  reserved without granting anything, because `set-owner-password` creates one
  account and only that account has a password — but run that script with
  `OWNER_EMAIL` set to the single real address, since it refuses a list.
- **`TRUST_PROXY` must match reality.** Too low and the platform's proxy IP becomes
  the whole world's IP, so one person's failed logins rate-limit everyone. Too high —
  or `true` — and a forged `X-Forwarded-For` makes every guess look like a new
  caller, which is the rate limiter switched off.
- **The session cookie is `Secure` in production only.** Local dev is http, where a
  Secure cookie is silently dropped and looks exactly like a broken login.
- **Front end and API must share an origin** for the cookie to work. Replit routes
  `/` and `/api` to the two services; locally the Vite dev server proxies `/api` to
  `API_PROXY_TARGET` (default `http://127.0.0.1:8080`). The `vercel.json` build
  publishes the static app only, with no API behind it.
- **Recharts bars need `isAnimationActive={false}`** here. Its grow-from-zero
  animation never starts when the chart is laid out before its container has a size,
  and the bars render as empty elements.
- **The job feed is now welcome on this site. Instruction lifted 2026-09-10** by the
  owner, in their own words: "解除禁令,网站 /jobs". It replaces the standing rule that
  had kept the feed off the site — including out of any roadmap or "coming soon" block —
  until it was finished. The feed is built and running in the extension repo; `/jobs`
  here is now the surface that serves it, and it is what the website's accounts hold.
  Ticket: `.harness/backlogs/001-jobs-page-split-pane.md`.
  **Shipped 2026-09-11** as `/jobs` — a public, read-only split pane over
  `GET /api/jobs`, which proxies the extension API's `/api/postings` behind
  `POSTINGS_TOKEN` (a third secret, not `STATS_TOKEN` and not `FEED_TOKEN`). The page
  reads no session and writes nothing. Two things on it are load-bearing and easy to
  break: `no_sponsor` is three-state and `null` must render **nothing** about refusal,
  and the seniority/category controls are title searches that label no row — see
  `openspec/changes/archive/…-jobs-page/design.md`.
  **What the lifted rule was protecting has not gone away:** 43 boards means no FAANG and
  none of the largest H-1B filers, so a search box promising to find Google still cannot
  keep that promise. Coverage is an open owner decision, not a solved problem.
- **Practice is open to everyone, but grading is not.** Grades move `due`, `ease` and
  `state`, and they only ever arrive at `POST /coach/grade` from a local grilling session
  holding a personal token — never from a control on the page, because self-grading is
  what the system exists to prevent. So a user without a local AceLeetcode install gets
  today's problems, a solved checkbox and a copyable prompt, and **is never scheduled a
  review**. This shipped knowingly (owner, 2026-09-12); the practice view's zero state
  says so on the first day. Closing it is
  `.harness/backlogs/009-grill-me-in-the-browser-without-paying-for-it.md`, and the hard
  part there is not the cost — it is what makes such a grade worth the same as a local
  one. Do not close it by adding a grading control to the browser.
- **Pre-existing, not caused by the login work:** `pnpm run build` fails in
  `artifacts/mockup-sandbox`, whose `vite.config.ts` throws unless `PORT` is set.
  `pnpm run build:web` (what Vercel runs) and the api-server build are both fine.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
