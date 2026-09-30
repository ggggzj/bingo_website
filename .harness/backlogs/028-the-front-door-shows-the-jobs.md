---
id: 028
title: The front door shows the jobs — sponsor postings on the home page, the way h1bvisajobs.com does it
status: picked-up
produced: openspec/changes/2026-09-29-the-front-door-shows-the-jobs/ — proposal, design, tasks and
  two spec deltas drafted 2026-09-29, **awaiting owner approval**. Classified a bounded change:
  one added contract path plus codegen, one new public route on the existing AuthStore and
  POSTINGS_TOKEN seams, no schema, no migration, no new secret. Four decisions were put to the
  owner and answered the same day (preview not fully public; US SDE internships; 020 withdrawn;
  a signed-in visitor stays on `/`) — see "The owner's decisions" below and in the proposal.
  **The change cannot ship on today's feed**: newest posting 2026-09-18, nothing inside ten days,
  which is `../h1_checker`'s bug and is recorded in
  `.harness/session-todos/2026-09-29-the-public-job-feed-stopped-eleven-days-ago.md`.
origin: Owner request 2026-09-29 — "我现在想把我这个 website 的界面建成 home 里就可以显示 sponsor 的 job",
  with https://h1bvisajobs.com/ named as the reference. That site was read live the same day; what
  it actually puts on its home page is listed below rather than paraphrased.
related: .harness/backlogs/020 — **this ticket replaced it.** 020's proposal made `/` a two-column
  page whose entire right half was the Google button, with no postings on it; both could not ship, and
  on 2026-09-29 the owner withdrew 020. Its change now sits at
  `openspec/changes/archive/2026-09-20-the-front-door-signs-you-in/` with a WITHDRAWN note, and **its
  six owner answers from 2026-09-20 still bind this ticket** — read them, do not re-ask them. `.harness/backlogs/021` — the `/jobs` login wall,
  which the reference site's own pitch ("Free to browse. No account required") contradicts.
  `.harness/backlogs/014` — `/go/<job_id>`, the redirect every apply link on this page would use.
  `.harness/backlogs/002` — the employer section, which is the other half of the reference site's model
  (it runs a job board and a sponsor database as two surfaces). `.harness/backlogs/003` / `005` — the
  filter fixes a bigger jobs surface makes more visible.
grounded: 2026-09-29 — every number below was measured, not assumed: the whole public feed was pulled
  (7,286 rows, `GET /api/jobs`, production) and run through this repo's own `readLocation` and
  `isEarlyCareerSoftware`. The reference site's home page was read the same day.
---

## What the reference site actually puts on its home page

Read live 2026-09-29, in order down the page. Worth having in front of you, because the thing
the owner pointed at is eleven blocks, not one:

| # | Block | What it carries |
|---|---|---|
| 1 | Header | A live count — "13,175 live H1B jobs" |
| 2 | Hero | "Trusted by 25,000+", then "Stop Guessing, Secure Your Role at 68,000+ Verified H1B Visa Sponsors", then one honesty line: *every "sponsors H1B" tag here is matched to a real DOL LCA filing, not a self-reported claim* |
| 3 | Search box | One field, plus four role chips (Software Engineer, Data Scientist, Machine Learning, Product Manager) |
| 4 | **Latest H1B Sponsor Job Openings** | "Showing 6 of 13,175 … updated daily". Each row: logo initial, title, company, an `H1B Sponsor` badge, job type, a `Live` badge, salary band when known, locations. Then "Load more jobs" and "Browse all jobs" |
| 5 | Paid upsell | Sponsor Intel, $39/mo — approval rates, salary benchmarks, transfer difficulty |
| 6 | Browse by category | Other 6,240 · Engineering 5,073 · Data Science 761 · PM 382 · Finance 339 · Design 192 · Legal 188, each expanded with ten rows |
| 7 | Paid upsell | Job Alerts Pro, $25/mo |
| 8 | Browse by city / top states | California 2,787 · New York 2,136 · Nebraska 1,046 · Washington 535 · Texas 436 · Virginia 426 |
| 9 | Top sponsor employers | Twelve logos: Amazon, Google, Microsoft, Meta, Deloitte, TCS, Infosys, Cognizant, Wipro, Accenture, IBM, Apple |
| 10 | Stats band | 68,000+ sponsors · 1.7M+ LCA records · 13,175 live jobs · *Source: 2026 US DOL H1B LCA disclosure data* |
| 11 | Closing CTA + SEO footer | "Free to browse. No account required to see verified sponsor jobs." Then several hundred footer links |

