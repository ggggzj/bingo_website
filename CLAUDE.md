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

**Then check whether another session is already here, before writing anything.** Run
`git worktree list`; compare HEAD against the snapshot this session started with; look
for untracked files you did not create. If another session is live, open a worktree —
`git worktree add ../bingo_website-wt-<topic> -b <branch>`, a visible sibling of this
directory — and work there. Never ask the other session to stop.

Two things about that command are not style. The `-wt-` prefix: the workspace router's
map lists `<repo>-<suffix>` siblings as copies never to edit, and a worktree is the
opposite of a copy, so `git worktree list` — not that table — says which is which. And
the sibling location, because this repo has already run the other experiment: the
jobs-page work (2026-09-11) sat in a `.worktrees/` folder inside the repo, hidden by a
line in `.git/info/exclude` — a local-only ignore that no clone, no review and no reading
of `.gitignore` would ever surface. Next door in h1_checker the same shape (2026-08-24)
ended with the owner testing month-old code while a session worked where nobody looked.

This repo already branches per change, so a worktree buys directory isolation and nothing
more. Two things stay shared no matter how many you open:

- **One `DATABASE_URL`, one Postgres.** Two worktrees running `db run push` alter the same
  schema; two dev servers write the same rows. File isolation makes this feel solved when
  it is not. Schema pushes and dev servers: main tree only, one session at a time.
- **Three port numbers that must move together, of which only two complain.** A second
  landing dev server fails loudly on 5173 (`strictPort`), a second API server fails loudly
  on 8080 — so you raise both, and it runs. The third value, `API_PROXY_TARGET`, defaults
  to `http://127.0.0.1:8080` and is checked by nobody, so the second session's front end
  quietly talks to the first session's API. The cookie lands on the wrong origin and the
  symptom is a login that does nothing — hours in `lib/auth/`, none of it the bug. Set all
  three from one offset, or do not run a dev server in a worktree at all.

Opening one costs less than it looks: the workspace packages export `src`, not `dist`, so
`pnpm install` alone is enough to run the tests — no build. What a worktree does not
inherit is `.claude/launch.json` (gitignored), so `preview_start` by name will not work
until it is copied across with its port changed. Tests are safe to run in parallel: vitest
pins `DATABASE_URL` to a dummy, and the drizzle contract test only touches the scratch
database named by `COACH_TEST_DATABASE_URL`.

One rule holds even when you are certain you are alone: **commit explicit paths, never
`git add -A`, never `commit -a`.** That is exactly what swept another session's work into
`a0568f3` in h1_checker (2026-08-17), and this tree habitually carries untracked backlog
tickets that an `add -A` would take along with it.

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
