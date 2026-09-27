# Proposal — a-scoped-token-for-the-folder

## Why

Until 2026-09-27 the owner's loop was one message: paste a rejection email into the session in
`~/Desktop/job_dashboard`, say 更新状态, and Claude wrote the status, the stage and the
employer's own words into `overrides.js`. **All 18 hand-written rows came that way, 12 of them
out of an email**, and the quotes in them — `not able to support work authorization sponsorship`
— exist nowhere else.

`2026-09-25-the-applications-i-already-sent` moved that half into the account, where only a
signed-in browser can write it. A script on the owner's laptop has no identity, so Claude editing
the folder now edits a retired file. This gives that script a way in.

Origin: `.harness/backlogs/025`, owner request 2026-09-24/25, reaffirmed 2026-09-27 as the step
before `.harness/backlogs/027` (reading the inbox), which needs somewhere to put what it finds.

## What Changes

**This is not a new credential mechanism.** Grounding 025 found the one this repo already has,
built for a caller of exactly this shape — `lib/coach/auth.ts` says so in its header: *"a personal
bearer token (the local grill bridge)"*.

| Already here | |
|---|---|
| `coach_api_tokens` | per-user, hashed, `revoked_at`, `last_used_at` |
| `POST /coach/token` | issues one, **session-only** so a token cannot mint its successor; plaintext shown once; issuing revokes the previous |
| `currentCoachUser` / `coachGate` | resolves a caller from session **or** bearer, uniform 404 otherwise |

So the change is narrow:

- **A `scope` column on that table**, `not null default 'coach'`, so every token already issued
  keeps exactly the access it has today and cannot reach an application.
- **`POST /tokens` taking a scope** (session-only, same rule), and revoke beside it.
- **The applications routes accept a scoped bearer**, through the same shape `coachGate` has —
  session, or a token whose scope is `applications`. The uniform 404 is unchanged.
- **The trail records `hand: 'script'`** for those writes. The column already exists and has
  carried `browser` and `import` since the tables were created, for precisely this.
- **`update_status.py` in the folder**, which Claude calls the way it already calls `add_job.py`.

## What does not change

- **A coach token cannot write an application.** The default on the new column is what guarantees
  it, rather than a check somebody has to remember.
- **The browser path.** The session keeps working exactly as it does, and nothing about
  `PATCH /applications/{id}`'s rules changes — a script gets the same validation and the same
  refusals as a browser.
- **The import.** It still owns the machine half and still never touches the owner's.
- **No inbox reading.** That is `.harness/backlogs/027` and a separate decision.

## Non-goals

- **Not per-user tokens as a feature.** Nobody but the owner is offered one. The moment a token
  is something every user generates, this is `017`'s problem with credential storage, rotation,
  abuse and support attached — and a proposal that starts describing "users can generate a token"
  has drifted and should stop.
- **Not a public write API.** One scope, three fields, the caller's own rows.
- **No new secret in any deployment's environment.** The three that exist stay server-to-server.
- **Not automatic anything.** The script writes when the owner tells Claude to.

## Decisions taken, reversible before `/implement`

| | |
|---|---|
| Scope as a column rather than a second table or a rename | Smallest change that makes an existing token's reach unchanged **by default**. The table's name becomes stale; a comment says so rather than renaming a table three routes read. |
| The new endpoint is `/tokens`, not `/coach/token` | The mechanism is no longer the coach's. `/coach/token` stays, unchanged, issuing `coach` scope — deleting it would break the grill bridge that is using it today. |
| Owner-only for now | `entitled` is the owner, the same as the applications routes it opens. |
| The token lives in the folder's `account.env` | Beside the config `push_to_account.py` already reads, in a folder that is not a git repo. It is revocable from the account, which is the property that makes storing it acceptable. |

## Capabilities

### New Capabilities
- `personal-tokens` — issuing, scoping and revoking a token that authenticates a tool the owner
  runs, as them.

### Modified Capabilities
- `applications-list` — a scoped script may write the same three fields the browser writes, and
  the trail says which hand did.
