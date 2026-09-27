---
id: 025
title: Let Claude keep writing status from the folder — a scoped personal token, not a fourth key
status: built — delivered 2026-09-27. The scope column is in the surviving database, `/tokens`
  issues and revokes, the applications routes accept a scoped bearer and record it as `script`,
  and the folder has `update_status.py`. Deployed 2026-09-27 (merge `11b075a`). The owner has not issued a
  production token yet — that step needs their session and is theirs to take.
change: openspec/changes/2026-09-27-a-scoped-token-for-the-folder/
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
grounded: 2026-09-27 — re-grounded, and the first draft's central premise was wrong. See the
  correction below: this repo already has per-user API tokens with issue and revoke, built for
  exactly this shape of caller.
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

## Correction, 2026-09-27 — this repo already has the mechanism, and it is not an env var

The section this replaces proposed "a fourth key" beside `STATS_TOKEN`, `POSTINGS_TOKEN` and
`FEED_TOKEN`. **That was the wrong shape and grounding it found the right one.**

Those three are deployment secrets for this server talking to another one. What this ticket
needs is a *person's* credential on a *laptop*, and that already exists here:

| | |
|---|---|
| `coach_api_tokens` | per-user, stored hashed, revocable, with `revoked_at` |
| `POST /coach/token` | issues one. **Session-only — a bearer token cannot mint its successor.** Plaintext returned exactly once; issuing revokes the previous ones |
| `DELETE /coach/token` | revokes, idempotent |
| `lib/coach/auth.ts` | `currentCoachUser` resolves a caller from **either** the session cookie **or** a bearer token; `coachGate` answers the uniform 404 when it cannot |

Its own header says who it was built for: *"a personal bearer token (the local grill bridge)"* —
a local tool on the owner's machine, authenticating as them. That is this ticket, one feature over.

So this is not a new secret. It is **one question**: may an existing token write applications?

**No, and that is the whole design problem.** A coach token already issued and sitting on some
machine was granted for practice. If applications quietly fall inside what it opens, a credential
the owner handed out for one thing starts writing the one table that holds the only copy of their
rejection letters. The token needs a **scope**, and the scope has to be decided when the token is
issued rather than inferred at the call.

Three ways, for the proposal to choose between:

1. **A `scope` column on `coach_api_tokens`**, defaulting to `coach` so every existing token keeps
   exactly the access it already has. Smallest change; the table's name becomes wrong.
2. **Rename to `api_tokens` and add `scope`.** Honest naming; touches a table the coach depends on
   and the rename buys nothing the column does not.
3. **A second table for application tokens.** No migration of anything live; two mechanisms doing
   one job, which is what `008` called the failure mode for view registries.

Recommend 1, and say in the column's comment why the table's name is stale rather than renaming a
table three routes read.

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