Two things about that page that matter more than its layout.

**It is a no-account board.** Its closing line and its business model both say so: browsing is
free and unauthenticated, and the money is in alerts, sponsor intel and a data export. That is
the opposite end of the decision this repo took on 2026-09-17 (`/jobs` behind a login wall, `/`
being the sign-in). Copying the surface without noticing that is how the login wall gets
reversed by accident instead of on purpose.

**Its own lumpiness is visible on the page.** Block 6 claims 5,073 Engineering jobs and then
shows ten rows of which seven are Amgen; the Data Science block is Amgen and Comcast. Their
13,175 live jobs come from the same kind of ATS scrape ours does, and they have the same
disease. This is reassuring about our 7,286 and a warning about what a category count promises.

**And it carries four things this product has explicitly refused.** Lottery Odds Calculator,
Denial Risk Calculator, RFE Risk Checker, Wage Level Calculator. The owner deleted the 中签率
calculator on 2026-09-10 and `ROADMAP.md` §明确不做 rules out prediction. Copy the board; do not
copy the calculators.

## What our data can carry, measured today

The whole public feed, pulled from production `GET /api/jobs` on 2026-09-29:

| | |
|---|---|
| Postings | **7,286** |
| Distinct employers | **43** |
| `tier` | `strong` on **all 7,286** rows — there is no weak row to distinguish |
| `no_sponsor` | `false` on 7,285, `null` on 1. **The red "this posting refuses sponsorship" badge is never shown by this feed** |
| Rows with a usable apply URL / location string / date | 7,286 / 7,286 / 7,286 |
| Top five employers | OpenAI 751 · Stripe 603 · Databricks 588 · Anthropic 567 · Datadog 351 — **39% of the feed** |
| `readLocation` over the feed | us **4,560** · unknown **531** · elsewhere **2,195 (30%)** |
| Newest `posted_at` | **2026-09-18** |
| `posted_within_days=7` / `=10` / `=14` | **0** / **0** / 272 |

So the good news first: because the upstream only lists employers it holds certified filings
for, **every row on this feed really is a sponsor's posting** — which is exactly the claim
`002` says a job board cannot normally make, and the reason the reference site needs a separate
`/company` database to say it. The premise of the owner's request is sound.

Three measured problems stand between that and a home page.

**1. The feed stopped eleven days ago.** Newest row 2026-09-18; today 2026-09-29; nothing at
all inside ten days. A home page block headed "Latest" — the reference site's block 4, the one
the owner is pointing at — would today be topped by an eleven-day-old row, and a "updated
daily" line beside it would be false. This is the one item on this list that is **not** this
repo's to fix: the ingest runs in `../h1_checker`. It is also the one that cannot be designed
around. See "What has to happen upstream first".

**2. The newest rows are one company.** Sorted by date, the first twenty rows are 1 OpenAI,
3 Twilio, **16 Stripe**. A six-row "latest" block today shows Stripe five times. The reference
site solves this by not solving it; the honest options are to cap rows per employer or to
choose a section that is narrow enough not to be dominated.

**3. Three in ten rows are not in the United States.** Sydney, London, Dublin, Singapore,
Paris, Mexico City, Toronto, Bangalore. A page headed "H-1B sponsor jobs" that shows a job in
Sydney is not a layout problem, it is a wrong page. `ROADMAP.md` 第一步 1 already says 美国以外
的岗位不进列表 and assigns it to `../h1_checker`'s `011` — but this repo does not have to wait,
because it already owns a classifier (below).

## What already exists to build on

| Asset | State |
|---|---|
| `artifacts/landing/src/pages/Jobs.tsx` | 288 lines. The split-pane list and detail, the filters, the badge rendering. A home block is a narrowed, shortened instance of what this already draws |
| `GET /api/jobs` | Proxied, allowlisted, bounded, identity-free. Parameters: `employer`, `title`, `location`, `remote_only`, `posted_within_days`, `include_refusals`, `limit`, `offset` |
| `artifacts/api-server/src/lib/new-grad/location.ts` | **`readLocation()`** → `us` / `unknown` / `elsewhere`, tested. This is problem 3 already solved, sitting behind an owner-only 404 |
| `artifacts/api-server/src/lib/new-grad/titles.ts` | `isEarlyCareerSoftware()` and `namesTargetClass()`, tested. Note it **excludes** `\bintern\b` by design — the owner's own list is new-grad, not intern, so an intern section needs its own net |
| `GET /new-grad-list` | Already built (16/16 tasks, `2026-09-18-the-new-grad-list-behind-the-login`, unarchived): several upstream queries merged and narrowed on this server. The pattern a home block would reuse, including the reason it exists — the upstream takes one title substring and cannot express "software AND early-career MINUS seniority" |
| `Home.tsx` | 453 lines whose badge copy, `DATA_FACTS` (72,135 employers · 12,586 aliases · 5 quarters) and `LIMITS` are already the honest versions of the reference site's blocks 2 and 10 |

