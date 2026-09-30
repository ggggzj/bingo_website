# The dashboard says when the feed last moved

**Origin** — `.harness/backlogs/030-the-dashboard-says-when-the-feed-last-moved.md`, owner
request 2026-09-29 at the end of a session that measured the public job feed and found it frozen
since 2026-09-18.

## Why

The job feed has stopped twice, and both times the owner found out by accident.

| | First | Second |
|---|---|---|
| Frozen at | 2026-08-20 | 2026-09-18 |
| Noticed | 2026-09-09, reading `DECISIONS.md` about something else | 2026-09-22, by a session checking whether an unrelated fix had deployed |
| Days served stale | **20** | **12 and counting** (still stopped 2026-09-30) |

The second one is worse than the first in one specific way: the defect — `ProviderRouter.fetch`
missing the `already_held` keyword, `../h1_checker/jobfeed/adapters.py` — raises inside the
core's per-board `except`, so every run since 09-18 finished in half a second and **reported
success**. `sync_runs` says it is fine. Nothing upstream would ever have alerted.

`DECISIONS.md` D-043 (2026-09-09) fixed the first outage's cause and also shipped the detection:
`feed_last_sync` and `feed_hours_stale` on the upstream `/stats`. The comment above them
(`../h1_checker/main.py:2686`) says what they are for:

> this is the number that says so before a user finds out by clicking one

**Nothing in this repo reads either field.** Grepped 2026-09-30 across `*.ts`, `*.tsx`, `*.yaml`:
zero hits. The number that exists to prevent this is computed, sent, forwarded, and dropped one
layer short of the screen.

## What changes

Verified in the code 2026-09-30, not assumed:

1. Upstream computes both fields and declares them on its `/stats` response
   (`../h1_checker/main.py:2691-2692`, filled at `:2786-2790`). `feed_hours_stale` is whole hours,
   floored; both are `None` together when there has never been a sync.
2. This server already forwards them. `artifacts/api-server/src/routes/stats.ts` ends with
   `res.json(await upstream(...))` — the upstream body, whole and untouched.

So the two numbers reach the owner's browser today. What stops them being drawn is that
`StatsTotals` (`lib/api-spec/openapi.yaml:1103`) declares ten properties and neither of these, so
the generated client type has no such members and `Dashboard.tsx` cannot name what it cannot type.

This change declares them, regenerates the client, and draws one line above the tile row.

## The owner's decisions, answered 2026-09-30 — not re-opened

1. **One threshold: red past 30 hours.** The sync is daily by design (D-043 wakes hourly and syncs
   when a day has passed), so a healthy `feed_hours_stale` sits under ~24; 30 is one full cycle
   plus headroom. Chosen over amber/red because a second colour is a second thing to remember the
   meaning of, and an amber left sitting becomes the new grey — which is precisely the twelve days
   this change exists about. **30 is stated once and cited by both the page and its test**; neither
   derives it from the other.
2. **A line above the tile row, not a sixth tile.** The row is five wide and every number in it
   means "more is better". Freshness is the opposite polarity and the only alarm on the page; a
   sixth tile would look identical to five measurements.
3. **Nothing on a non-owner's screen.** These routes answer a uniform 404 to everyone who is not
   the owner and that does not change. A visitor-facing honesty statement about posting dates
   belongs to `028`'s home block and to `/jobs`, which already carry that requirement; this one is
   the owner's alarm and stops there.

## What this reverses

Nothing. No recorded architecture decision in `replit.md` or `ROADMAP.md` is contradicted: this
adds two optional fields to a response only the owner can obtain, and draws them.

## Non-goals

- **No alerting.** No email, no cron, no webhook, no threshold service. The failure was never that
  the owner could not be paged — it was that the page they open daily did not say. Fix that, then
  see whether anything else is still wanted.
- **Not computing freshness here.** `GET /api/jobs`'s newest `posted_at` looks like an answer and
  is a different quantity: it is the employer's date on the posting, so a sync that runs and stores
  nothing new leaves it frozen while `feed_last_sync` moves. Those two disagreeing is itself the
  second diagnosis branch in `../h1_checker`'s note. This reads the field that means what it says.
- **Not fixing the feed.** The crawl is `../h1_checker`'s bug and nothing here touches it.
  **Shipping this on a stopped feed is correct** and will display the truth — today, in red.
- **No freshness number on data that does not come from that sync.** The Growth view is installs
  and registrations; this one line is about the job feed and must say which, or it reads as "the
  dashboard is stale".
- **Not a new route, secret, upstream call, table or migration.**

## The seams this crosses

- **`lib/api-spec/openapi.yaml`** — two added optional properties on an existing schema, which
  means codegen runs in the same task that edits it. Nothing else regenerates the frontend hooks.
- **The `STATS_TOKEN` upstream** (`artifacts/api-server/src/lib/stats/upstream.ts`) — **crossed,
  not touched.** The fields ride the body that file already fetches and forwards. It is a Rule 6
  non-trivial file and this change does not open it.
- **The owner gate** — untouched. `OWNER_EMAIL` decides who may call `/stats` at all, and a
  non-owner keeps getting the same 404.

## What done looks like

- The owner's Growth view states when the job feed last synced, without a click.
- Past 30 hours it is visibly not-normal. Twelve days of grey is the failure this prevents, and a
  line that looks identical at 2 hours and at 288 would reproduce it.
- **`null` is its own state and says so.** "Never synced" must not render as `0`, which reads as
  "just now" — the same trap `Applications.tsx` already documents for `days_waiting`.
- Three states pinned by tests against a fixture: fresh, stale, never.
- 320px, as the rest of the site.
