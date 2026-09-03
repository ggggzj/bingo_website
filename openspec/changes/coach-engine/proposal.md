# Proposal — coach-engine

## Why

The AceLeetcode interview coach (today a local-only system of Python scripts +
JSON files at `~/Desktop/AceLeetcode`) is becoming a logged-in feature of this
site, per the PRD at `AceLeetcode/.harness/prd/coach-on-web.md`. Everything
downstream — API routes, the `/coach` page, data migration — needs two
foundations that do not exist in this repo yet: a place for coach data to live
in Postgres, and the deterministic scheduling engine in the language the site
runs. This change builds exactly those two foundations, and nothing user-facing.

## What Changes

- New Drizzle schema `coach.ts` in `@workspace/db`: a global problem bank
  table (seeded once from the NeetCode 150 bank) and per-user tables for
  review state, review events (grading history), daily log, and coach config.
- New workspace package `@workspace/coach-engine` (`lib/coach-engine`): a
  **pure** TypeScript port of the Python engine — spaced-repetition grading
  (`scheduler.py`), new-problem selection (`selector.py`), daily-plan building
  (`daily.py`), and day-status/streak semantics (`daylog.py`). No I/O, no
  clock access: callers pass data and today's date in, decisions come out.
- Parity test suite (vitest): ported unit tests plus golden fixtures generated
  by running the Python implementation, asserting the TS port produces
  identical numbers (intervals, ease, scores, plan composition).
- A one-shot seed script that loads the 150-problem bank into the new table.
- **Not in this change**: API routes, auth gate, personal tokens, the `/coach`
  page, user-data migration, or any change to existing site behavior.

## Capabilities

### New Capabilities

- `coach-engine`: the coach's deterministic core — how grilling grades drive
  spaced-repetition intervals and memory states; how unseen problems are
  ranked and hard ones stay locked; how a day's plan is assembled inside a
  time budget and frozen once dealt; how day status, streaks and adherence
  are derived; and what coach data is persisted (global problem bank,
  per-user review state, events, day log, config).

### Modified Capabilities

_None. Existing site behavior (auth, waitlist, stats dashboard) is untouched._

## Impact

- `lib/db/src/schema/`: new `coach.ts`, exported from `index.ts`; applied via
  the existing `drizzle-kit push` flow. Additive only — no existing table
  changes.
- New package `lib/coach-engine/` joins the pnpm workspace (`lib/*` is
  already in `pnpm-workspace.yaml`); first package in `lib/` with its own
  vitest suite, wired into root `typecheck`/`build` via the existing
  `-r --if-present` scripts.
- Reference implementation: `~/Desktop/AceLeetcode/scripts/*.py` (read-only
  input; that repo is not modified by this change).
- Known porting hazard called out for design: Python `round()` is
  half-to-even; JS `Math.round` is half-up. Interval math must reproduce
  Python's rounding or parity fails.
- No runtime dependencies added beyond what the workspace already uses
  (drizzle-orm, zod, pg; vitest for tests).
