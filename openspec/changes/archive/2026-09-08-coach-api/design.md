# Design — coach-api

## Context

See proposal.md for motivation. What shapes the approach: the api-server's
established patterns — auth routes take an `AuthStore` seam so tests run
real routes against memory; the stats router's uniform-404 gate; sessions
as hashed opaque tokens (`lib/auth/session.ts` has the primitives); spec
lives in `lib/api-spec/openapi.yaml` and Orval generates the client. The
engine (`@workspace/coach-engine`) is pure and clock-free: routes fetch
rows, call it, persist what it returns.

## Goals / Non-Goals

**Goals:**
- The owner can drive the whole tracker over HTTP today: fetch plan, tick
  solved, record grades from a local grilling session via bearer token.
- Every route testable against memory, like the auth suite.
- Additive only; nothing outside `/api/coach/*` changes behavior.

**Non-Goals:**
- No UI, no migration, no analytics endpoints (gaps/pattern-strength port
  of `analytics.py` comes with the work that consumes it).
- No multi-token management UI semantics (one live token per user is
  enough for the MVP bridge).
- No rate-limit tuning beyond mounting the existing limiter helpers where
  they obviously belong (token issuance).

## Decisions

**1. Gate = `lib/auth/coach.ts` mirroring `owner.ts`.**
`coachEmails()` / `isCoachUser(email)` reading `COACH_EMAILS`. Same
trim/lowercase/empty-means-nobody semantics, same "configuration, not a
column" rationale. Alternative — a DB flag — rejected for the same reason
the owner flag was.

**2. One auth resolver for both credentials.**
`currentCoachUser(store, req)`: try the session cookie via the existing
`currentUser`, else a `Bearer` token hashed with the existing `hashToken`
and looked up in `coach_api_tokens`. Returns the user or null; the router
wraps it with the allowlist check and the uniform 404. Bearer tokens are
long-lived rows (`revoked_at` nullable, `last_used_at` touched on use) —
the sessions discipline without the 30-day expiry, because the bridge is a
trusted personal machine and rotation is one POST away.

**3. Token lifecycle: issue-revokes-predecessors.**
`POST /coach/token` inserts a new row and revokes the caller's live ones in
the same transaction; `DELETE /coach/token` revokes all. One live token per
user keeps "which machine can write grades" a one-row question. The
plaintext is shown once; the response includes a copy-paste `export
COACH_TOKEN=...` hint for the bridge.

**4. `CoachStore` seam, two implementations.**
Interface owns all coach persistence the routes need: load problems (bank
is read-only reference data), get/upsert review + insert event
(transactionally with the day-log stamp), get/put day-log entry for a date,
get/put config, token CRUD. `drizzle-store.ts` is real; `memory-store.ts`
backs the tests. The engine is not behind the seam — it is pure and runs
identically in tests.

**5. Freeze semantics live in the plan handler, not the engine.**
The engine's `buildPlan` already returns `{plan, assignment}`;  the route
fetches today's row, passes it as `entry`, and persists `assignment` when
non-null. Two concurrent first calls are resolved by the day-log's
`(user_id, day)` unique constraint: the loser re-reads and rebuilds from
the winner's frozen row. GET-with-a-write is accepted deliberately — the
"first read deals the day" behavior is the product rule inherited from the
reference, and it is idempotent after the first call.

**6. Dates are UTC ISO strings end to end.**
The engine already works on ISO days computed in UTC; routes derive
"today" as the UTC date and store `date` columns. The dashboard change can
revisit timezone presentation; storing local-time days per user is not
worth the complexity while the only user is the owner.

**7. Row ↔ engine mapping is one small module.**
`lib/coach/mapping.ts` in api-server converts `coach_reviews` rows
(camelCase columns) to the engine's snake_case `ReviewState` and back, and
day-log rows to `DayLogEntry`. Keeping it in one file keeps the naming seam
auditable; generated API schemas use camelCase like the rest of the API.

**8. OpenAPI first, Orval after.**
New `coach` tag; operations `getCoachPlan`, `setCoachSolved`,
`recordCoachGrade`, `getCoachForecast`, `getCoachLog`, `getCoachConfig`,
`updateCoachConfig`, `createCoachToken`, `revokeCoachToken`. All coach
responses document only 200/201/404/409/422 — 404 doubles as the gate's
answer, matching the stats precedent of not documenting who is allowed.

## Risks / Trade-offs

- [Bearer token grants full coach write access if leaked] → hashed at
  rest, single live token, one-call rotation and revocation, never logged;
  scope is coach routes only — it is not a session and cannot touch auth
  or stats.
- [GET /plan writes on first call of a day] → accepted product semantics
  (freeze-on-first-deal); unique constraint makes the race safe; the write
  is idempotent for the rest of the day.
- [Uniform 404 makes debugging "why can't I get in" harder for the owner]
  → the failure is always configuration (`COACH_EMAILS`), documented in
  replit.md next to `OWNER_EMAIL`.
- [Engine/day-log stamp must stay consistent across two tables on grade]
  → the drizzle store wraps review upsert + event insert + day-log stamp
  in one transaction; the memory store mimics atomicity trivially.

## Migration Plan

Additive: one new table (`coach_api_tokens`) via the existing push flow;
new routes mounted under `/api/coach`. Rollback is unmounting the router
and dropping the table. No existing route or table changes.
