---
id: 013
title: Take the mailing list off the home page, and decide what happens to the emails in it
status: picked-up
change: openspec/changes/2026-09-15-drop-waitlist/
origin: Owner statement 2026-09-15 — "我觉得这个功能可以关掉了", said of the "Hear about
  what comes next" section at the foot of the home page, after it was verified working
  end to end that same day (live API answers, local submit lands a row).
blocks: nothing
note: This file was written 2026-09-15 and vanished from disk during the `/pickup` run
  the same evening, before it had ever been committed. Restored verbatim from the copy
  read at the start of that run, with `status:` and `change:` added. Committed
  immediately this time — an untracked ticket has no way back.
---

## What it is today

The last section of the home page: a heading, two lines of copy, an email box with a
"Keep me posted" button, and under it a "Or add it to Chrome now — it is free" link.
Submitting posts to `POST /api/waitlist`, which writes one row to this site's own
`waitlist` table (email, created_at, unique on email). Nothing reads that table back:
not the growth dashboard, not the account, not the extension. It is a list that only
grows.

It works. Verified 2026-09-15: the live endpoint at bingocareer.com validates input,
and a local submit returned 201 and switched the form to "You're on the list". It has
no server-side test of its own.

## What the owner said next, same day

"我觉得这个功能就没人用过，除了我自己" — the list holds, as far as the owner knows, only
their own test entries. Not verified: nothing in this repo can read the live table, and
the growth dashboard does not count it. It is settled by one query against the
production database, run by the owner:

```sql
select count(*), min(created_at), max(created_at) from waitlist;
```

**Run 2026-09-15, result: 0 rows.** Not even the owner's own test entries — the only
row that has ever existed is the one this session inserted into a local scratch
database. There is no data to keep, no export to do, and size 3 below is the honest
size.

(How to reach that table, since it took four tries: Railway project `h1b_checker`
holds both products. `Postgres` is the extension's database — the one with
`employers`, `job_postings`, `registrations`. `Postgres-EBWW` is this site's — `users`,
`sessions`, the `coach_*` tables, `waitlist`. `railway link` → service `bingo_website`,
then `railway connect Postgres-EBWW`.)

## What the owner has to decide at pickup

Three different sizes of "off". The proposal must name one. Suggested: the third,
now that the table is known to be empty.

1. **Hide the section, keep everything behind it.** One edit in `Home.tsx`. The route,
   the API contract and the table stay; the form component and its test stay but render
   nowhere. Cheapest, and leaves a dead feature in the codebase that the next reader has
   to work out is dead.
2. **Remove the feature, keep the data** (suggested). The section, `WaitlistForm.tsx`,
   the route, the `/waitlist` path and its two schemas in `lib/api-spec/openapi.yaml`
   (codegen in the same task), and the `replit.md` lines that describe it. The `waitlist`
   table and its schema file stay, untouched, so the emails already collected are not
   lost by a code change. Dropping a table is a separate, deliberate act — see 3.
3. **Drop the table too.** Size 2 plus deleting `lib/db/src/schema/waitlist.ts` and
   the `db run push` that drops the table in production — main tree only, one session,
   and `lib/db/src/schema/` is on the not-trivial list. If the query above shows
   strangers' emails, this needs an export first and should be split off; if it shows
   only the owner, it belongs in this ticket.

Whichever size: **the "add it to Chrome" link stays.** It is the home page's closing
call to action and ticket 004 is about handing people the extension; with the form gone
the section becomes that one line, and the proposal should say how it is laid out
rather than leave a heading over an empty box.

## Two things the removal touches that are not about the mailing list

- `WaitlistForm.test.tsx` was chosen (dashboard-shell tasks.md, 2.2) as the proof that
  the web test runner works: a component under the query client, a generated mutation
  hook running for real, a user event. Deleting the form deletes that proof. The
  proposal must name which existing test now carries it, or add one that does. The
  login form is the obvious candidate — same shape, still shipping.
- `openapi.yaml` is the API contract and is on the not-trivial list. Removing a path is
  a contract change and goes through the change flow, however small the diff.

## Acceptance criteria

- The home page renders no email box, no "Keep me posted", and no copy about a mailing
  list; the Chrome link is still there and still opens the store listing.
- `POST /api/waitlist` answers 404 like any unknown route (size 2), or still answers as
  today (size 1) — the proposal says which, and a test proves it.
- Nothing in `lib/*/src/generated` mentions the waitlist after codegen (size 2).
- The proposal records the row count from the live table before anything is removed.
  Size 2: the rows are still there after deploy. Size 3: the table is gone and no code
  or generated file mentions it.
- The web test suite still has a test that runs a generated mutation hook for real.
- `replit.md` no longer describes the feature; its "Where things live" line for the
  schema lists `waitlist.ts` only as long as the table exists.

## Outcome

Picked up 2026-09-15 → classified as a bounded change → proposed as
`openspec/changes/2026-09-15-drop-waitlist/` at size 3 (remove down to the table),
which the 0-row query settles. Awaiting owner approval of that proposal; implementation
is `/implement 2026-09-15-drop-waitlist`.
