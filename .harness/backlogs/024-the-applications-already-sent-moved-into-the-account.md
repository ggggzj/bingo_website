---
id: 024
title: The 94 applications already sent, moved into the account — imported from the folder, changed in the browser
status: built — delivered 2026-09-27 through the change below. The three tables are in the
  surviving database, the owner's 94 applications are in their account, the view is in the rail
  and the browser writes the half the account owns. Deployed 2026-09-27 (merge `11b075a`): the API and the page are
  live on bingocareer.com, verified by the route's own refusal shape and by the four UI strings
  in the served bundle.
change: openspec/changes/2026-09-25-the-applications-i-already-sent/
  Takes all six of this ticket's open questions; the answers are in that proposal's
  "The decisions this settles" table, reversible until `/implement` is invoked.
origin: Owner request 2026-09-24 — "把这个 dashboard 接进我 bingocareer 的账号中", pointing at
  `~/Desktop/job_dashboard`: a local folder the owner and Claude have been running as a job-search
  control panel since 2026-09-23. It is not a sketch — it holds 94 applications, 18 hand-written
  status rows and 80 archived JD bodies, and it is what the owner actually opens every day.
related:
  - .harness/backlogs/017 — the multi-user tracker. This ticket now writes too, so the boundary
    between them is narrower than it looks. See "Why this is still not 017", and treat 017's two
    non-negotiable rules as binding here.
  - .harness/backlogs/019 — the same split one surface up: 016 is the feed for everyone, 019 is the
    owner's own list. 016↔019 :: 017↔024.
  - .harness/backlogs/008 — the rail this lands in; adding a view is one entry in `VIEWS`.
  - .harness/backlogs/023 — the door to that rail. Without it this view is reachable only by typing a URL.
grounded: 2026-09-24 — every number below was measured off the owner's folder and this repo's code,
  not assumed.
---

## What the owner already has, measured

| | |
|---|---|
| Applications | **94** (Simplify CSV exports + `add_job.py`, deduped by normalised apply link) |
| Status, after the hand-written overrides are merged in | applied **71** · closed **15** · saved **8** · interviewing 0 |
| Hand-written rows (`data/overrides.js`) | **18** — all 18 carry notes, 15 carry a stage |
| Archived JD bodies (`jobs/<company>-<id>/jd.md`) | **80 of 94**, 87 files, **632 KB** of text (median 5 KB, largest 13 KB) |
| Raw capture files beside them (`jd-raw.html` / `jd-raw.json`) | 5.6 MB — **not part of this** |
| ATS spread | Workday 24 · Greenhouse 23 · Ashby 20 · company sites 18 · unknown 7 · Oracle 2 |
| Rows outside the US | 6 (UK 3, Canada 2, Remote 1) |
| Interview-prep notes written so far | 1 |

The board itself (`dashboard.html`, one offline HTML file) draws: a status pie, upcoming OA/interview
dates, application pace, waiting duration, location spread, and a sortable table of all 94 whose last
column opens the locally archived JD.

**The 18 override rows are the irreplaceable half.** They are not metadata — they are things that
happened, recorded nowhere else: `拒信原文：this particular position doesn't offer visa sponsorship`,
`不提供 sponsorship`, `岗位已下架`, `2026-09-23 拒信…identified other candidates`. Simplify does not
have them; the employer will not resend them. An import that carries 94 rows and drops these 18 has
moved the cheap half.

## What the owner decided, 2026-09-24

**1. The browser is where these change — and the folder keeps feeding it.** The owner first chose
read-only, then reversed it the same day. The line falls exactly where their own folder already draws
it, which is why this answer holds together:

| | Who owns it after this ticket | Where it is edited |
|---|---|---|
| The applications themselves — company, role, location, ATS, apply link, applied date (`applications.js`) | the local scripts | Simplify CSV + `add_job.py`, imported |
| The archived JD body (`jobs/*/jd.md`) | the local scripts | `archive_jds.py`, imported |
| **Status, stage, notes** (`overrides.js` today) | **the account** | **in the browser** |

