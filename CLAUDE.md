# Development Workflow (bingo_website-main)

The outer loop for the website repo. The **inner loop** — how each unit of work closes —
is owned by `replit.md` ("User preferences": build test-first, review pass on repo
standards + only-what-was-asked, update replit.md, explain in plain language) and is not
restated here. Read `replit.md` first; stack, layout, architecture decisions and gotchas
are authoritative there. Product direction is **not local**: the roadmap lives in the
extension repo, routed by the workspace router (`../CLAUDE.md`). Proposal/tasks rules
live in `openspec/config.yaml`.

## Rules

### 1. Session start
Scan `.harness/backlogs/`, `.harness/session-todos/`, `.harness/plans/inprogress/` and
`openspec/changes/` (non-archive); report what is pending and ask which to continue. An
empty scan means "nothing to pick up" — never invent work. When the backlog is empty,
new work comes from the product roadmap via the workspace router: ask the user which
item to pull; never pull one yourself.

### 2. New feature work
Do not write code from a feature request. Write it as a ticket in `.harness/backlogs/`
(`status:`, `origin:`, acceptance criteria). `origin:` cites the roadmap line
(`../h1_checker/GROWTH_PLAN.md` …) or the user's request. The user runs `/pickup`; stop
at the proposal and wait for approval — never proceed past that gate alone.

### 3. Bugs enter through a different door
Bugs do NOT go through the backlog — the stores deliberately have no bug queue. A
reported bug goes straight to the bugfix flow: reproduce, failing Vitest test, then a
`fix-<slug>` OpenSpec change. The backlog holds planned work; a bug's ticket is its
failing test.

### 4. Implementation
Only via `/implement <change-id>`. No opsx commands are installed in this repo, so the
engine predicate resolves to the direct path: the tdd discipline per behavior, ticking
the matching `tasks.md` item as each behavior lands. Close each task group with the
replit.md working loop before starting the next — ticking the box without the loop is
not done. Work outside the checklist is forbidden; new discoveries go to
session-proposed-todos.

### 5. Mid-task ideas
Write a backlog ticket — here, or in `../h1_checker` when the idea lands there (routing
per the workspace router) — then return to the current task immediately. Never expand
on the spot.

### 6. The one-line-fix exception, precisely
A trivial fix may skip the change flow and the replit.md update, but never the reply:
what changed, why, and how it was verified. Not trivial regardless of size: anything
touching auth (`artifacts/api-server/src/lib/auth/`), sessions, the `OWNER_EMAIL` /
`COACH_EMAILS` gates, `STATS_TOKEN` (`src/lib/stats/upstream.ts`), `TRUST_PROXY`,
`lib/api-spec/openapi.yaml`, `lib/db/src/schema/`, or more than one file.

### 7. Session end
Capture residue into `.harness/session-todos/`. The next `/pickup` must be able to
resume from disk state alone.

## Non-negotiables

- Two human gates: proposal approval and `/implement` invocation belong to the user.
  Never simulate, skip, or assume them.
- State lives in files (`.harness/`, `openspec/`, `replit.md`), not in conversation
  memory. When unsure about status, read the files.
- pnpm only (`preinstall` enforces it). Generated code under `lib/*/src/generated` is
  never edited by hand — edit `lib/api-spec/openapi.yaml` and run codegen.
- When a rule here conflicts with being fast or agreeable, the rule wins. Blocked means
  ask, not improvise.
