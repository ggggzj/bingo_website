# Proposal — the-front-door-shows-the-jobs

## Why

`/` is a 453-line marketing page with no way in and not one job on it. On 2026-09-29 the owner
read `h1bvisajobs.com` and asked for the opposite:

> 我现在想把我这个 website 的界面建成 home 里就可以显示 sponsor 的 job

Origin: `.harness/backlogs/028-the-front-door-shows-the-jobs.md`, written and grounded the same
day. This replaces `2026-09-20-the-front-door-signs-you-in`, which the owner withdrew on
2026-09-29 because its home page was a sign-in with no postings on it; that change now sits in
`openspec/changes/archive/` with a WITHDRAWN note, and **its six owner answers from 2026-09-20
are inherited here rather than re-asked.**

The reason this is worth building rather than copying: the reference site runs a job board and a
sponsor database as two surfaces, and its job rows carry an `H1B Sponsor` badge it has to
justify in prose. This feed cannot have that problem — the upstream only lists employers it holds
certified DOL filings for, so **every row is already a sponsor's posting**, with a number and a
range of years behind it. That is the thing `.harness/backlogs/002` says a job board normally
cannot promise.

## What Changes

- **A new route, `GET /api/internships`**, public and session-aware: US software internships,
  narrowed on this server out of several coarse upstream queries. Without a session it answers a
  preview and the true total; with one it answers the whole list. It writes nothing either way.
- **`/` becomes the front door and carries that block** above the fold, beside the sign-in, with
  the employer's certified filing count on every row.
- **The sign-in becomes one component** (`SignInPanel`), rendered wherever a sign-in appears
  instead of existing as forty duplicated lines that hold the back door, the missing-client-id
  fallback and the password-cleared notice.
- **`/login` stops being a destination and keeps being an address**: it redirects to `/`, except
  with `?password=1`, which renders the password form exactly as today.
- **A signed-in visitor stays on `/`** and the block expands in place. This is the one inherited
  answer the owner changed on 2026-09-29 — see decision 4.
- **The header's four section anchors are deleted.** They scroll a window that, after this, does
  not scroll.

## The owner's decisions

Three taken 2026-09-29 before this was written, one taken while it was being written. Recorded,
not re-opened.

1. **先放一部分，其余登录后看.** Not a fully public board (the reference site's model) and not
   signed-in-only (the 2026-09-17 decision). The same shape `ROADMAP.md` already chose for the
   GitHub list — 公开一部分, 其余登录后看. **The `/jobs` login wall of `.harness/backlogs/021` is
   therefore not reversed**; it is given something to send a signed-out visitor back to.
2. **先做美国的 SDE 实习**, not the whole feed. Measured against the live feed the same day: 31
   rows, 11 employers, 13 of them posted in the last 30 days, 11 naming Summer 2027.
3. **撤掉 `2026-09-20-the-front-door-signs-you-in`.** Done; `.harness/backlogs/020` is marked
   withdrawn and points here.
4. **登录后就留在首页，整块展开.** Asked because it collides with inherited answer 5 from
   2026-09-20 (a signed-in visitor at `/` goes to `/jobs`): redirecting them away means nobody
   ever sees the expanded block. The owner chose to keep them on `/`. The alternative — send them
   to a `/jobs` intern section — would have made this change wait on `021` and would have shown a
   signed-in visitor a **dirtier** list than the preview, because `/jobs`'s filters cannot express
   "United States" or exclude `International`.

Inherited verbatim from 2026-09-20, still the owner's: the right-fixed / left-scrolling layout;
the 320px order (what-this-is, Google control, extension link, then the introduction); `/login`
redirecting except `?password=1`; the four deleted header anchors.

## What this reverses, by name

`openspec/config.yaml` requires a proposal that reverses a recorded architecture decision to name
it and say why.

1. **`ROADMAP.md` 第一步 4 (2026-09-17): 首页改成左边介绍网站和插件，右边整个是 Google 登录.**
   Reversed in its second half by the owner on 2026-09-29. The roadmap already carries the new
   version of the item.
2. **`replit.md`: "Nothing on `/jobs` classifies a posting."** *Not* reversed, and the proposal
   says so deliberately because it looks reversed. That decision draws its line between
   **narrowing** and **asserting**, not between one term and many — its own words: *a missing row
   costs one posting; a wrong badge costs the page its only advantage*. This route narrows: a row
   that is not a US software internship is **absent**, never labelled. The one thing it marks is
   `location_read: unknown`, which marks that the string could not be read rather than claiming
   anything. `/new-grad-list` already established exactly this on 2026-09-18 (*"It filters and
   never labels"*), and `openspec/specs/jobs-page/spec.md` is not amended.
3. **`replit.md`: "`/jobs` is public and identity-free."** Untouched — `/jobs` is not in this
   change. What is new is a *second* route that reads a session when one exists. The reason the
   original decision gave for staying identity-free was to keep the two-account-systems question
   (`.harness/backlogs/018`) out of shipping, and that holds: the session this route reads is the
   session this site issues, not the extension's.

## Non-goals

Named because the reference site has all of them and half of them have no column behind them.

- **Not built, for want of data** (verified against `lib/api-spec/openapi.yaml`'s `JobPosting` and
  the measured feed): salary bands, job type (full-time / contract), a `Live` badge, a category
  taxonomy with counts (Engineering 5,073 …), per-state and per-city tiles — `location` is free
  text and 531 rows read as nothing at all — approval and denial rates, transfer difficulty.
- **Not built, by standing decision**: the reference site's four calculators (lottery odds, denial
  risk, RFE, wage level). `ROADMAP.md` §明确不做, owner 2026-09-10.
- **Not claimed**: "68,000+ verified sponsors with open roles". This product holds 72,135
  employers *and* 43 with postings; `Home.tsx` already states the first correctly as a database
  count and it stays there, away from the job rows.
- **Not in this change**: `/jobs` and its filters (`003`, `005`, `021`), `/go/<job_id>`
  (`014` — rows link direct until it exists), the employer section (`002`), and the new-grad list,
  which stays owner-only.
- **No SEO footer.** The reference site's several hundred footer links are its business model, not
  a home page.

## The seams this crosses

- **`lib/api-spec/openapi.yaml`** — one added path and one added schema, which means codegen runs
  in the same task that edits it. The response **references the existing `JobPosting`** rather
  than declaring a second posting shape, for the reason `replit.md` records: a second shape is
  what forces a third copy of the two-sponsorship-facts judgement.
- **`AuthStore`** — the route takes it, as `stats`, `coach`, `new-grad-list` and `applications`
  do, and its tests run the real gate against memory.
- **No schema, no migration, no new secret.** `POSTINGS_TOKEN` is the one this already uses, via
  the same `lib/jobs/upstream` module.

## The blocker this change cannot fix, and must not hide

**The feed stopped.** Measured 2026-09-29 against production: newest `posted_at` is 2026-09-18,
and `posted_within_days=7` and `=10` both return **0**. The ingest is `../h1_checker`'s, and a
stopped ingest is a bug in that repo, not work in this one — recorded in
`.harness/session-todos/2026-09-29-the-public-job-feed-stopped-eleven-days-ago.md`.

This change is therefore written so that a stale feed produces an **honest** page rather than a
false one: the block states the date of the newest row it is showing and carries no freshness
adjective, and a test proves a stale fixture renders the stale date. **Do not point anything at
this page — the GitHub list's link, a launch — until that feed is moving.**