So a re-import refreshes the machine half and **never touches the human half**. That is not a new
invention — it is the reason `applications.js` and `overrides.js` are two files today, carried across
intact. `overrides.js` retires at cutover: its 18 rows are imported once, as the seed of the human
half, and after that the file is history rather than input.

**What the owner loses, stated here rather than discovered later:** today a rejection email gets
pasted to Claude in the folder and Claude edits `overrides.js`. After this, status lives in the
account, so that loop ends at the browser — the owner clicks. Giving Claude the ability to write
there again is an authenticated write path from a local script, which is a **later ticket**, not a
line item in this one. If that loop turns out to matter more than the browser editing does, this
decision is the thing to revisit first.

**2. Its own owner-only ticket.** Not 017's v1. This repo has run this split once already and it
worked: `016` is the feed for every user, `019` is the owner's own list, and they did not block each
other.

**3. The JD bodies travel** — 632 KB of `jd.md`, not the 5.6 MB of raw captures. The owner delegated
this one ("你推荐哪个") and accepted the recommendation; the reason is recorded so it can be reversed
by a sentence rather than re-argued:

> A posting's page 404s when the req closes, and this has already cost the owner twice —
> Trustpilot went dark **1 day** after applying and Showpad **5 days** after, both recorded in
> `overrides.js`, both JD bodies gone for good. The archive exists because that happened. Moving
> the index without the text would put "JD 归档" on a row in the account and have it open nothing,
> which is the failure mode this repo already refuses on public pages.

## Why this is still not 017

The read-only version of this ticket was obviously not 017. The writable version is closer, and the
honest statement of the difference is narrower:

`017` is the tracker for **users** — a kanban whose cards are born on our own surfaces (a heart on
`/jobs`, an apply-click routed through `/go/<job_id>`, the extension eventually writing APPLIED), with
a nudge for cards opened but never moved. Its design question is *what writes to it*.

This ticket has one reader, and the writer question is already answered: the rows come from a folder,
the human half comes from the owner's hands. 73 of the 94 are on boards our pipeline does not read, so
importing them teaches us nothing about 017's writers. And 017 records two positions this ticket needs
reversed on day one — **Import CSV waits for v2**, and **do not build the insights half** — which is a
bad trade to make for a single user. That is the same trade `019` declined.

**But because this one writes, 017's two non-negotiable rules bind it:**

1. **Events beside status, append-only.** "Rejected" overwriting "Interviewing" destroys the only copy
   of something the owner lived through. Build the trail table now, at 94 rows, when it is cheap.
2. **This is the irreplaceable group.** It belongs beside `users`, cascade on delete, and it is worth
   a failing test per behaviour rather than a rendering check.

**Exit condition, so this does not become a permanent fork:** when 017 ships, this view is absorbed or
deleted. Design the human-half table so 017 can **adopt** it — same status vocabulary, same event
trail — rather than discover a second, private store of the same fact. Whoever builds 017 should read
this ticket first: 94 real rows and 18 real rejection notes are the best test data that tracker will
ever get.

## Why this is not 019 either

`019` answers *what is on the market that I could apply to*. This answers *what I already sent and
where it stands*. They are two owner-only views in the same rail, and that is correct — the rail was
built for exactly this (`008`). If they ever merge, it is because the owner asked, not because two
entries in an array looked like duplication.

## What the page must say about itself

`019` says it plainly: a spreadsheet somebody re-runs by hand, put behind a login, is *a downgrade with
a login in front of it*. Decision 1 removes half of that problem — the human half is live, typed
straight into the account — and leaves the other half standing: **the applications and the JD bodies
are still a copy of a folder, and they are exactly as old as the last import.**

So the header states when the import last ran. A row the owner applied to this morning is not in the
account until the folder pushes it, and the page says so rather than letting an empty week read as a
quiet week.

No score, no "apply today", no predicted outcome. "Applied 14 days ago, no reply" is a fact and is
welcome; anything shaped like a probability is the thing this product killed once already.

## What done looks like

- One more entry in `VIEWS` (`artifacts/landing/src/pages/dashboard/views.tsx`),
  `entitled: (viewer) => viewer.isOwner`, with **its own server-side refusal** the way Growth has one —
  the rail predicate is convenience, never the boundary.