Running this repo's own two modules over the live feed, so the size of each candidate block is
a number and not a hope:

| Candidate home block | Rows | Employers | Posted in the last 30 days |
|---|---|---|---|
| Latest, everything, as the feed comes | 7,286 | 43 | 1,727 — but 0 in the last 10 days |
| US-or-unknown only (`readLocation` ≠ `elsewhere`) | 5,091 | — | — |
| US **and** early-career software (`isEarlyCareerSoftware`) | **9** | **3** | **1** |
| US **and** software **intern** (own net, excludes `International`) | **31** | **11** | **13** — and 11 of the 31 name Summer 2027 in the title |

That third row is the finding. The narrowing this repo already trusts for the owner's own
morning list returns **nine rows from three employers** across the entire public feed. A home
page built on it would be a page with nine things on it. The intern net — the one the season
is actually about — returns 31 from 11 employers, which is small but real, current, and on
exactly the item `ROADMAP.md` calls the product's first priority.

## What the reference site shows that we have no column for

Verified against `lib/api-spec/openapi.yaml`'s `JobPosting` and the measured feed. Do not put
a control or a count on the page with nothing behind it — the same trap `002` §4 records:

- **Salary bands** ("$197K – $247K"). Not in the schema. Not in the feed.
- **Job type** (full-time / contract) and the `Live` badge. Neither exists.
- **A category taxonomy** (Engineering / Data Science / Finance / Design / Legal) and its
  counts. There is no function field; `title` substring matching is all we have, and the
  measurements above show what that is worth — `title=data scientist` returns 105 rows.
- **Per-state and per-city counts.** `location` is a free-text string: "Hybrid",
  "Distributed", "US-ATL, US-CHI, US-Remote", "San Francisco, Seattle, New York, Chicago,
  Atlanta, Remote in the US". 531 rows cannot be read at all. A "California 2,787" tile needs
  a parsed location column that does not exist.
- **Approval / denial rates, transfer difficulty.** Not held, and rate-shaped numbers are the
  prediction line anyway.
- **"68,000+ sponsors with open roles today."** We hold 72,135 employers *and* 43 with
  postings. Putting the big number next to the job list implies the small one is the big one.
  `Home.tsx` already states 72,135 correctly as a database count; keep it there.

## What done looks like

Deliberately written against the measured numbers rather than the reference site's blocks.

- A signed-out visitor at `/` sees real sponsor postings above the fold, each row carrying the
  employer's certified filing count and years — the fact — not a ✔️ or the word "verified".
- **No row in that block is outside the United States**, proven by a test that puts a Sydney
  row into the fixture and asserts it is absent.
- **No employer occupies more than a stated share of the block**, proven by a test built on a
  fixture shaped like today's feed (16 Stripe rows in the newest 20).
- The block states its own vintage — the date of the newest row it is showing — and does not
  use the words "live", "daily" or "updated" unless the feed's newest row is inside the window
  the wording claims. A test pins this: a stale fixture renders the stale wording.
- Every apply link leaves through `/go/<job_id>` once `014` ships, and direct until then.
- Whatever the block does not show has one honest way through to the rest — `/jobs`, or the
  sign-in, per decision 1.
- 320px, as the rest of the site.
- Tests first, per `replit.md`. The narrowing is tested at the server, the way `/new-grad-list`
  is; the block is tested at the page, the way `Home.test.tsx` and `Jobs.tsx` are.

## The owner's decisions, taken 2026-09-29

Put with their costs, answered the same day. Recorded here rather than re-opened.

