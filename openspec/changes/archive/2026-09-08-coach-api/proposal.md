# Proposal — coach-api

## Why

The coach engine and its tables (change `coach-engine`, archived) exist but
nothing can reach them: there are no routes, no way for the owner's local
grilling sessions to record grades, and no gate. This change makes the
tracker usable over HTTP — for the web page (next change) and for the local
Claude Code grill bridge (per the PRD: personal API token) — while keeping
the feature closed to everyone but the configured allowlist during
development.

## What Changes

- **Access gate**: a `COACH_EMAILS` env allowlist module, mirroring
  `OWNER_EMAIL`'s "owner is configuration" pattern. Unset means the feature
  is closed for everyone; non-allowlisted users get the same uniform 404 the
  stats routes use.
- **Personal API token**: a new `coach_api_tokens` table (hashed, revocable
  rows — the sessions discipline) plus routes to issue/rotate and revoke the
  caller's token. Coach routes accept either the browser session cookie or
  `Authorization: Bearer <token>`, so local grill sessions can record grades
  without a browser.
- **Coach routes** under `/api/coach`, all behind auth + gate:
  - `GET /coach/plan` — today's plan; deals and freezes the day's assignment
    on first call, rebuilds from the frozen assignment after.
  - `POST /coach/solved` — tick/untick a problem as solved (refusing to
    un-solve a graded one).
  - `POST /coach/grade` — record a grilling grade with weak points: applies
    the engine's grading, upserts review state, appends a review event,
    stamps the day log.
  - `GET /coach/forecast` — upcoming review load per day (dashboard's
    two-week forecast).
  - `GET /coach/log` — day-log entries with derived statuses, streak and
    adherence (dashboard's consistency heatmap).
  - `GET /coach/config` / `PUT /coach/config` — the user's coach settings.
- **Spec-first**: all routes added to `lib/api-spec/openapi.yaml` first,
  then codegen regenerates the client hooks and zod schemas.
- **Not in this change**: the `/coach` web page (next change), data
  migration and the reworked 9:04 push (cutover change), and the deeper
  analytics endpoints (knowledge gaps, pattern strength) — those port
  `analytics.py` and come with the page or report work that consumes them.

## Capabilities

### New Capabilities

- `coach-api`: HTTP access to the coach — who may use it (allowlist gate,
  uniform 404), how callers authenticate (session cookie or personal
  bearer token, token lifecycle), and the behavior of the plan / solved /
  grade / forecast / log / config endpoints over the engine and tables.

### Modified Capabilities

_None. `coach-engine` is consumed as-is; its requirements do not change._

## Impact

- `artifacts/api-server`: new `routes/coach.ts`, a coach auth/gate helper in
  `lib/auth/` (token hashing reuses `session.ts` primitives), wiring in
  `routes/index.ts`, and a `CoachStore` seam with drizzle + memory
  implementations so route tests run against memory, matching the auth
  tests' approach.
- `lib/db`: one additive table `coach_api_tokens` in `schema/coach.ts`.
- `lib/api-spec/openapi.yaml` + regenerated `lib/api-client-react` /
  `lib/api-zod` output.
- New env var `COACH_EMAILS` (documented in replit.md's environment table).
- Depends on `@workspace/coach-engine` (added as an api-server dependency).
