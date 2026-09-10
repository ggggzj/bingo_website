# coach-insights — spec delta

## Purpose

The slower questions the coach answers from stored state: which explanations
keep collapsing, which patterns are actually held, what was written but never
defended, and — from all of it — what the candidate should do next, named
concretely rather than as generic study advice.

## ADDED Requirements

### Requirement: Knowledge gaps are concrete, testable claims
The engine SHALL report open gaps as the weak points currently attached to a
problem, each carrying the problem, its patterns, how many gradings that point
has caught the candidate on, and how many sessions it has survived since. A
point SHALL leave the open list only because a clean pass cleared it — never
because time passed — and cleared points SHALL be reported separately. Open
gaps SHALL be ordered by hits, then by sessions survived, then by problem
number.

#### Scenario: A repeated gap outranks a fresh one
- **WHEN** one weak point has caught the candidate twice and another once
- **THEN** the twice-caught point is listed first

#### Scenario: A clean pass clears the gap
- **WHEN** a problem carrying weak points is graded `pass` with no new weak
  points
- **THEN** those points move from open to cleared

### Requirement: Pattern strength reflects state, lapses and coverage
The engine SHALL report, per pattern in the bank: how many of its problems
exist, how many have been seen, how many are solid, total lapses, open gap
count, a strength score derived from each seen problem's state (penalized by
lapses, capped for a last grade of `fail`), the mean ease, and a confidence
that reaches 1.0 only at three seen problems — a pattern proved on one problem
is not owned.

#### Scenario: Lapses cost strength
- **WHEN** two patterns have identical states but one has lapsed twice
- **THEN** the lapsed pattern's strength is strictly lower

#### Scenario: Confidence needs breadth
- **WHEN** a pattern has exactly one seen problem
- **THEN** its confidence is 1/3, however well that problem is held

### Requirement: The ungraded backlog is surfaced as its own state
The engine SHALL list problems that were ticked solved but never graded, each
with the day it was first solved and how many days ago that was, ordered
oldest first. These SHALL be reported even though they are invisible to the
scheduler — that invisibility is the reason they matter.

#### Scenario: Oldest unfinished business first
- **WHEN** two problems were solved but never graded, three days apart
- **THEN** the older one leads the list

### Requirement: Guidance is derived, prioritized and specific
The engine SHALL produce an ordered list of guidance items, each with a tone
(`critical` / `warn` / `info` / `good`), a title and a body, covering — when
the state warrants it — overdue reviews, the solved-but-ungraded backlog,
today's unfinished assignment, the top open gaps, leeches (problems that have
collapsed repeatedly), heavy upcoming review days, adherence, an empty
schedule, and an approaching interview. Every item SHALL name a problem, a
date or a number; generic study advice SHALL NOT appear.

#### Scenario: Overdue work leads
- **WHEN** reviews are overdue and other conditions also hold
- **THEN** the overdue item is first, and it names the worst problem and how
  late it is

#### Scenario: A fresh account is told how the ladder starts
- **WHEN** no problem has ever been graded
- **THEN** guidance says the schedule begins at the first grade and describes
  the 1/3/7-day ladder

### Requirement: Insights are read-only and gated like the rest of the coach
The insights endpoint SHALL compute from stored state without writing
anything, and SHALL sit behind the same allowlist gate and uniform 404 as
every other coach route.

#### Scenario: Reading insights changes nothing
- **WHEN** the insights endpoint is called twice
- **THEN** no review, day-log or config row is created or modified
