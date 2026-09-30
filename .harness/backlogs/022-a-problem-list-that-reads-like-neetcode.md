---
id: 022
title: A NeetCode-shaped problem list as the front of the practice view
status: open
gate: build freely; do not ship until `2026-09-20-move-onto-the-surviving-database`
  archives and the owner's rows are on the surviving database. See "Blocked on".
origin: User request 2026-09-21, raised from the AceLeetcode session with a NeetCode
  Practice screenshot as the supplied reference form. Stated as "你现在的界面太复杂了，
  没有 neetcode 看起来简洁 … 希望我登录 bingo 的官网自己账号的时候，我可以在 practice 中
  看到像 neetcode 一样的整个页面". Two shape questions were put to the user in the same
  conversation and settled — see "Decisions taken".
---

## What this is

Today `/dashboard/practice` is eight analysis panels and **no way to see the problem
bank**. After this it is a browsable table of all 150 problems, with the analysis moved
behind a second tab.

The page itself is not missing. The shell landed in `2026-09-12-dashboard-shell`
(ticket 008), the rail entry is registered in
`artifacts/landing/src/pages/dashboard/views.tsx`, and the heading already reads
**Practice** (`artifacts/landing/src/pages/Coach.tsx:892`). What is missing is the list.

That matters for how this reads as a product. `Coach.tsx` is a 916-line port of the local
AceLeetcode dashboard's panels — guidance, plan, consistency, forecast, gaps, patterns,
settings, token. The website inherited the local tool's shape, and the local tool was
built for someone who already knows the system. A first-time signed-in user gets seven
analyses of data they do not have yet.

## Why the bank half is smaller than it sounds

Almost everything a NeetCode-style row needs is already built:

- **`coach_problems`** (`lib/db/src/schema/coach.ts:39`) already stores `num`, `title`,
  `slug`, `difficulty`, `neetcodeGroup`, `patterns`, `companyFreq`, `followups`,
  `siblings` — 150 global rows holding no user data.
- **`CoachProblemSummary`** (`lib/api-spec/openapi.yaml:875`) is already specified and
  already generated, with exactly the row fields: `id`, `num`, `title`, `slug`,
  `difficulty`, `patterns`, `neetcodeGroup`. The new endpoint adds a status beside it
  rather than inventing a second row schema.
- **`DrizzleStore`** already has `loadProblems`, `loadReviews` and `loadDayLog`
  (`artifacts/api-server/src/lib/coach/drizzle-store.ts:44`, `:49`, `:196`). The endpoint
  composes methods that exist.

So: **no schema change and no migration.** One endpoint and one page.

## The one thing that is not free: "solved" is not a per-problem fact

`solved` lives **per day**, as a JSONB array on `coach_daily_log.solved`
(`lib/db/src/schema/coach.ts:102`). There is no per-`(user, problem)` solved flag
anywhere in the schema.

So "has this person ever solved LC 217" is a **union across every one of their day rows**,
not a column lookup. That is cheap at this size and stays cheap, but an implementer who
assumes a flag will go looking for one that is not there. Either union it in the query or
put the derivation on the store — and if anyone proposes adding a `solved` column, the
proposal has to say why the day log stopped being enough, because the day log is what
makes the consistency heatmap and the streak possible.

## The three states, precisely

| Dot | Meaning | How it is computed |
|---|---|---|
| `○` not started | never touched | no `coach_reviews` row, and the id is in no day's `solved` array |
| `◐` solved | code passed, never defended | in some day's `solved` array, no `coach_reviews` row with `reps > 0` |
| `●` graded | grilled and graded | `coach_reviews` row with `reps > 0` / `lastGrade` set |

The half dot is the entire reason this is not just a NeetCode clone. Solved ≠ understood is
the premise the system is built on, and a problem in the `◐` state is invisible to the
scheduler — no interval, no due date, never comes back. Today that backlog is reachable
only through the gaps panel. On a 150-row list it is visible at a glance.

