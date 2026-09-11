# H1B Checker — website

The marketing site for the H1B Checker extension, plus accounts, plus a growth
dashboard that only the owner can see.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from `PORT`; 8080 on Replit)
- `pnpm --filter @workspace/landing run dev` — run the web app (port from `PORT`; 5173 locally)
- `pnpm --filter @workspace/api-server run test` — the auth and dashboard-gate tests
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run set-owner-password` — create or change the owner's account (see below)

### Environment

| Variable | Needed by | What it does |
|---|---|---|
| `DATABASE_URL` | api-server, db | Postgres connection string |
| `OWNER_EMAIL` | api-server | Which account may see the growth dashboard. Comma-separated, read case-insensitively. **Unset means nobody** — the dashboard is closed, not open. |
| `COACH_EMAILS` | api-server | Which accounts may use the interview coach (`/api/coach/*`) while it is in development. Same rules as `OWNER_EMAIL`: comma-separated, case-insensitive, **unset means nobody**. |
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
- **DB schema, source of truth:** `lib/db/src/schema/` (`waitlist.ts`, `auth.ts`).
- **Auth:** `artifacts/api-server/src/lib/auth/` — `password.ts` (scrypt),
  `session.ts` (cookie + token hashing), `owner.ts` (who the owner is),
  `store.ts` (the storage interface) with `drizzle-store.ts` and `memory-store.ts`.
  Routes in `src/routes/auth.ts`.
- **Dashboard data:** `artifacts/api-server/src/routes/stats.ts` is the gate;
  `src/lib/stats/upstream.ts` is the only file that reads or sends `STATS_TOKEN`.
- **Web pages:** `artifacts/landing/src/pages/` — `Home.tsx`, `Login.tsx`,
  `Account.tsx`, `Dashboard.tsx`; `src/hooks/use-auth.ts` asks the server who you are.
- **Site chrome:** `artifacts/landing/src/components/SiteHeader.tsx` and
  `SiteFooter.tsx`. The header is the only way into `/login` from the home page.
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
- **Auth routes take an `AuthStore`** rather than importing `db` the way
  `routes/waitlist.ts` does. That seam is what lets the tests run the real routes,
  the real hashing and the real cookies against memory instead of Postgres.

## Product

- A landing page for the **BingoCareer** Chrome extension: what the four badges
  mean, which four job boards it runs on, how the 60-second trial and the
  email-plus-five-questions unlock work, and where the DOL data comes from. Plus a
  waitlist form, which is a mailing list only — it is a different database from the
  extension's own email registration and does not unlock anything.
- Email-and-password accounts: create one, sign in, sign out. Nothing sits behind the
  login for an ordinary user yet — `/account` says who they are and lets them leave.
- `/dashboard` — installs, active users, checks, registered emails and referral
  channels for the extension. Visible to `OWNER_EMAIL` only.

## User preferences

- Every unit of work runs the same loop: build test-first, then a review pass
  (repo standards + does it do only what was asked), then update this file, then
  explain it in plain language.
- The dashboard was explicitly asked to be on this site behind a login, not run
  locally: "只有我的邮箱和密码log进去之后，才能看到dashboard".

## Gotchas

- **After editing `openapi.yaml`, run the codegen script.** The frontend imports
  generated hooks; nothing else regenerates them.
- **Generated query hooks demand a `queryKey`** when you pass any query option. Pass
  the matching `getXxxQueryKey(params)` helper rather than inventing one.
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
  **What the lifted rule was protecting has not gone away:** 43 boards means no FAANG and
  none of the largest H-1B filers, so a search box promising to find Google still cannot
  keep that promise. Coverage is an open owner decision, not a solved problem.
- **Pre-existing, not caused by the login work:** `pnpm run build` fails in
  `artifacts/mockup-sandbox`, whose `vite.config.ts` throws unless `PORT` is set.
  `pnpm run build:web` (what Vercel runs) and the api-server build are both fine.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
