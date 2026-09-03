# Design — coach-engine

## Context

Reference implementation: `~/Desktop/AceLeetcode/scripts/` — `scheduler.py`
(183 lines), `selector.py` (171), `daily.py` (313, of which ~half is
markdown rendering we do not port), `daylog.py` (247), with smoke tests in
`test_scheduler.py` and `test_tracking.py`. State there is JSON files; here
it becomes Postgres via the workspace's existing Drizzle setup. This repo's
conventions that bind us: schema source of truth in `lib/db/src/schema/`,
workspace packages export TS source directly (`"exports": "./src/index.ts"`),
vitest is the test runner, zod comes from the catalog.

## Goals / Non-Goals

**Goals:**
- A pure, clock-free engine package the API layer (change ②) can call with
  data it fetched, and persist whatever comes back.
- Provable behavioral parity with the Python engine before any user-facing
  work builds on it.
- Additive-only schema that later changes (API, migration) use as-is.

**Non-Goals:**
- No Express routes, no auth, no gate (change ②).
- No UI (change ③); no reading of the user's local AceLeetcode data
  (change ④ migrates it).
- No markdown plan rendering — the web page renders plans from structured
  data; the 9:04 push rework (change ④) owns its own presentation.
- No FSRS upgrade, no algorithm tuning — port what exists, byte for byte in
  behavior.

## Decisions

**1. The engine is pure functions over plain objects; the DB is someone
else's problem.**
`applyGrade(state, grade, opts) → {next, event}`, `rankNewProblems(...)`,
`buildPlan({problems, reviews, config, frozenEntry?, today}) → plan`,
`dayStatus/streak/adherence(log, today)`. Every function takes an explicit
`today: string` (ISO date); nothing calls `Date.now()`. Why: parity tests
become table-driven and trivially deterministic, and change ② can wrap the
engine in transactions without the engine knowing. Alternative — engine
talks to Drizzle directly — rejected: it would weld the hardest-to-test
logic to I/O and force a live DB into every parity test.

**2. History becomes rows (`coach_review_events`), not a JSONB array.**
Python appends events to a `history` array inside the review state. Here
`applyGrade` returns the event separately and the caller inserts a row.
Why: the weekly report and analytics (later changes) want date-ranged
queries over events; JSONB arrays make that miserable. Trade-off: parity
fixtures compare `{next, event}` pairs instead of a mutated blob — a
one-time mapping in the fixture generator. Arrays that are genuinely
opaque lists (patterns, siblings, weak points, a day's assigned ids) stay
JSONB columns; nothing queries into them.

**3. Schema (additive, `lib/db/src/schema/coach.ts`):**
- `coach_problems` — text PK (`lc-0217`), num, title, slug, difficulty,
  neetcode_group, patterns/company_freq/followups/siblings as JSONB.
  Global, no user column.
- `coach_reviews` — serial PK; user_id FK cascade; problem_id FK; state,
  ease (real), interval_days, due (date), reps, lapses, last_grade,
  weak_points JSONB; unique (user_id, problem_id).
- `coach_review_events` — serial PK; review_id FK cascade; date, mode,
  grade, interval_days, failed_on JSONB, notes; index on (review_id, date).
- `coach_daily_log` — serial PK; user_id FK cascade; day (date);
  assigned_new/assigned_reviews/solved/done JSONB; planned_minutes;
  unique (user_id, day).
- `coach_config` — user_id PK/FK cascade; daily_minutes int default 60,
  new_per_day int default 2, sprint_window_days int default 14,
  interview_date date nullable, target_companies JSONB default `[]`.
Why user_id on daily_log rows instead of a per-user document: one row per
(user, day) is what the consistency heatmap and adherence queries want.

**4. Parity by generated golden fixtures, plus ported unit tests.**
A small Python script (added to the *fixtures* directory of this package,
run once by hand against the AceLeetcode scripts) drives the reference
engine through scripted scenarios — grading sequences per grade path,
ranking with crafted banks, plan building across budgets/sprint — and dumps
`fixtures/*.json`. The vitest suite replays the same scenarios through the
TS port and deep-equals the output. Why fixtures over side-by-side
execution in CI: CI here has no Python guarantee, and frozen fixtures make
drift loud and reviewable. The ported unit tests (from `test_scheduler.py`
and `test_tracking.py`) cover intent; fixtures cover exactness.

**5. Python rounding is reproduced explicitly.**
`round()` in Python is half-to-even; `Math.round` is half-up. The port ships
a `pythonRound()` used exactly where the reference uses `round()` (partial
×1.25 growth, pass ×ease growth), with fixture cases pinned on .5
boundaries. Ease is stored to 3 decimals on serialization, as the reference
does. All other arithmetic is IEEE-754 double in both languages and needs no
shimming.

**6. Package layout mirrors the Python module split.**
`lib/coach-engine/src/{scheduler,selector,daily,daylog,round,types,index}.ts`
— one file per reference module so a reviewer can diff port against source
side by side. Zod schemas for the engine's plain-object types live here too
(catalog zod), so change ② can validate rows it feeds in. Vitest config and
`test` script follow `artifacts/api-server`'s pattern; root `typecheck`
already picks the package up via `tsc --build` once it's referenced in
`tsconfig.base.json` paths like the other lib packages.

**7. Seeding is an idempotent upsert script in `@workspace/db`.**
`lib/db/src/seed-coach-problems.ts` (run via tsx, like `set-owner-password`)
reads a committed copy of `problems.json` (checked into `lib/db/data/`) and
upserts by problem id. Why commit the bank into this repo: the site must not
depend on a file on one laptop; the bank is versioned data, 150 rows, ~100KB.

## Risks / Trade-offs

- [Silent behavioral drift the fixtures don't cover] → fixture scenarios are
  enumerated from the reference's branch points (every grade × state
  transition, hard-lock boundary, budget edge at 65% and <15 minutes,
  sprint window edges); reviewer checks the scenario list against the
  Python source before approval.
- [Float divergence across languages] → both use IEEE-754 doubles and the
  same operation order; the only known divergence class (rounding mode) is
  shimmed and pinned by fixtures. Any residual mismatch fails loudly in
  tests rather than surfacing in production.
- [Committed problem bank drifts from the AceLeetcode original] → the bank
  changes rarely; change ④ (cutover) makes this repo's copy canonical and
  retires the local one. Until then the seed script's source file records
  the copy date.
- [Schema decisions here constrain change ② APIs] → the API layer only reads
  and writes these tables; shapes were chosen from the known needs of the
  dashboard panels and record flow already implemented in Python.

## Migration Plan

Additive only: new tables via `pnpm --filter @workspace/db run push`, then
seed. No existing table is touched; rollback is dropping the five `coach_*`
tables. No production data exists for them until change ④.
