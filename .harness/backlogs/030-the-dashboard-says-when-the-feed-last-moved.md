---
id: 030
title: The dashboard says when the feed last moved — the owner's own page reports a stopped crawl
status: picked-up — proposal, tasks and one spec delta drafted 2026-09-30,
  **awaiting the owner's approval**. Classified a bounded change: two optional nullable properties
  on an existing schema plus codegen, one element on a page that already runs that query, no new
  route, secret, table or migration, and `lib/stats/upstream.ts` (the `STATS_TOKEN` file) is not
  opened. All three owner decisions were answered before drafting (one threshold red past 30 hours;
  a line above the tile row; nothing on a non-owner's screen), so nothing is left to ask.
produced: openspec/changes/2026-09-30-the-dashboard-says-when-the-feed-last-moved/
origin: Owner request 2026-09-29, at the end of a session that measured the public job feed and
  found it stopped since 2026-09-18. The request is for the half that belongs to **this** repo:
  the ingest is `../h1_checker`'s and its bug goes through that repo's bugfix door, but *nobody
  noticing for eleven days* is a gap in the page the owner opens daily, and that page is here.
related: `.harness/session-todos/2026-09-29-the-public-job-feed-stopped-eleven-days-ago.md` — the
  measurement, and the pointer to `../h1_checker`'s own 2026-09-22 note, which is the single home
  for the upstream bug. `.harness/backlogs/028-the-front-door-shows-the-jobs.md` — cannot ship on a
  stopped feed; every version of it is a page headed "latest". `.harness/backlogs/021` (`../h1_checker`) —
  the GitHub intern list is meant to launch on 最近 30 天 rows and cannot.
grounded: 2026-09-29 — every claim below was checked in the code on both sides, not inferred.
  Numbering note: two tickets both landed on `028` on 2026-09-29 and the collision was fixed the
  same day — `-the-front-door-shows-the-jobs` kept `028` (it is cited by number in `ROADMAP.md`
  and by `020`), `-read-muses-export…` became `029`, and this one became `030`. The next ticket
  is `031`: read the directory, do not increment the highest number you remember.
---

## It has now happened twice, and both times the owner found out by accident

| | First | Second |
|---|---|---|
| Feed frozen at | 2026-08-20 | 2026-09-18 |
| Noticed | 2026-09-09 | 2026-09-22 (by a session, not the owner), still unfixed 2026-09-29 |
| Days served stale | **20** | **11 and counting** |
| How it surfaced | `DECISIONS.md` D-043, while looking at something else | a session checking whether an unrelated fix had deployed |

D-043 (`../h1_checker/DECISIONS.md`, 2026-09-09) fixed the *cause* of the first one — it added
`sync_runs`, `jobfeed/schedule.py`, and a background task that wakes hourly. Its own recorded
"Expected risk" was **"one bad deploy stopping the feed permanently"**, which is approximately
what happened next.

D-043 also added the *detection*: `feed_last_sync` and `feed_hours_stale` on the upstream
`/stats`. The comment above them in `../h1_checker/main.py:2686` says exactly what they are for:

> this is the number that says so before a user finds out by clicking one

**Nothing in this repo reads either field.** Grepped 2026-09-29 across `*.ts`, `*.tsx`, `*.yaml`:
zero hits. So the number that exists to prevent this is computed, sent, received — and dropped on
the floor one layer short of the screen.

## The measured surprise: this is nearly free

Both halves already work. Checked in the code, not assumed:

1. **Upstream computes and returns them.** `../h1_checker/main.py:2691-2692` declares
   `feed_last_sync: Optional[datetime]` and `feed_hours_stale: Optional[int]` on the `/stats`
   response model; `:2766` and `:2786-2790` fill them.
2. **This server already forwards them.** `artifacts/api-server/src/routes/stats.ts` ends its
   handler with `res.json(await upstream(upstreamPath(route, req.query)))` — the upstream body,
   whole and untouched. `GET /api/stats/totals` maps to upstream `/stats`, which is the exact
   endpoint carrying these two fields.

So **the two numbers are arriving in the owner's browser today.** What is missing is that
`StatsTotals` in `lib/api-spec/openapi.yaml:1103` does not declare them, so the generated client
type has no such properties and `Dashboard.tsx` cannot render what it cannot name.

That makes this: two optional properties on one schema, `pnpm --filter @workspace/api-spec run
codegen`, and one element on a page that already draws five tiles from that same query.

**No new secret. No new route. No new upstream call. No schema, no migration.** In particular
`artifacts/api-server/src/lib/stats/upstream.ts` — the only file that holds `STATS_TOKEN`, and a
Rule 6 non-trivial file — **is not touched at all**.

It is still not a one-line fix under Rule 6, because `lib/api-spec/openapi.yaml` is on that
rule's list by name. It goes through `/pickup` → proposal → `/implement` like anything else.

## What done looks like

- **The owner's Growth view states when the job feed last synced**, on the page they already open
  daily, without a click. `artifacts/landing/src/pages/Dashboard.tsx` already renders a row of
  tiles from `useGetStatsTotals()`; this is that query's existing response, drawn.
- **Stale reads as stale.** Past an agreed threshold (decision 1) it is visibly not-normal — not a
  grey number a reader's eye slides over. Eleven days of grey is the failure this ticket exists to
  prevent, and a tile that looks identical at 2 hours and at 264 would reproduce it.
- **`null` is its own state and says so.** `feed_hours_stale` is `Optional[int]` upstream and is
  `None` when there has never been a sync. "Never synced" must not render as `0`, which reads as
  "just now" — the same trap `Applications.tsx` already documents for `days_waiting`.
- **A test pins each of the three states** — fresh, stale, never — against a fixture, the way
  `Dashboard.test.tsx` already drives this page through `/api/stats/totals`. Tests first, per
  `replit.md`.
- **The 404 gate is untouched.** These routes answer a uniform 404 to everyone who is not the
  owner and that does not change; this adds a field to a response only the owner can obtain.
- 320px, as the rest of the site.

## Decisions for the owner, not for whoever implements

1. ~~**What counts as stale.**~~ **Answered 2026-09-30: one threshold, red past 30 hours.** The
   sync is daily by design (D-043: wakes hourly, syncs when a day has passed), so a normal
   `feed_hours_stale` sits under ~24. Thirty is one full cycle plus headroom. The owner chose one
   level over amber/red for the reason this ticket exists: a second colour is a second thing to
   remember the meaning of, and an amber that sits there long enough becomes the new grey — which
   is exactly the eleven days. **30 is the number the page and its test both cite**; neither
   derives it from the other.
2. ~~**A tile, or a line.**~~ **Answered 2026-09-30: a line above the tile row.** The row is five
   wide and carries counts, all of which mean "more is better". Freshness is the opposite polarity
   and the only alarm on the page; a sixth tile would look identical to five measurements. Harder
   to miss was the whole point.
3. **Whether it says anything on a non-owner's screen.** Recommended **no**, and recorded so it is
   not reopened: `/jobs` and `028`'s home block have their own honesty requirement — `028`'s "what
   done looks like" already says the block must state the date of the newest row it shows and must
   not say "live" or "daily" when that is false. That is a *visitor-facing* statement about the
   rows on screen, and it belongs to those tickets. This one is the owner's alarm and stops there.

## Do not

- **Do not build alerting.** No email, no cron, no webhook, no threshold service. The failure was
  never "the owner could not be paged" — it was that the page they already look at every day did
  not say. Fix that first and see whether anything else is still wanted.
- **Do not query the feed to compute freshness here.** `GET /api/jobs`'s newest `posted_at` looks
  like an answer and is a different quantity: `posted_at` is the employer's date on the posting,
  and a sync that runs and stores nothing new would leave it frozen while `feed_last_sync` moves.
  Those two disagreeing is itself the second diagnosis branch in `../h1_checker`'s note. Read the
  field that means what it says.
- **Do not put a freshness number on a page whose data does not come from that sync.** The Growth
  view is installs and registrations; this one number is about the feed. Say which, or it reads as
  "the dashboard is stale".
- **Do not treat this ticket as fixing the feed.** It fixes the blindness. The crawl is
  `../h1_checker`'s bug and is untouched by anything here; shipping this on a stopped feed is
  correct and will simply display the truth.
