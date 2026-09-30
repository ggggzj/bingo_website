# The public job feed stopped eleven days ago

Found 2026-09-29 while grounding `.harness/backlogs/028` (jobs on the home page). Measured, not
inferred, against production `GET /api/jobs` — the website's own public proxy:

| Query | Total |
|---|---|
| `limit=1` | 7,286 |
| `posted_within_days=7` | **0** |
| `posted_within_days=10` | **0** |
| `posted_within_days=14` | 272 |
| `posted_within_days=30` | 1,727 |

Newest `posted_at` in the whole feed: **2026-09-18**. Today: 2026-09-29.

For comparison, the months before it are not thin — 2026-08 has 1,963 rows and 2026-09 has
1,625. So this is not a quiet season; something stopped.

## Why it matters beyond one number

- `ROADMAP.md` 第一步 calls 秋招季 (now → mid-October) the thing to move fast on, and the intern
  postings it is about land August–November. Eleven days of that window are missing.
- `../h1_checker`'s GitHub intern list (`021` there) is meant to launch on "最近 30 天" rows and
  run for seven days before the link is shared. It cannot, on a feed whose last ten days are empty.
- Ticket `028`'s every option is a page headed "latest". None of them can ship on this.

## Where it goes

**Not here.** The ingest runs in `../h1_checker` (Greenhouse / Lever / Ashby readers), and this
repo only proxies. It is also a bug, not planned work, so per that repo's rules it enters through
its bugfix door — reproduce, failing test, `fix-<slug>` change — not its backlog.

What a session over there needs to know to start: the website reaches
`https://h1bchecker-production.up.railway.app/api/postings` with `x-postings-token`, and the same
staleness is visible from that side without the proxy. The first question is whether the scrapers
are running at all or running and writing nothing.

**That repo found this first, on 2026-09-22**, and its note is the one to open:
`../h1_checker/.harness/session-todos/2026-09-22-the-feed-has-not-ingested-a-posting-since-09-18.md`.
It already names the three candidate causes, the one owner-only `/stats` call that decides between
them, and what the answer means in each case. A 2026-09-29 re-measurement from this side is
appended to it — same numbers seven days on, plus the per-day-per-board table showing every board
stopped on the same day. **That file is the single home; do not start a third one.** What stays
here is only the half that is this repo's: the blind spot below.

## It has happened before, and the fix for it exists

`../h1_checker/DECISIONS.md` **D-043 (2026-09-09), "The job boards refresh on a clock the database
owns"**: before it, `Procfile` declared only `web` and nothing called `scripts/sync_job_boards.py`,
so production served **one snapshot from 2026-08-20 for twenty days**. D-043 added `sync_runs`,
`jobfeed/schedule.py`, and a background task in the web process that wakes hourly and syncs when a
day has passed. `SYNC_ENABLED=0` turns it off.

So the schedule exists. Something stopped it — a deploy, the flag, or the thread dying — and
D-043's own "Expected risk" listed the alternative it chose against as *"one bad deploy stopping
the feed permanently"*.

D-043 also added **`feed_last_sync` and `feed_hours_stale` to `/stats`**, which is where whoever
picks this up should look first.

## Why nobody noticed for eleven days — and this half is ours

Grepped 2026-09-29: **nothing in this repo reads `feed_last_sync` or `feed_hours_stale`.** The
owner's growth dashboard shows registrations and installs and says nothing about the feed, so a
stopped crawl is invisible from the only page the owner opens daily. Twenty days once, eleven days
now, same blind spot.

A ticket for this repo is worth writing when the owner says so: one line on the owner's dashboard
saying when the feed last moved, red when it is over a day. It is the cheapest possible guard and
it is the difference between finding this in an hour and finding it in eleven days.

## Cause found 2026-09-29 — and it is not a scheduler problem at all

`ProviderRouter.fetch() got an unexpected keyword argument 'already_held'`, on **all 75 active
boards**, every day since 2026-09-18. Read from production `ats_boards.last_error` and `sync_runs`.

The scheduler has never missed a day: runs 9 through 19 fire on time, finish in **half a second**,
report 0 new / 0 closed and no run-level error. Run 8 (2026-09-18) took 53 seconds and moved 320
rows — that was the last real crawl. Every board raises a `TypeError` before its first HTTP
request, the per-board handler writes it on the row, and the run closes claiming success.

The defect is `jobfeed/adapters.py:243` in `../h1_checker`: `ProviderRouter.fetch(self, board)`
omits the `already_held` keyword that the port declares (`ports.py:35`), that `sync_boards` always
passes (`core.py:32`), and that both leaf adapters accept. It shipped with
`2026-09-18-poll-workday-too` — which also explains why Workday has never produced a posting.

**The fix belongs to `../h1_checker`, through its own `bugfix-init` flow.** The full write-up,
including the failing test to write first and why the two existing `ProviderRouter` tests miss it,
is the single home for this:
`../h1_checker/.harness/session-todos/2026-09-22-the-feed-has-not-ingested-a-posting-since-09-18.md`.

**What stays ours:** the dashboard has no line saying when the feed last moved. This bug reported
success to `sync_runs` for eleven days, so nothing upstream would ever have alerted either — a
freshness line on the owner's own dashboard is the only place this becomes visible in an hour
rather than a fortnight.

## Status 2026-09-29, later the same day: the fix is written, not shipped

Re-measured from this side — `GET /api/jobs` on production, unchanged: 7,286 total, **0 rows
inside 10 days**, 272 inside 14. So nothing has reached production.

But the fix exists. Read (not edited) from `../h1_checker`, **uncommitted in its working tree**:

- `jobfeed/adapters.py` — `ProviderRouter.fetch` now takes `already_held` and forwards it to both
  leaf adapters, with a docstring naming why the signature is copied from the port rather than
  from the caller written first.
- `tests/test_job_boards.py` + `tests/test_job_sync.py` — 79 lines, three tests: the call the core
  actually makes; that the keyword is *forwarded* and not merely accepted (accepting and dropping
  it would pass the first test and cost the Workday saving); and the core polling a board through
  the **real** router. That third one is the gap that let this ship — every existing test handed
  `sync_boards` a `FakeJobBoard` that implemented the port correctly, so the router's own
  signature was never exercised end to end.

**What is left is not writing code.** Run that repo's suite, commit through its bugfix door, and
deploy. D-043's scheduler wakes hourly, so the feed should move within an hour of the deploy.

## What this repo does with that

`.harness/backlogs/028` (jobs on the home page) is held here, by the owner's decision on
2026-09-29 to fix the feed first. Its proposal, design, tasks and two spec deltas are drafted at
`openspec/changes/2026-09-29-the-front-door-shows-the-jobs/` and **still awaiting approval** — no
code was written against it.

Re-measure before building it. The change's block is "latest US SDE internships", grounded at 31
rows / 11 employers / **13 posted within 30 days** — and that 13 was shrinking daily while nothing
new arrived. Once the feed moves, those numbers change, and the tasks' baseline should be taken
again rather than inherited.
