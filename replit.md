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
- `pnpm --filter @workspace/db run generate` — emit SQL for a schema change. **There is no
  `push` any more**, and that is deliberate rather than an oversight: it reconciles the
  *whole* schema, and after the move onto h1_checker's database (2026-09-20) this repo's
  schema describes seven of that database's twenty-eight tables. A push from here would read
  h1_checker's entire application as tables that should not exist. The script is deleted from
  `lib/db/package.json` and `drizzle.config.ts` throws if `drizzle-kit push` is invoked
  directly.

  It could not have reached production anyway. Measured 2026-09-18: `railway run` hands it
  `DATABASE_URL=postgres://…@postgres-ebww.railway.internal`, a hostname that resolves only
  from inside Railway's network, so from a laptop it died on `ENOTFOUND` before opening a
  connection. That failure was safe but opaque, and it was never the real reason not to use
  it.

  **Who owns which tables in the surviving database** (owner, 2026-09-20): `users` and
  `sessions` are h1_checker's — this repo's `lib/db/src/schema/auth.ts` is a description for
  types and changing it changes nothing. `coach_*` and `new_grad_seen` are this repo's, and
  are changed with `generate` plus the apply path below.

  **To change the production schema, connect and run the statement:**

  ```
  railway connect Postgres-EBWW       # opens psql through the public proxy
  alter table users alter column password_hash drop not null;
  ```

  That is how `password_hash` was made nullable in production on 2026-09-18, and how
  `new_grad_seen` was created there on 2026-09-19:

  ```sql
  create table new_grad_seen (
    user_id integer primary key references users(id) on delete cascade,
    acknowledged_at timestamptz not null default now(),
    listed jsonb not null default '[]'::jsonb
  );
  ```

  Verified with `\d new_grad_seen` rather than assumed: three columns, the defaults, and
  the cascade to `users`. One statement
  beats `push` here for a second reason beyond reachability: push reconciles the *whole*
  schema, and `waitlist` is currently in the database but not in `lib/db/src/schema/`, so a
  successful push would also offer to drop it — see
  `.harness/session-todos/2026-09-18-drop-the-waitlist-table-in-production.md` for why that
  table is dropped by hand instead. `.harness/backlogs/007` exists because push does not say
  which database it is about to change.
- `pnpm --filter @workspace/api-server run set-owner-password` — create or change the owner's account (see below)

### Environment

| Variable | Needed by | What it does |
|---|---|---|
| `DATABASE_URL` | api-server, db | Postgres connection string |
| `OWNER_EMAIL` | api-server | Which account may see the growth dashboard. Comma-separated, read case-insensitively. **Unset means nobody** — the dashboard is closed, not open. |
| `STATS_API_BASE_URL` | api-server | Origin of the extension's API, e.g. `https://h1bchecker-production.up.railway.app` |
| `STATS_TOKEN` | api-server | Must match `STATS_TOKEN` on that server. Server-side only; never sent to a browser. |
| `TRUST_PROXY` | api-server | Proxies in front of us. Defaults to 1 in production, 0 elsewhere — see Gotchas. |
| `GOOGLE_CLIENT_ID` | api-server | The OAuth client `POST /auth/google` checks a token's `aud` against. **Unset means nobody can sign in with Google** — the route refuses rather than skipping the check. |
| `VITE_GOOGLE_CLIENT_ID` | landing (build time) | The same value, for Google's library. Public by design. Unset and `/login` shows the password form instead of a button that cannot work. |

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
- **DB schema, source of truth:** `lib/db/src/schema/` (`auth.ts`, `coach.ts`,
  `new-grad.ts`).
- **Auth:** `artifacts/api-server/src/lib/auth/` — `password.ts` (scrypt),
  `session.ts` (cookie + token hashing), `owner.ts` (who the owner is),
  `store.ts` (the storage interface) with `drizzle-store.ts` and `memory-store.ts`.
  Routes in `src/routes/auth.ts`.
- **Dashboard data:** `artifacts/api-server/src/routes/stats.ts` is the gate;
  `src/lib/stats/upstream.ts` is the only file that reads or sends `STATS_TOKEN`.
- **The owner's new-grad list:** `artifacts/api-server/src/routes/new-grad.ts` is the
  gate and the assembly; `src/lib/new-grad/titles.ts` decides what an early-career
  software title is and which class it names, `location.ts` reads a country out of a
  location string, `marker-store.ts` is the Postgres half of the "what had I already
  seen" seam. The page is `artifacts/landing/src/pages/dashboard/NewGradList.tsx`.
