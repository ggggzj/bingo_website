# coach-engine Specification

## Purpose

The deterministic core of the interview coach: how grilling grades drive
spaced-repetition scheduling, how unseen problems are ranked, how a day's
plan is assembled and frozen, how day status and streaks are derived, and
what coach data is persisted per user. Ported from the proven Python
implementation in the AceLeetcode repo; behavior parity with it is part of
the contract.

## Requirements

### Requirement: Grading advances memory state deterministically
The engine SHALL accept exactly three grades — `pass`, `partial`, `fail` —
and, given a review state, a grade, optional weak points and an explicit
reference date, SHALL return the next state without reading the system clock
or any other ambient input. Identical inputs SHALL always produce identical
outputs.

Grade semantics (matching the Python reference):
- `fail` MUST increment lapses, reduce ease by 0.20, set state to
  `learning`, and reset the interval to 1 day — regardless of prior interval.
- `partial` MUST reduce ease by 0.05; while `new`/`learning` it advances one
  learning step (1 → 3 → 7 days); in `review` and beyond it grows the
  interval by ×1.25 (minimum 2 days).
- `pass` MUST increase ease by 0.10; while `new`/`learning` it advances one
  learning step, entering `review` at the final step; in `review` and beyond
  it multiplies the interval by the ease factor.
- Ease SHALL stay clamped to [1.3, 3.2]; intervals SHALL be capped at 180
  days; an interval ≥ 60 days sets state `mastered`. `mastered` is not an
  exit — the problem keeps returning.
- The due date SHALL be the reference date plus the new interval, and every
  grading SHALL append one history event recording date, mode, grade,
  interval and the points failed on.

#### Scenario: Learning ladder on consecutive passes
- **WHEN** a new problem is graded `pass` three times on successive due dates
- **THEN** its intervals are 1, 3, then 7 days, and its state is `review`
  after the third pass

#### Scenario: Fail resets a long interval
- **WHEN** a problem in `review` with a 30-day interval is graded `fail`
- **THEN** its interval becomes 1 day, its state `learning`, its lapse count
  increases by one, and its ease drops by 0.20 (not below 1.3)

#### Scenario: Weak points replace on pass, merge otherwise
- **WHEN** a grading supplies weak points
- **THEN** they are kept newest-first, de-duplicated, capped at 6
- **WHEN** a grading is `pass` with no weak points supplied
- **THEN** the stored weak points are cleared

### Requirement: Retention risk orders due reviews
The engine SHALL compute a retention-risk score for a due problem that grows
with overdueness relative to the problem's own interval and is amplified by
prior lapses and low ease, and SHALL be 0 for problems not yet due. Due
reviews SHALL be rescued highest-risk first.

#### Scenario: More overdue means higher risk
- **WHEN** two problems share interval, lapses and ease, but one is 5 days
  overdue and the other 1 day
- **THEN** the 5-days-overdue problem scores strictly higher risk

### Requirement: New-problem ranking
The engine SHALL rank only unseen problems, blending company demand, pattern
gap, weak-pattern pull and curriculum order in normal mode, and SHALL switch
to demand-dominated scoring (0.80 demand / 0.20 curriculum) in sprint mode.
`hard` problems SHALL stay locked until at least one of their patterns has
two non-failing problems in `review` or beyond. Ties SHALL break by ascending
problem number so ranking is stable.

#### Scenario: Hard problems locked before the pattern is solid
- **WHEN** ranking runs while no pattern of a hard problem has 2 solid
  problems
- **THEN** that hard problem does not appear in the ranking

#### Scenario: Sprint mode reorders by company demand
- **WHEN** sprint mode is on and two unseen problems differ mainly in
  target-company frequency
- **THEN** the higher-frequency problem ranks first even if the other fills
  a larger pattern gap

### Requirement: Daily plan assembly within a budget
Given problems, review states, config and a reference date, the engine SHALL
build a day plan that: places due reviews first (highest risk first) but
caps their cost at 65% of the minutes budget outside sprint (100% in
sprint); estimates review cost at 4 minutes for an oral grill and 60% of
first-solve minutes for a re-solve (minimum 8); selects a review mode of
`re-solve` only when the last grade was `fail`, otherwise `grill`; then
fills remaining budget with top-ranked new problems up to the configured
`new_per_day`, skipping problems that do not fit and stopping when under 15
minutes remain; and reports how many due reviews were deferred. Sprint mode
is active when the reference date is within `sprint_window_days` of a
configured interview date.

#### Scenario: Backlog cannot crowd out new problems
- **WHEN** due reviews cost more than 65% of the budget outside sprint
- **THEN** lower-risk reviews are deferred, the count of deferrals is
  reported, and new problems still receive the remaining budget

#### Scenario: Sprint day is review-only unless idle
- **WHEN** sprint mode is active and due reviews fill the budget
- **THEN** the plan contains no new problems

### Requirement: A day's assignment freezes on first deal
The first plan generated for a calendar day SHALL freeze its assigned
problem ids and planned minutes in that user's day log. Rebuilding the plan
for the same day SHALL reproduce the frozen assignment with completion marks
applied — never deal fresh problems — unless an explicit reassign is
requested.

#### Scenario: Re-planning an unfinished day
- **WHEN** a plan is requested again later on an already-assigned day
- **THEN** the same problem ids come back, with solved/graded marks
  reflecting what happened since

### Requirement: Solved and graded are distinct facts
The day log SHALL track `solved` (code written and accepted; self-reported)
separately from `done` (a grilling produced a grade). A graded problem SHALL
count as solved automatically; un-solving a problem that was graded that day
SHALL be refused. Re-grading the same problem the same day SHALL overwrite
its grade, not duplicate it. Day status SHALL be derived as: `complete` (all
assigned graded), `partial`, `ungraded` (solved but nothing graded — its own
state, never rounded up), `missed`, `extra`, `rest`, or `pending` (today
only). Streak SHALL count consecutive `complete`/`extra` days backwards,
with an unfinished today not breaking it.

#### Scenario: Solved-but-ungraded day is not a success
- **WHEN** a past day's assigned problems were all ticked solved but none
  were graded
- **THEN** that day's status is `ungraded` and it breaks a streak

### Requirement: Coach data is persisted relationally per user
The database SHALL hold: a global problem bank (id, number, title, slug,
difficulty, NeetCode group, patterns, per-company frequency, follow-ups,
sibling ids) seeded with the 150-problem NeetCode bank; and per user — one
review-state row per problem (unique per user+problem), one review event
per grading, one day-log row per calendar day, and one config row (daily
minutes, new-per-day, sprint window, optional interview date, target
companies) with defaults matching the reference system (60 minutes, 2 new,
14-day window). User rows SHALL cascade on account deletion; the problem
bank is shared and MUST NOT contain user data.

#### Scenario: Seeding is idempotent
- **WHEN** the seed script runs against an already-seeded database
- **THEN** the bank still holds exactly one row per problem, updated in
  place, and no duplicates

### Requirement: Parity with the Python reference implementation
The ported engine SHALL reproduce the Python implementation's outputs
exactly on a committed golden-fixture suite covering grading sequences,
ranking orders and plan composition — including Python's round-half-to-even
arithmetic wherever the reference uses `round()`. Fixture mismatches are
defects in the port, not acceptable drift.

#### Scenario: Interval arithmetic rounds like Python
- **WHEN** a `review` problem's interval × ease lands exactly on .5
- **THEN** the ported engine yields the same integer Python's banker's
  rounding produces