- The view lists all 94 applications with company, role, location, ATS, status, stage, applied date,
  days waiting, the apply link, and the archived JD where one exists.
- **Status, stage and note are edited in the browser and survive a reload**, keyed to the owner's
  account, refused for anyone else on the server and not merely hidden in the rail.
- **Every status change appends a row to a trail table and overwrites nothing.** A test moves a row
  applied → interviewing → closed and asserts all three are still readable afterwards.
- **Re-running the import never touches the human half.** The test that matters: import, edit a status
  and a note in the browser, import again, assert the edit is still there and the machine fields did
  refresh. This single test is what decision 1 buys, and it is the one to write first.
- All 18 override rows survive the cutover import with their notes and stages intact, attached to the
  right application. Asserted on the real 18, not on fixtures.
- 80 JD bodies are readable in the account. A row with no archive says so; a row with one opens it.
- The header states when the import last ran (see above).
- Failing test first for each behaviour. `artifacts/landing` has had a runner since `008`; use it.

## Notes for whoever picks this up

- **The data files are JavaScript, not JSON.** `window.JOB_DATA = {…}`, `window.JOB_OVERRIDES = {…}`,
  `window.JOB_ARCHIVE = {…}`, comments and trailing commas included. Parse accordingly; do not assume
  `JSON.parse` on the file.
- **The join key is a normalised apply URL**, or `"公司名|职位名"` where there is no link.
  `import_simplify.py` already normalises away `?embed=true`, `/application`, `/confirmation`, and
  Workday/Ashby rows use a synthetic `workday:…` / `ashby:…` key. Reuse that normalisation rather than
  inventing a second one — all 18 override keys match an application today, and a different
  normalisation is exactly how that silently stops being true. **Under decision 1 this key is now load
  bearing**: it is what reconnects a re-imported row to the status the owner typed in the browser.
  A key that drifts does not produce a merge conflict, it produces a row whose history quietly detaches.
- `dupCount` records how many CSV rows collapsed into one; `id` is not contiguous (it reaches 103
  across 94 rows). Neither is a primary key.
- New table(s) go in `lib/db/src/schema/`, and every endpoint goes through `lib/api-spec/openapi.yaml`
  plus codegen — generated code under `lib/*/src/generated` is never hand-edited. Writing from the
  browser means this ticket touches both, plus auth; `CLAUDE.md` Rule 6 names all of them as "not
  trivial regardless of size".
- The import runs against the surviving Postgres; there is a memory note on reaching it
  non-interactively, and `018`'s change directory holds working SQL to copy the shape from.
- The owner signs in as **christineguo610@gmail.com** (id 3) — the USC address expires at the end of
  2026. Whatever this attaches rows to, attach them there.
- **`023` first, or at least beside it.** After a Google sign-in the owner lands on `/jobs`, which has
  no link to `/dashboard`. A view nobody can reach without typing its URL is not done.

## Open, for the proposal — surface these, do not assume

1. **Do the charts come across?** `017` says do not build the insights half, and it is right about a
   product surface. But the owner reads this pie daily at 94 rows, where it is a count rather than an
   insight. Recommend: status counts and days-waiting come across; pace, location spread and
   conversion rate do not, until asked for.
2. **Rail id and label** (`/dashboard/<id>`), and where it sits relative to New grad.
3. **How the import gets run and by whom** — a local script the owner runs after `add_job.py`, or
   something scheduled. Decision 1 settles *what* it may write, not *when* it runs.
4. **Do `interview-prep.md` and cover letters travel too?** Only one prep file exists today, so this
   costs nothing now and doubles the schema if answered "yes" later.
5. **The 6 non-US rows** (UK 3, Canada 2, Remote 1). h1_checker's `011` keeps non-US postings out of
   the *feed*; these are applications the owner actually sent. Recommend: they stay.
6. **What the folder's board becomes after cutover.** Two boards showing the same 94 rows, one of them
   now wrong about status, is a trap the owner walks into on a Tuesday. Recommend: `dashboard.html`
   stops rendering status, or says at the top that status lives in the account.
