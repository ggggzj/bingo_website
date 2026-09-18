---
id: 011
title: Where somebody is in an application, and how a row gets there without typing
status: open
origin: Owner request 2026-09-16 — "记录application". Already named as a coming feature in
  ../h1_checker/.harness/backlogs/017 ("记录用户的 job application 情况"), which shaped the
  database around it on 2026-09-13 but built nothing. Reference form supplied by the owner:
  simplify.jobs' tracker — Saved / Applied / Interviewing / Offer, with notes, contacts and dates.
blocked-by: .harness/backlogs/012 (this repo's half of one account) and its counterpart
  ../h1_checker/.harness/backlogs/015-one-account-on-both-surfaces.md — these rows are
  irreplaceable and must live beside the surviving `users` table, and there are two of those today.
  Also .harness/backlogs/008 — the tracker is a view in that rail.
counterpart: none for v1 (the site is the only writer). v2 — the extension writing APPLIED — is
  ../h1_checker/.harness/backlogs/020-notice-an-application-being-submitted.md (written 2026-09-17).
---

## How a row is born and how it moves — grounded 2026-09-17

The owner supplied Simplify's tracker screen: a kanban — SAVED / APPLIED / INTERVIEWING / OFFER,
with a fifth column behind "Visible Columns (5)" — cards carrying role, company, location and a
heart; Add Application, Import CSV, Export CSV, Archive; search and filters. The question is not
the board. It is **what writes to it**, because a board nobody writes to is a spreadsheet with
columns, and Simplify's own FAQ says what that competes with:

> *"A job tracker … can be something as basic as a spreadsheet."*

### How Simplify's board gets written, measured rather than guessed

- **Its public list feeds it.** Every row of `SimplifyJobs/Summer2027-Internships` carries an
  apply link through their own site before the ATS link — **1,917** of them, all
  `simplify.jobs/p/<id>?utm_source=GHList` (counted 2026-09-17). A signed-in click lands in the
  tracker; a signed-out click is a redirect and a count. This mechanism is available to us the day
  the GitHub list ships.
- **Its extension writes APPLIED.** "Everything you send lands in your tracker automatically" —
  Copilot watches the submit on the ATS page.
- **The rest is typed**: drag between columns, Add Application, Import CSV.

### What each writer costs here

| Writer | State it can set honestly | What it needs | Cost |
|---|---|---|---|
| Heart on a `/jobs` row | SAVED | a signed-in user, one table | small |
| Apply links on `/jobs` and in the README routed through `/go/<job_id>` | an **event** — "opened the application page at T" — never APPLIED | a redirect route; one spec line reversed (`jobs-page`: "Applying leaves for the employer" — it still does, via us); a privacy-policy sentence; signed-out clicks counted with no identity | small — and the only source of the README → site number `ROADMAP.md` 阶段 3 wants |
| The person, one tap | APPLIED / INTERVIEWING / OFFER / REJECTED | a control per card; the events table | small |
| A nudge on return | APPLIED, confirmed by the person | "you opened Coinbase's application on Tuesday — did you apply?" on cards with an open-event that are still SAVED | small; this is how a typed tracker stops depending on memory |
| Add Application / Import CSV | any state, for jobs not from our feed | free-text rows with a nullable posting reference | small (add), medium (import) |
| The extension watching a submit | APPLIED, automatically | h1_checker's half. **Only where it already has host access**: `linkedin.com/jobs/*` declared; Indeed, Dice, Glassdoor optional (`extension/manifest.json`). Greenhouse, Lever, Ashby and Workday pages are **not** in its permissions, and adding a host disables every install on update until each person clicks through (`extension/background.js:77`). Needs 015 (one identity) so the extension's user is the site's user; a consent toggle, off by default; a store-listing and privacy-policy change — recording that somebody applied is a new category of data | large; cross-repo; the highest-value writer and the only one with a permission and consent cost |
| Reading the inbox (Gmail API) | APPLIED / INTERVIEWING / REJECTED from mail | `gmail.readonly` is a **restricted** scope: Google verification plus an annual third-party security assessment | out of reach — rejected, not deferred |

### Recommended shape, for the owner to accept or change

**v1 — the site writes, the person confirms.** Heart → SAVED. Every apply click, from the site or
the README, → an open-event on the card. The person moves the card; the system reminds them of
cards they opened but never moved. Add Application and Export CSV in v1 — a tracker people can
leave is a tracker people trust; Import CSV later. Five columns, REJECTED hidden by default as
Simplify does. Every move is an event row (`017`). Nothing here needs a new permission anywhere.

**v2 — the extension writes APPLIED.** Written up as `../h1_checker/.harness/backlogs/020`: the ATS
origins go in `optional_host_permissions` and are granted from a click (the Indeed/Dice/Glassdoor
pattern, so no install goes dark), one verified detector per site, `POST /api/my/applications` as
the paired identity, consent toggle off by default. Blocked by 015 and 014.

**Never:** inbox reading; any "likely outcome" on a card. "Applied 14 days ago, not moved" is a
fact and "time to follow up" is date arithmetic — both fine. "60% chance" is the thing this
product does not do.

### Decisions this leaves the owner — surface at pickup, do not assume

1. Apply links route through `/go/<job_id>` — yes/no. Yes is recommended; it reverses one line of
   the jobs-page spec and adds one sentence to the privacy policy.
2. APPLIED is set by the person in v1, with the nudge; a click is never read as an application —
   confirm.
3. Five columns with REJECTED hidden by default — confirm, or four.
4. v1 ships Add Application and Export CSV; Import CSV waits — confirm.
5. v2 (the extension writer) is a later go/no-go decided on v1's numbers — confirm.

## Two rules `017` already set, and they are not negotiable

- **Events beside status, append-only.** "Rejected" overwriting "Interviewing" destroys the only
  copy of something a person lived through. A trail table beside the status costs one table and
  makes the history recoverable — `coach_review_events` next to `coach_reviews` is the same shape
  already in this codebase.
- **This is the irreplaceable group.** Nobody can re-derive where somebody was in an interview
  process or what they wrote in a note. It belongs beside `users`, with cascade delete and an
  actual backup policy — which `017` records as not existing today. That is why `015` blocks this
  and not merely precedes it.

## What done looks like

- A signed-in person hearts a posting on `/jobs` and it appears as a SAVED card in a kanban view in
  the `/dashboard` rail, with a count per column. Opening its application page — from the site or
  the README — shows on the card as "opened on <date>", and never moves it by itself.
- A card is moved by the person; cards opened but never moved get one reminder on the next visit.
- A job not from our feed can be added by hand; the whole board exports as CSV.
- Status moves through the funnel, and every move survives the next one.
- Rows are keyed off the session. Two people signed in at once see only their own — the same
  property ticket 008 requires of practice.
- An empty tracker states what will fill it and what it will never contain (see Shape 1's ceiling).
- Deleting the account deletes the rows, by cascade rather than by application code.
- Failing test first for every behaviour above. Losing a row here is not a rendering bug; it is
  losing the only copy.

## Notes for whoever picks this up

1. **Do not build the insights half.** Simplify pairs the tracker with analytics — "see which
   resumes are performing", "visualize your progress". At three applications that chart is noise,
   and at any size it is one step from the scoring this product does not do. Separate ticket, later,
   if ever.
2. **Contacts and notes are a second table's worth of scope.** Simplify's tracker holds recruiters,
   referrals, interview notes and documents. The spine — a posting, a status, a trail — is what this
   ticket is. Everything hanging off it is a later ticket, and saying so here is what keeps the
   first one shippable.
3. **`/jobs` reads no session today** and that was a deliberate decision with a reason attached
   (`replit.md`). A save control on it is the first thing that would change that. Whether the
   control lives on the public page (for signed-in visitors only) or only on the personal feed of
   ticket 010 is a design call worth making explicitly, because the first answer reverses a recorded
   position and `openspec/config.yaml` requires it be named.
