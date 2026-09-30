---
id: 032
title: The freshness line says the sync ran, not that it worked — and a broken run is exactly a run that ran
status: open
origin: Owner, 2026-09-30, within an hour of `030` shipping. They opened the new line to check
  whether the router fix had taken, read **"Job feed last synced 18 hours ago"** in grey, and the
  honest answer was *that does not tell you*. The gap was found by using the thing, not by
  reviewing it.
counterpart: `../h1_checker` — the count has to reach `/stats` before this repo can draw it.
  One ticket per repo, each shipping through its own flow; **this one cannot start first**.
related: `.harness/backlogs/030` (built 2026-09-30) — this is the second half of the same
  question. `.harness/session-todos/2026-09-29-the-public-job-feed-stopped-eleven-days-ago.md`
  — the outage this is all about, and `../h1_checker`'s note, which is its single home.
grounded: 2026-09-30 — read in both repos' code and confirmed against the live dashboard.
---

## The measurement that made the ticket

2026-09-30, one hour after `030` shipped:

| | |
|---|---|
| The line read | **"Job feed last synced 18 hours ago"**, grey |
| So the last sync was | 2026-09-29 ~21:30 |
| The router fix deployed at | 2026-09-30 11:36 |
| Public postings, total | **7,286** — unchanged since 09-18 |
| Postings within 7 days | **0** |

The line was correct, and it was reassuring, and the feed was dead. Grey after a run that fetched
nothing is the same grey as after a run that fetched three hundred postings.

## Why the line cannot tell them apart today

`../h1_checker/jobfeed/schedule.py`'s `last_sync_at` is what `/stats` reports:

```python
def last_sync_at(db):
    """When the boards were last refreshed successfully."""
    row = (db.query(SyncRun)
             .filter(SyncRun.finished_at.isnot(None), SyncRun.error.is_(None))
             .order_by(SyncRun.finished_at.desc()).first())
```

The docstring says *successfully*. The filter says *no run-level error*. Those came apart on
2026-09-18 and stayed apart for twelve days: `ProviderRouter.fetch` raised on all 75 boards, the
per-board `except` in `core.py` recorded each failure on its own row, and the run finished clean.
**Eleven runs matched this filter while fetching nothing.** So the single number `030` put on the
page was, for its whole first day, being computed from exactly the runs the outage produced.

That is not a bug in `030`. It is `030` answering the question it was scoped to answer — when did
a sync last run — and the owner needing the next one.

## What the count costs: almost nothing, upstream already has it

`../h1_checker/models.py:948-949` — `SyncRun.postings_new` and `postings_closed`, both
`nullable=False`, both written on every run by `schedule.py:111-112` from the report. They are
recorded and nobody reads them outside that repo.

So the work is: **upstream adds the last run's `postings_new` to its `/stats` response**
(counterpart ticket), this repo declares it on `StatsTotals` and puts it on the line it already
draws. No new route, no new call, no schema either side.

The line becomes something like:

    Job feed last synced 18 hours ago · 0 new

and today that reads wrong at a glance, which is the entire point.

## Decisions for the owner, not for whoever implements

1. **Does `0 new` alarm on its own?** A real quiet day produces `0 new` legitimately — Sunday, a
   holiday, a board that genuinely posted nothing. So `0` cannot simply be red, or the alarm goes
   back to being wallpaper, which is `030`'s whole argument. Candidates: show the count plainly
   and let the owner judge; or alarm only on a run of consecutive zero days (two? three?); or
   alarm on **failed boards** instead, which is the number that was unambiguous all twelve days —
   75 of 75, every day.
2. **Failed boards, or new postings, or both?** `ats_boards.last_error` held the real story the
   whole time. One number that says "75 of 75 boards failed" is less ambiguous than any count of
   postings, but it is a second field to plumb and a second thing on the line.
3. **Where the second number goes** — appended to the same line, or under it. `030` chose one line
   over a tile deliberately; two numbers may want two lines, or may just want the title attribute
   that already carries the exact timestamp.

## Do not

- **Do not start here.** This repo can only draw what `/stats` sends. Until the counterpart ships,
  every version of this ticket is blocked, and a proposal written against a field that does not
  exist yet is a proposal that will be rewritten.
- **Do not fix `last_sync_at` by widening its filter** as part of this. Whether "successfully"
  should mean "and no board failed" is a real question and it belongs to `../h1_checker`, whose
  outage note already holds the analysis. Changing it from this side is not possible and
  suggesting it from here would put the argument in the wrong repo.
- **Do not add a second alarm colour** without deciding 1 first. Two thresholds that both go amber
  is how a dashboard stops being read.
- **Do not compute "new postings" from the public feed** by diffing totals between page loads.
  Same trap `030` already names: `posted_at` is the employer's date and the total is a live count
  of open rows, so closures move it too. Read the number the sync itself recorded.
