---
id: 025
title: Let Claude keep writing status from the folder — a fourth key, and one endpoint it opens
status: open
origin: Owner, 2026-09-24/25, while settling `024`'s decision 1. Choosing "the browser is where
  status changes" ends a loop the owner uses daily: paste the rejection email to Claude in
  `~/Desktop/job_dashboard`, Claude writes status, stage and the quoted text into `overrides.js`.
  All 18 hand-written rows there were produced that way. The owner asked for this to be written
  down rather than lost — "写下来不等于要做".
depends-on: .harness/backlogs/024 — until the human half lives in the account there is nothing here
  to write into. This ticket is meaningless before it and cheap after it.
related:
  - .harness/backlogs/017 — if this ever stops being owner-only, it stops being this ticket. See "The
    line this must not cross".
grounded: 2026-09-25 — the token precedent below was read out of this repo, not recalled.
---

## The loop this restores

Today, one message: the owner pastes a rejection email into the folder's session and says 更新状态.
Claude reads it, decides the row, and writes `status`, `stage` and the email's own words into
`overrides.js`. The owner clicks nothing. That is where all 18 hand-written rows came from, and the
quoted rejection text in them — `not able to support work authorization sponsorship`,
`doesn't offer visa sponsorship` — exists nowhere else.

After `024`, status lives in the account and only a signed-in browser can write it. A script on the
owner's laptop has no identity, so Claude editing the folder edits a retired file and the account
never hears about it. This ticket gives that script a way in.

## Why not reuse a key this repo already has

The repo runs three secrets and a test that exists only to stop them substituting for one another
(`artifacts/api-server/src/lib/jobs/upstream.test.ts`: *"Three doors, three keys"*). Each is
server-to-server, read-only, and never reaches a browser: `STATS_TOKEN` opens the owner's own
numbers, `POSTINGS_TOKEN` the job postings, `FEED_TOKEN` the feed.

**This one is a fourth door and differs from all three in the way that matters: it writes, and it
lives on a laptop.** The existing keys sit in a deployment's environment. This one sits in a folder
on a personal machine, beside a `.claude` directory and inside whatever backup or sync that machine
runs. Treat it as a password for one account, because that is what it is:

- Its own variable, never a fallback to any of the three. Add the case to that same test.
- It writes **only the human half of the owner's own application rows** — status, stage, note. Not
  other tables, not other accounts, not the machine half (`024` decision 1 already says the import
  owns that).
- Revocable without touching anyone else's sign-in, and rotating it is a documented step rather than
  a code change.
- It lives in a `.env` the folder does not commit. Worth one line in the ticket's proposal about what
  happens if that folder is ever shared, zipped, or pushed — `../CLAUDE.md`'s map already lists
  folders on this desktop that get copied around.

## The line this must not cross

This is a key for **one machine belonging to the owner**, and it stays that way. The moment every
user gets one, it is no longer a convenience — it is a public write API with credential storage,
rotation, abuse and support attached, and that is `017`'s problem to weigh, not this ticket's. If a
proposal for this starts describing "users can generate a token", it has drifted and should stop.

## What done looks like

- A rejection email pasted to Claude in the folder updates that row in the account. The owner refreshes
  `/dashboard/<the view>` and sees the new status, stage and note.
- The write lands through the same rules the browser's write obeys — `024` requires an append-only
  trail, and this must append to it, not bypass it.
- **The trail records which hand wrote the row: the browser, or the script.** Two writers and no way
  to tell them apart is how a wrong status becomes unexplainable six weeks later.
- A request with no key, a stale key, or a key aimed at another account's rows is refused, and there
  is a test per refusal. The refusals are the feature; the happy path is the easy half.
- The key never appears in a page, a log line, or a response body.
- Rotating the key is written down where the owner will find it — `replit.md` documents the other
  three the same way.

## Open, for the proposal

1. **Who actually sends the request** — Claude directly, or a small local script (`update_status.py`)
   that Claude calls the way it already calls `add_job.py`. The second is duller and easier to test.
2. **Same endpoint as the browser, or its own.** Same endpoint means one code path and one set of
   rules; its own means the key's blast radius is visible in the route table.
3. **Whether the folder keeps a local copy** of what it wrote, so the laptop is not left with no record
   of a status it set.
4. **What happens when both hands write the same row on the same day.** At one user this is rare and
   last-write-wins is honest — as long as the trail shows both.