1. **先放一部分，其余登录后看.** A signed-out visitor at `/` sees some of the block; the rest is
   behind Google. This is the shape `ROADMAP.md` already chose for the GitHub list (公开最近 30 天,
   其余登录后看), so **the login wall of `021` is not reversed — it is given a preview**, and the
   09-17 decision that `/jobs` requires a session survives. What the proposal must still settle is
   the honest mechanics of a preview: how many rows, and a "N more, sign in with Google" line that
   states a true N.
2. **先做美国的 SDE 实习.** The block is US software internships, not the whole feed. Measured today
   that is **31 rows from 11 employers** (Duolingo, Figma, Robinhood, Lyft, Coinbase, Palantir…), 13
   of them posted in the last 30 days, 11 naming Summer 2027 in the title. Small, current, and the
   same item `ROADMAP.md` calls the product's first priority. It also disposes of two of the three
   measured problems for free: `readLocation` keeps Sydney out, and an intern net cannot be dominated
   by Stripe's sales postings.
3. **撤掉 020.** Done 2026-09-29: `openspec/changes/2026-09-20-the-front-door-signs-you-in` moved to
   `openspec/changes/archive/` with a WITHDRAWN note at its head, and `.harness/backlogs/020` marked
   withdrawn and pointed here. Its six answers from 2026-09-20 are inherited, not re-asked.

**Left open, and small enough for the proposal to put to the owner inline** — the wording of the
block (decision 4 below) and whether `/` gets its own search box (decision 5).

## Decisions for whoever picks this up — the owner's, not the implementer's

1. ~~**Does a signed-out visitor see the jobs?**~~ **Answered 2026-09-29: a preview.** The
   reasoning below is kept because the proposal has to name the reversal either way. `ROADMAP.md` 第一步 4 and 5 (both 2026-09-17) say `/` is the sign-in and `/jobs`
   sends a signed-out visitor to `/`. The reference site says "Free to browse. No account
   required". Three answers, each with a different cost:
   - **Public.** Reverses the login wall (`021`) and the recorded 09-17 decision, and the
     funnel argument in `ROADMAP.md` §参考数字 (every wall drops people) supports it.
   - **A preview.** N rows public, the rest behind Google — the same shape `ROADMAP.md` already
     chose for the GitHub list (公开最近 30 天, 其余登录后看). Cheapest reconciliation: both
     decisions survive, and it gives the 第三步 click-through number something to measure.
   - **Signed-in only.** Keeps 09-17 intact; the home page stays the sign-in and the jobs appear
     after it. This is proposal `2026-09-20-the-front-door-signs-you-in` as already drafted,
     plus a jobs block on the other side of the door.
2. ~~**What happens to proposal `2026-09-20-the-front-door-signs-you-in`**~~ — **answered
   2026-09-29: withdrawn, and done.** Kept for the reason it mattered: which is drafted and
   waiting for approval and answers six of the owner's own questions from 2026-09-20. Amend it
   to carry this, ship it first and add the jobs block after, or withdraw it. A session must not
   pick for the owner; the change directory exists and its answers are still good.
3. ~~**Which block, given the counts above.**~~ **Answered 2026-09-29: US SDE internships.** "Latest, everything" is 7,286 rows of which the
   newest are five Stripes; "US early-career software" is nine rows; "US software intern" is 31
   rows from 11 employers and matches the season and the roadmap's stated first priority. A
   fourth option is by employer — 43 companies, each with its filing count, the jobs behind it.
4. **What the block is called.** `002` §1 already settled the wording rule and it applies with
   more force here, because this page is the front door: every company here **has certified
   H-1B filings** is what 43 employers and 72,135 rows support; "verified sponsors" and
   "sponsors H1B" are the reference site's words and they are stronger than the data.
   `GROWTH_PLAN.md` §七's UPL line points the same way.
5. **The search box** (reference block 3). `/jobs` already has filters; a second search on `/`
   is either a duplicate or the only one. Decide once, here, before two exist.

## What has to happen upstream first

**The feed has to start moving again.** Nothing in the last ten days, newest row 2026-09-18.
Every version of this page is a page about freshness, and the reference site's equivalent block
says "updated daily" truthfully. The ingest is `../h1_checker`'s, and a stopped ingest is a bug,
not a backlog item — it goes through that repo's bugfix door, not this one. **Do not ship a
front door built on a feed nobody has checked is running.**

Two smaller upstream items, both already ticketed there: 美国以外的岗位不进列表
(`../h1_checker` `011`) — though `readLocation` means this repo need not wait — and the 43-vs-72,135
gap, which is `002` ↔ `../h1_checker` `007`.
