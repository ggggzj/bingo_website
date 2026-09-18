# Proposal — the-new-grad-list-behind-the-login

## Why

The owner is applying to US 2027 new-grad SDE roles this season. What they use today is a
spreadsheet an agent built for them on 2026-09-11: 467 postings, 376 of them in the US,
across 107 companies — and its refresh mechanism is a sentence in its own method sheet,
*想刷新跟我说一声重跑即可*. In a market where every req is rolling and closes when it fills,
a file somebody re-runs by hand is the wrong shape.

Three measurements decide what this change is, all taken 2026-09-18:

1. **The public page's new-grad control reaches 14% of what they need.**
   `openspec/specs/jobs-page/spec.md` sends `title=new grad` as one substring, and says so
   honestly — *"a new-grad role titled 'Software Engineer'"* is the stated cost. Against the
   owner's own 376 US rows it matches **55**. The 321 it misses are titled
   `Entry Level Java Developer Associate`, `Associate Software Engineer`,
   `EFA Network Software Engineer 1`, `Software Development Engineer`.

2. **There is now something to list.** `../h1_checker`'s ticket 022 shipped and merged today:
   72 boards where there were 43, 29 of them hand-collected Workday tenants. Re-measured, the
   rows we can reach go from **14 across 3 employers** to **76 across 18** — Palo Alto Networks
   21, Palantir 10, Cadence 8, Vanguard 6, Fidelity 5, Salesforce 4, Notion 3, NVIDIA 2. The
   reason this ticket was worth deferring last week has expired.

3. **Two facts a file cannot hold.** `job_postings` never deletes a row and carries
   `first_seen_at`; a board dropping a posting sets `is_open = False`. So *what appeared since
   I last looked* and *what closed since I last looked* are already recorded upstream and are
   the only reasons to build a page rather than re-run a script.

## What Changes

- **A view in the `/dashboard` rail, owner-only.** One entry in `VIEWS`
  (`artifacts/landing/src/pages/dashboard/views.tsx`) with
  `entitled: (viewer) => viewer.isOwner`, exactly as Growth is registered, plus a server-side
  refusal of its route that does not depend on the rail.
- **A new-grad filter the server computes**, because the upstream cannot express it. It is a
  disjunction of early-career title terms intersected with a software-role test and minus a
  seniority exclusion list — not a substring. It runs in `api-server` over several upstream
  queries, merged and de-duplicated by `job_id`.
- **A class-year rule**, because the owner's requirement is *2027*, not *early career*.
  Measured against their 376 US rows: **8 titles name 2027**, one names 2026, and **367 — 97%
  — name no year at all**. Filtering on `2027` would hand them an eight-row page and throw
  away `Entry Level Java Developer Associate` and every other req opened for their class
  without saying so. So the year is a **fence and a sort, never the filter**: a title naming a
  year that is not 2027 is excluded, a title naming 2027 sorts to the top, and a title naming
  no year is listed. This is the rule the owner's own spreadsheet arrived at — its P0 band is
  *"标题明确写 2027 start/new grad…这种坑位填满就关"*, a ranking, while its list is everything
  early-career.
- **A last-seen marker**, so "new since your last visit" is a recorded fact rather than a
  guess that a refresh or a second device can contradict.
- **`lib/api-spec/openapi.yaml` gains the route**, and codegen runs in the same task that
  edits it.

## What does not change

- **`/jobs` stays public, identity-free, and keeps its single-substring seniority control.**
  This change adds a second surface; it does not teach the public one to read a session, and
  it does not edit `openspec/specs/jobs-page/spec.md`.
- **`../h1_checker` is not modified.** No counterpart ticket is opened for this change; every
  query it makes is one `/api/postings` already answers.
- **No badge, no score, no match percentage, no predicted deadline.** Rows are ordered by
  observable facts and the ordering shows its reason, the way the owner's own spreadsheet put
  its reason in column 2 after establishing that none of these postings publish a deadline.

### The recorded decision this does not reverse

`openspec/specs/jobs-page/spec.md` — *"Seniority and category narrow by title and label
nothing … SHALL NOT assign a seniority or a category to any posting"*, written because
inferring one from a title is how a reference product came to tag "Sr. Solutions Architect"
as entry level.

This change **filters** on a wider set of title terms; it does not **label**. No row carries a
seniority badge, no posting is recorded as being of any seniority, and the page states that it
is a title search. The requirement stands and is not amended.

## Non-goals

- **The per-row note and the USC alumni column.** The ticket's acceptance criteria include
  them and they are deliberately left out: they need a table of their own, and the alumni data
  cannot be generated at all (D-012 rules out LinkedIn; the owner's own sheet records that it
  was gathered by hand, read-only). A page that can be read is worth more than one that also
  takes dictation, and this keeps the change to one concern.
- **Widening coverage.** 164 of the owner's 376 rows sit on company-owned sites — 77 of them
  TikTok and ByteDance — which `ROADMAP.md` 第一步 defers as a compliance question. Reaching
  more boards is `../h1_checker/.harness/backlogs/026`, already picked up elsewhere. This
  change must **state its gap on the page**, not close it.
- **Anyone but the owner.** No allowlist, no second reader, no settings. The user-facing
  version of this is ticket `016`, which is blocked on one account existing across both
  surfaces; this is not that ticket arriving early.
- **A US-only guarantee.** See below.

## The honest limit, stated before it is discovered

`../h1_checker/.harness/backlogs/011` — *stop serving jobs in countries where nobody needs an
H-1B* — is still open, and `BrowseQuery` carries no country. All the upstream offers is a text
search over the location string a provider wrote: `Irving Texas United States`, `US-Remote`,
`2 Locations`.

So this page cannot promise a US-only list. It will do what the owner's own spreadsheet did
when it met the same wall — **three states, not two**: list a row whose location reads as US,
mark a row whose location cannot be read, and drop one that is plainly elsewhere. The marking
is the point: a silent guess here is the failure that looks like success.

## Capabilities

### New Capabilities

- `new-grad-list` — the signed-in owner's list of US early-career software postings, what
  arrived since they last looked, and what closed.

### Modified Capabilities

None. `dashboard-shell` already specifies the rail as an extension point registered through
`VIEWS`; adding an entry is the behaviour it describes, not a change to it.