- **Google sign-in:** `artifacts/api-server/src/lib/auth/google.ts` is the only place a
  token is verified; `artifacts/landing/src/components/auth/GoogleSignInButton.tsx` is the
  only place one is asked for.
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

### The owner's new-grad list, 2026-09-18

- **Twelve terms where the public page sends one.** `/jobs`'s seniority control sends
  `title=new grad` as a single substring and its spec states the cost outright. Against
  the owner's own 376 US rows that reaches 55; the 321 it misses are titled
  `Entry Level Java Developer Associate`, `Associate Software Engineer`,
  `EFA Network Software Engineer 1`. So this list asks the upstream **one question per
  early-career term** — fourteen requests per page load, pinned by a test — and
  intersects them with a software test and a seniority exclusion **here**, because
  `/api/postings` takes one `title` matched as `ilike` and cannot express a conjunction.
  The fan-out is deliberate and temporary: when `.harness/backlogs/016` opens this to
  every user the query belongs upstream, and this is what gets deleted.
- **It filters and never labels.** No seniority is stored, none is rendered, and the page
  says it is a title search — the line `openspec/specs/jobs-page/spec.md` draws, which is
  between narrowing and asserting rather than between one term and twelve. That spec is
  not amended.
- **The class year fences and sorts; it is not the filter.** 8 of the owner's 376 titles
  contain `2027`, one contains `2026`, and 367 contain no year at all. Filtering on the
  year would be an eight-row page. So a title naming another class is excluded, one
  naming the target sorts first with its reason on the row, and one naming no year is
  listed. `TARGET_CLASS_YEAR` is a constant: this page outlives one hiring season.
- **Location is three states because the data has three.** There is no country upstream
  (`../h1_checker/.harness/backlogs/011` is still open), only the string a provider
  wrote. Reads-as-US is listed, plainly-elsewhere is dropped, and unreadable is listed
  **and marked** — the same 是/否/? the owner's own spreadsheet settled on. An
  unreadable string must never resolve to US; there is a test whose only job is that.
- **"New since you last looked" is a stored snapshot of rows, not a timestamp.** Two
  upstream facts force it: the browse route returns no first-seen field, and it returns
  **open postings only** — so a posting that closed is simply absent, and absence cannot
  be told from never having existed. `new_grad_seen` holds enough of each listed posting
  to render a row that has since closed. It is a snapshot for comparison, not a second
  copy of the feed.
- **Rendering never advances the marker.** `POST /new-grad-list/ack` does, and it
  recomputes the list rather than trusting what the caller sends. Advancing on render
  would mean a reload or a second tab silently spent the one answer the page is for —
  the same reason the upstream's browse route never writes a delivery row.
- **The sponsorship half is imported, not ported.** `SponsorshipEvidence` already renders
  the employer's filings and the posting's own refusal as two claims that never merge,
  and already treats `no_sponsor: null` as "nobody has read it". The route's response
  therefore references the existing posting schema rather than declaring a second shape —
  a second shape is exactly what would have forced a third copy of that judgement, and
  `../h1_checker`'s 401 defect was a two-place bug for precisely that reason.

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

- **A Google-proved address is also written to `registrations` and `email_verifications`,
  two tables this repo shares but does not own.** They are h1_checker's, defined in its
  `models.py` and migrated there lazily at runtime; the owner's dashboard reads them, and
  before the 2026-09-21 cutover this site had its own database containing neither. Since
  that day a sign-in that reached only `users` left a real person invisible on that
  dashboard, which is the defect `fix-google-signin-skips-the-owner-list` closed.

  `DrizzleAuthStore.recordProvenAddress` writes them as **raw SQL, and they are deliberately
  absent from `lib/db/src/schema/`**. `drizzle.config.ts` already refuses `push` because this
  schema describes seven of that database's twenty-seven tables. The gap that guard leaves is
  the path it recommends instead: `generate` emits DDL for everything the schema declares, so
  declaring these two would put `CREATE TABLE`, and later `ALTER TABLE`, for h1_checker's
  tables into a migration file indistinguishable from this repo's own. Staying out of the
  schema is what makes that impossible rather than unlikely.

  The price is that the compiler checks no column name on that path.
  `lib/auth/proven-address.contract.test.ts` pays it — but it **skips** without
  `COACH_TEST_DATABASE_URL`, so a green run on a machine with no scratch Postgres has not
  checked those two statements at all.

