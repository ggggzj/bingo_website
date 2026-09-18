---
id: 016
title: The signed-in half of /jobs — a feed filtered to the person, not to everyone
status: open
origin: Owner request 2026-09-16 — "login之后，对于每一个不同的user有自己的jobfeed".
  Not a new answer: `../h1_checker/.harness/prd/email-capture-funnel.md` frontier question 5
  was ANSWERED 2026-09-10 in the owner's own words — "把 job feed dashboard 恢复,作为账户装的
  东西" — and this request reaffirms it. Reference form supplied by the owner: simplify.jobs,
  whose signed-in app is four views — Matches, Jobs, Tracker, Profile.
blocked-by: .harness/backlogs/018 (this repo's half of one account) and its counterpart
  ../h1_checker/.harness/backlogs/015-one-account-on-both-surfaces.md — the feed is
  keyed to h1_checker's `users`; this site's login writes a row in a different database.
  Also .harness/backlogs/008 — this is a view registered in that rail, not a new top-level route.
counterpart: ../h1_checker/.harness/backlogs/ — none yet; the API half may already be built
  (see below), in which case this ticket has no counterpart and that is worth confirming rather
  than assuming.
---

## The engine exists. It is behind the other identity system.

Measured in `../h1_checker` on 2026-09-16, not assumed:

| | |
|---|---|
| `GET /api/my/jobs` | `main.py:3235` — this user's delivered postings, newest first |
| `GET /api/my/prefs` / `POST /api/my/prefs` | `main.py:3276` / `main.py:3295` |
| `job_prefs` | one user's filter: titles, locations, remote, tier, daily cap (`models.py:25`) |
| `job_deliveries` | the ledger of which posting has been sent to which user |
| the seam | `jobfeed/ports.py`, `jobfeed/adapters.py` — `SqlFeedRepo` over the three tables |

So the personalised feed is **built and running**, keyed to `Depends(feed_user)`. What this repo
has is `/jobs`: public, identity-free, reading no session and writing nothing — deliberately,
because that is what kept the two-account-systems question out of shipping it (`replit.md`,
architecture decisions).

The work is therefore not "build a feed". It is: **let a person signed in here be the person the
feed already knows**, and give that feed a view.

## The feed is a delivery ledger, not a search — and that decides day one

`/api/my/jobs` joins `job_deliveries` and filters to `shown`. It returns what was *sent*, under a
daily cap, and it is read-only on purpose so a refresh cannot spend tomorrow's jobs. Simplify's
Matches tab looks instantaneous because it is a query over 1.8M rows; ours is a ledger that a
delivery job fills.

A person who signs up at 11pm therefore sees **nothing** until that job runs for them. That is
not a bug to fix in passing — it is the shape of the thing, and the proposal has to say which of
these it ships: the ledger as-is (and the empty state explains the cadence), or a first-visit
backfill. Discovering it after launch means discovering it as "the feed is broken".

## What done looks like

- A signed-in visitor gets a view in the `/dashboard` rail (ticket 008) listing postings filtered
  to their own prefs, and can change those prefs.
- `/jobs` stays public and identity-free for signed-out visitors. The public page is not replaced
  and does not learn to read a session — a signed-in person gets a *second* surface, not a
  different one.
- A person with no prefs and no deliveries sees what will fill the page and when, not an empty
  box. Same requirement `openspec/specs/coach-page/spec.md:107` already makes of the coach.
- No path takes a user id from a query parameter; identity comes from the session, as everywhere
  else here.
- Tested, not eyeballed. `artifacts/landing` still has no test runner — ticket 008 adds one, which
  is a second reason this lands after it.

## What must not be copied from simplify.jobs

Their centrepiece is a prediction: "Good Match — 85", "3× higher interview rate", a resume score
with missing keywords. **We do not ship that.** The owner removed the 中签率计算器 from
`GROWTH_PLAN.md` 第 1 步 outright for this reason, and the standing position is observed facts
only: this employer filed N H1Bs at these wage levels; this posting's own description refuses
sponsorship. Filtering on facts is the product. Scoring somebody's odds is the thing that was
already killed once.

The `tier` the feed already returns is the honest version of it — it is computed from filing
counts and last active year, and it says what an employer *did*, not what will happen to you.

## Notes for whoever picks this up

1. **Landing decision, and it is not closed.** The PRD closed it for the *public* page — the owner
   said "解除禁令,网站 /jobs" and `jobs_page.html` stays a 43-line placeholder. It did **not**
   close it for the signed-in feed: the API, the prefs and the ledger are all in h1_checker, so a
   FastAPI page there is the cheaper build and this site is the one the owner wants people to land
   on. The workspace router requires this be an owner decision recorded in the proposal
   (`../CLAUDE.md`). Surface it at pickup.
2. **Coverage is the gate, and it has a number.** `../h1_checker/.harness/backlogs/011` — 24% of
   the live feed is jobs outside the US, and ticket 012 is already blocked on it. A personal feed
   handing somebody 24% irrelevant rows is worse than a public page doing the same, because it
   claims to be about them.
3. **Where prefs come from.** The funnel's profile form (ticket 004 and its counterpart) already
   asks for roles, location, graduation and visa status. Asking again in a prefs form is asking
   twice; inheriting means the two shapes have to agree on what a "title" is.

## Note added 2026-09-18 — note 3 above is answered by ticket 012

Renumbered from 010 on 2026-09-18, when a merge brought in a second session's tickets and three
numbers had two meanings each. Nothing about the ticket changed except its number.

Note 3 ("where prefs come from") now has an owner: `.harness/backlogs/012` is the onboarding
questionnaire the owner drew across thirteen screens, and its answers land in `job_prefs` —
the same row this feed reads. Build order is 012 then this; asking twice is the failure mode
both tickets name.
