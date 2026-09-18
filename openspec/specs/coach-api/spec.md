# coach-api Specification

## Purpose

HTTP access to the interview coach: who may use it (any signed-in user),
how callers prove who they are (browser session or personal bearer token),
and the contracts of the coach endpoints that the web page and the local
grilling bridge rely on.

## Requirements

### Requirement: Coach access is a session, refused uniformly
Access to every coach endpoint SHALL be limited to callers the server can
resolve: a signed-in session, or a valid unrevoked personal token. Any other
request SHALL receive the same uniform 404 the stats routes use — never a
401/403 that confirms the routes exist.

#### Scenario: An ordinary signed-in user calls a coach route
- **WHEN** a signed-in user who is on no list calls `GET /api/coach/plan`
- **THEN** the response is their own plan, dealt from their own history

#### Scenario: Signed-out caller probes a coach route
- **WHEN** a signed-out caller calls any coach endpoint
- **THEN** the response is 404 with the generic not-found body

#### Scenario: One user cannot reach another's rows
- **WHEN** a signed-in user calls any coach endpoint
- **THEN** the rows read and written are those of the caller resolved from
  the session or token, and no request parameter can select another user

### Requirement: Personal API tokens for browserless access
A signed-in user SHALL be able to create a personal API token via the
session-authenticated token endpoint. The plaintext token SHALL be returned
exactly once at creation; the server SHALL store only its SHA-256 hash in a
revocable row. Creating a new token SHALL revoke the caller's previous tokens
(one live token per user), and a revoke endpoint SHALL invalidate the current
token. Coach endpoints SHALL accept a valid, unrevoked token via
`Authorization: Bearer <token>` as equivalent to that user's session. The
token endpoint SHALL continue to take the session cookie only, never a bearer
token, so a stolen token cannot mint its own successor.

#### Scenario: Token round-trip
- **WHEN** a signed-in user POSTs to the token endpoint with a valid session,
  then calls `GET /api/coach/plan` with only
  `Authorization: Bearer <returned token>`
- **THEN** the plan request succeeds as that user

#### Scenario: Rotation revokes the predecessor
- **WHEN** a user issues a second token and then presents the first
- **THEN** the request with the first token receives the uniform 404

#### Scenario: A token cannot mint a successor
- **WHEN** a caller presents only a bearer token to the token endpoint
- **THEN** the response is the uniform 404

### Requirement: Plan endpoint deals and freezes the day
`GET /api/coach/plan` SHALL return the caller's plan for the current UTC
date, built by the coach engine from the user's rows. On the first call of
a day it SHALL persist the dealt assignment to the user's day-log row;
subsequent calls that day SHALL rebuild from the frozen assignment with
completion marks applied, never dealing fresh problems. The response SHALL
include, per item, the problem's display fields (number, title, slug,
difficulty, patterns), minutes, review mode and weak points where
applicable, plus the plan's totals, deferred-review count and sprint flags.

#### Scenario: Same list all day
- **WHEN** the plan is fetched, then fetched again after one problem is
  graded
- **THEN** both responses list the same problem ids, the second with that
  problem marked done with its grade

### Requirement: Solved and grade endpoints write through the engine's rules
`POST /api/coach/solved` SHALL set or clear the solved mark for a problem
on today's day-log row, and SHALL refuse (409) to clear it for a problem
already graded today. `POST /api/coach/grade` SHALL accept a grade
(`pass`/`partial`/`fail`), optional weak points, mode and notes; apply the
engine's grading against the user's current review state (creating it for
a first encounter); persist the next state, append one review event, and
stamp the day-log's done list (same-day re-grade overwrites). Grading an
unknown problem id SHALL be a 422; both endpoints only ever touch the
calling user's rows.

#### Scenario: Grade advances scheduling
- **WHEN** a first-encounter `partial` with weak points is recorded for a
  problem
- **THEN** the review row shows state `learning`, interval 1 with a due
  date, the weak points stored, and exactly one new review event

#### Scenario: Un-solving a graded problem is refused
- **WHEN** a problem graded today receives `solved: false`
- **THEN** the response is 409 and the day log is unchanged

### Requirement: Forecast and log endpoints feed the dashboard
`GET /api/coach/forecast` SHALL return, for a bounded number of upcoming
days (default 14), the count and estimated minutes of reviews coming due
per day for the caller, with overdue reviews counted on the current day.
`GET /api/coach/log` SHALL return the caller's day-log entries over a
bounded trailing window (default 91 days) with each day's derived status,
plus the current streak and adherence numbers, computed by the engine.

#### Scenario: Overdue reviews land on today
- **WHEN** a user has reviews due 3 days ago and tomorrow and fetches the
  forecast
- **THEN** the overdue review is counted under the current date and the
  other under tomorrow's date

### Requirement: Config endpoints expose per-user coach settings
`GET /api/coach/config` SHALL return the caller's coach settings,
creating the row with defaults (60 minutes, 2 new per day, 14-day sprint
window, no interview date, empty target companies) on first read.
`PUT /api/coach/config` SHALL validate and update only the caller's row;
interview date must be a valid ISO date or null, numeric fields must be
positive integers within sane bounds, and invalid input SHALL be a 422
leaving the row unchanged.

#### Scenario: First read creates defaults
- **WHEN** a signed-in user with no config row fetches config
- **THEN** the response carries the default values and a row now exists

### Requirement: Coach API is spec-first
Every coach endpoint SHALL be defined in the shared OpenAPI spec before
implementation, and the generated client hooks and zod schemas SHALL be
regenerated from it, so the web page consumes only generated types.

#### Scenario: Spec and server agree
- **WHEN** the OpenAPI spec's coach operations are compared with the
  mounted Express routes
- **THEN** every documented path, method, and response status is served,
  and route tests exercise the documented statuses
