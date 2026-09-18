# Proposal — dashboard-shell

## Why

Origin: `.harness/backlogs/008-one-dashboard-shell-and-open-the-practice-half-to-everyone.md`
(user request 2026-09-12).

Two problems that turn out to be the same shape.

1. **The logged-in area is two privileged dashboards standing side by side.** `/account`
   lists whichever the viewer may use and sends them to `/dashboard` or `/coach`. Each of
   those is a top-level route carrying its own header and its own sign-out. Adding a third
   thing means a third route and a third copy of the chrome. The owner intends to keep
   adding things, so the shape has to change before the count does.

2. **Practice is closed to an env allowlist while its data has been per-user all along.**
   `coach_reviews`, `coach_daily_log`, `coach_config` and `coach_api_tokens` all key on
   `user_id` and cascade with the account; only the problem bank is global and it holds no
   user data. `getConfig` already provisions a defaults row on first read, as `coach-api`'s
   spec requires. So "everyone gets their own, starting from zero" is not a data problem —
   it is one predicate, `isCoachUser(email)`, read in two places.

## What Changes

- **The gate stops asking for an allowlist.** `coachGate` and `POST /coach/token` require a
  resolved caller — a session cookie, or a valid bearer token for the local bridge — and
  nothing more. The uniform 404 for everyone else is untouched.
- **`COACH_EMAILS` is deleted**, along with `coachEmails()` / `isCoachUser()` and their
  test. See Reversals for why it is not kept as a kill switch.
- **`/dashboard` becomes a shell**: a left rail listing the views this viewer may use, the
  selected view beside it. A view is a path segment — `/dashboard/growth`,
  `/dashboard/practice` — so it is linkable and survives a refresh. `/coach` redirects to
  `/dashboard/practice`.
- **Entitlement decides the rail, the server decides the data.** Growth appears for the
  owner; practice appears for anyone signed in. A viewer with one available view gets that
  view with no rail control, because a one-item picker is dead UI.
- **`/account` keeps one job**: who you are, sign out, and one way into the dashboard.
- **The site header stops offering "Log in" to people who are signed in**, and stops
  carrying a separate Coach link.
- **The practice view's zero state says how the system advances.** Not empty panels, and
  not a promise: a new user is told the schedule moves when a grilling grades them, and
  that grilling runs locally today.
- **`artifacts/landing` gets a test runner** (Vitest + Testing Library + jsdom). Every
  behavior above is permission-dependent rendering, which is exactly what regresses
  silently.

## Capabilities

### New Capabilities

- `dashboard-shell`: the logged-in shell — what the rail lists, how a view is addressed,
  what an entitlement decides, and what a viewer who may use nothing sees.

### Modified Capabilities

- `coach-page`: the console requirement moves out to `dashboard-shell`; the page stops
  hiding itself from signed-in visitors; the zero state gains the local-grilling statement.
- `coach-api`: access becomes "signed in", not "on the allowlist".

## Reversals

`openspec/config.yaml` requires a change that reverses a recorded decision to name it. Five.

1. **`openspec/specs/coach-page/spec.md:90`** — "The logged-in area is a console over both
   dashboards… each dashboard the viewer may use as its own entry", with a scenario
   asserting two distinct entries. Replaced by one shell with a rail. The reason the
   original gave (the two answer different questions) is still true; the owner has decided
   a single shell that grows is worth more than the separation.
2. **`openspec/specs/coach-page/spec.md:12`** — "The page hides itself from non-allowlisted
   visitors." Once practice is open to everyone signed in, there is no non-allowlisted
   signed-in visitor left to hide from. What the requirement was protecting — not
   confirming a feature's existence to probers — survives as the anonymous 404.
3. **`openspec/specs/coach-api/spec.md:12`** — "Coach access is an env allowlist, closed by
   default." Deliberately closed-by-default while the coach was in development; the owner
   has ended that phase.
4. **`artifacts/landing/src/pages/Account.tsx:14`** — "so they are separate entries rather
   than tabs of one thing."
5. **`openspec/changes/archive/2026-09-11-jobs-page/tasks.md`** — "`artifacts/landing` has
   no test runner and no test dependencies, **by decision rather than by omission**…
   Owner's call, 2026-09-11." Reversed by the owner on 2026-09-12, one day later, for this
   change. Worth stating plainly rather than quietly installing Vitest: the earlier call
   was made when the frontend work was a read-only page provable in a browser. This change
   is permission-dependent rendering across four surfaces, where "drive it in a browser"
   means driving it four times as three different viewers.

## Non-goals

- **Grading in the browser.** The gap this change ships with — a user without the local
  grilling bridge never receives a grade, so their review schedule never advances — is
  ticket 009, not this change. This change discloses it; it does not close it.
- **Anything the growth dashboard shows.** Its numbers, its proxy and `STATS_TOKEN` are
  untouched; it becomes a view rather than a route and nothing else about it moves.
- **Any schema change or migration.** Zero state is zero rows.
- **The 404-not-403 stance**, for stats or for coach. Not what is being reversed.
- **A third view.** The rail is built so the next one is a registration, but this change
  ships exactly two.
- **The public site.** Home, `/jobs` and the marketing header's section links are unchanged
  apart from the one login/dashboard control.
- **Rate limiting or abuse controls on practice.** Opening the gate means any registered
  account can deal plans and mint a coach token; both are per-user, cheap and revocable. If
  that turns out to need bounds, it is its own change.

## Seams crossed

- **The `openapi.yaml` contract** — descriptions only, no operation or schema changes, but
  the allowlist is documented there (the `coach` tag and the comment block above
  `/coach/plan`) and codegen must run in the same task.
- **The coach gate** — the auth boundary in front of every `/api/coach/*` route. What it
  asks for changes; where it sits and what it answers do not.
- The `CoachStore` seam is **not** crossed. No store method changes.

## Impact

- `lib/api-spec/openapi.yaml` + codegen: two descriptions.
- `artifacts/api-server`: `lib/coach/auth.ts`, `routes/coach.ts`; delete `lib/auth/coach.ts`
  and `lib/auth/coach.test.ts`.
- `artifacts/landing`: new `src/pages/dashboard/`; `App.tsx`, `Account.tsx`, `Dashboard.tsx`,
  `Coach.tsx`, `SiteHeader.tsx`, `hooks/use-coach-access.ts`; new test setup.
- `replit.md`: the `COACH_EMAILS` env row goes; "Where things live" and a new architecture
  decision land.
- No schema change, no migration, no new runtime dependency on the server.