- **Running the contract tests locally: a throwaway Postgres, in four commands.** Both
  `store.contract.test.ts` and `proven-address.contract.test.ts` skip silently without
  `COACH_TEST_DATABASE_URL`, which is how a suite reads 156-green while two files never ran.

  ```sh
  export LC_ALL=C                      # else the postmaster dies "multithreaded" on macOS
  initdb -D /tmp/pg -U postgres --auth=trust
  pg_ctl -D /tmp/pg -o "-p 55432 -k /tmp/pg -c listen_addresses=127.0.0.1" -w start
  psql postgresql://postgres@127.0.0.1:55432/postgres -c 'create database scratch'
  psql postgresql://postgres@127.0.0.1:55432/scratch -f lib/db/drizzle/0000_*.sql
  COACH_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55432/scratch \
    pnpm --filter @workspace/api-server run test
  ```

  With that, 2026-09-21: **163 passed, 14 files, nothing skipped**. Two traps are worth the
  four lines — `LC_ALL` unset kills the postmaster on macOS with a message about threads that
  names no cause, and a socket directory under a long path fails at 103 bytes, which is easy
  to hit inside a sandbox's temp dir. `push` is not how the schema gets there; the config
  refuses it, so the generated migration is applied instead.

- **Signing in is Google, and the ID-token flow rather than the redirect one.** The page
  gets a token from Google's library and posts it to `POST /api/auth/google`; the server
  verifies it against Google's published keys (`lib/auth/google.ts`, via `jose`) and starts
  the same session `/auth/login` does. Taking only `email`, `profile` and `openid` means no
  redirect URI, no client secret and **no Google review** — simplify.jobs uses the redirect
  flow because it also asks for Gmail scopes, and we do not. The JWKS location comes from
  Google's discovery document rather than a constant, because it is theirs to move.

  **Verification happens here rather than in `../h1_checker`**, whose `/auth/google` is live
  and would have meant one verifier instead of two. It was not chosen because
  `sessions.user_id` points at *this* database's `users`: a signed-in browser on this origin
  needs a local row whoever verified the token, so routing through there would have produced
  two rows per person rather than one. After `.harness/backlogs/018` merges the databases,
  one of the two verifiers can go.

  **Keyed on the address, not Google's `sub`.** `sub` is the stable identifier and the
  textbook choice; this product cannot use it, because `OWNER_EMAIL` is an address, `018`
  merges by address, and the extension's identities are addresses. The cost: somebody who
  changes the address on their Google account arrives as a new person.

- **A Google sign-in onto an address that already has a password clears that password —
  except the owner's.** Sign-up does not verify an address, so a password on one is a
  *claim*; a Google sign-in is *proof*, and proof wins. `OWNER_EMAIL` is exempt because that
  password is the way into the dashboard when Google's own configuration is wrong, and
  clearing it would delete the fallback on first use. The person is told with a toast rather
  than finding out next time they try.

  **Known limit:** sessions already open on a cleared account are *not* revoked. Revoking is
  safer and would sign the legitimate owner out of their other browser as a side effect of
  signing in, so it was left rather than decided quietly.

## Gotchas

- **`/login?password=1` is the email form, and nothing links to it.** The page carries one
  Google control by decision (2026-09-17). The form is how the owner gets in when Google is
  misconfigured, and how the identities that still hold passwords would sign in. It is **not
  a security boundary and must not be built as one** — the routes are rate-limited and answer
  401 the same either way; the parameter hides a form from people not looking for it, and
  anyone reading the bundle can find it.

- **One Google client serves both this site and the extension**, so `aud` no longer separates
  the two surfaces: a token minted for one is valid at the other. Both are ours and `018`
  makes them one identity, so the blast radius is small — but it is no longer a boundary
  between them, only against every other application. A second client would restore it.

- **The Google console work is done** (2026-09-20): `https://bingocareer.com` and
  `http://localhost:5173` are Authorized JavaScript origins on the `h1b-extension-signin`
  client, and the app is In production. Verified end to end on the live site — a Google
  address signs in, and the owner's password still opens `/login?password=1` and reaches the
  dashboard, which is the exemption working.

  **If you ever add another origin, expect `Error 400: origin_mismatch` first.** Google's own
  documentation says an origin change takes "5 minutes to a few hours" to propagate, and it
  really does: the first sign-in attempt after saving failed with exactly that, and the same
  attempt succeeded a few minutes later with nothing changed. Nothing is misconfigured when
  you see it — wait, then retry in a private window so the browser is not holding the old
  config.

  Two console fields are still worth knowing about. The app shows a **"requires verification"**
  banner; it does not apply here, because `email`, `profile` and `openid` are non-sensitive
  scopes and Google's own docs say verification is not mandatory for them. And **one client
  serves both this site and the extension**, so `aud` no longer separates the two surfaces —
  see the gotcha above.

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