A two-state dot (NeetCode's exact model) was offered to the user and rejected — see
"Decisions taken".

## What done looks like

- **`GET /coach/problems`** returns the bank with the caller's per-problem status. Spec
  goes into `lib/api-spec/openapi.yaml` first, then codegen — never the other way round.
  Behind `coachGate` like every other coach route, keeping the 404-not-403 stance.
- Each row carries enough for the table: the `CoachProblemSummary` fields, the status
  above, and for a graded problem its `due` date and `state`.
- **`/dashboard/practice` opens on a Problems tab**: a search box, rows grouped by
  `neetcodeGroup` in bank order, one row per problem — status dot, number, title,
  difficulty. The title links out to `leetcode.com/problems/<slug>`.
- **A sidebar with two things and no more**: a progress ring (total, split
  easy / medium / hard) and a month calendar carrying current and best streak.
- **An Insights tab** holds what the page shows today — guidance, gaps, pattern strength,
  forecast, consistency. Nothing is deleted. Settings and Token keep their current home.
- **A graded row says when it comes back.** Due date on the row is the thing NeetCode
  structurally cannot show, and it is free here — `coach_reviews.due` already exists.
- Behaviors are tested, not eyeballed: `artifacts/landing` has had vitest + RTL since
  ticket 008, and the endpoint gets api-server coverage like its siblings.
- **The zero-data state stays honest.** 150 hollow rows is a useful page, which is the
  strongest argument for this change — but the copy explaining that grades arrive from
  local grilling, not from the browser, survives the redesign.

## What this does not do

- **No grading control in the browser.** `Coach.tsx:53` states the reason and it is
  unchanged: grades come from the grilling session, never from a browser control, because
  self-grading is what this system exists to prevent. Ticket 009 is the browser-grilling
  ticket. This one must not drift into it.
- **No courses, no roadmap graph, no Versus, no quizzes, no cheatsheets.** The reference
  screenshot has all of them. This ticket takes the list, the ring and the streak.

## Blocked on

**The practice page has no data to list yet.** Two separate reasons, both real:

1. `2026-09-20-move-onto-the-surviving-database` is open — 11 of 17 tasks unticked, with
   three uncommitted `.sql` files in the working tree, one of them
   `3-seed-the-problem-bank.sql`. The two `users` tables have crossed ids between the two
   databases; that change is what untangles them. The coach's rows are part of the move.
2. AceLeetcode is still running local. `COACH_API_BASE` and `COACH_TOKEN` are unset on the
   owner's machine, and `../AceLeetcode/.harness/prd/coach-on-web.md` still reads
   *"delivered (2026-09-08) — deployment + env activation pending"*. As of 2026-09-21 the
   owner's real state is one graded problem and three solved ticks, sitting in local JSON.

Building the endpoint and the page against seeded data is fine and can start now. Shipping
it to a page that shows 150 hollow rows — because the owner's actual work never left a file
on their Mac — is the one outcome that would make the redesign look like the problem.

## Decisions taken 2026-09-21

Settled with the user before this ticket, so `/pickup` does not reopen them.

1. **List plus a slim sidebar, analysis behind a tab.** The user was shown three shapes —
   (a) list is the page with ring + streak in a sidebar and everything else on an Insights
   tab, (b) list only, analysis panels deleted from the web, (c) all eight panels kept with
   the list added on top — and chose (a). So: nothing is deleted, and nothing stays on the
   front page just because it is already there.
2. **Three status states, not two.** The user was shown NeetCode's two-state dot beside the
   three-state one and chose three. The `◐` solved-but-never-grilled state stays visible.

## Open at pickup

- **Where today's plan goes.** `PlanPanel` is what tells the owner what to do today, and
  NeetCode has no equivalent, so the reference form does not answer this. Candidates: a
  strip above the table on the Problems tab, or today's problems pinned to the top of the
  list. Decide with the user in the proposal — do not pick one silently.
- **Whether `../AceLeetcode/dashboard.html` gets the same treatment, or retires.** Out of
  scope here (different repo, and it would need its own counterpart ticket), but the answer
  changes whether the local dashboard is still worth maintaining after this lands.

## Notes

1. **Website-only.** AceLeetcode's local engine is untouched, so there is no counterpart
   ticket — same as ticket 008 note 4.
2. `lib/api-spec/openapi.yaml` is on Rule 6's not-trivial list, so this goes through the
   full change flow regardless of how small the diff looks. Generated code under
   `lib/*/src/generated` is never hand-edited.
3. This does not reverse any decision in `openspec/specs/coach-page/`, which specifies what
   the panels say, not that they are the first thing on the page. Confirm that at proposal
   time rather than assuming it — `openspec/config.yaml` requires a reversed decision to be
   named, and a silent contradiction is the failure mode.
