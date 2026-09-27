# Design — a-scoped-token-for-the-folder

## The scope column, and why its default is the whole guarantee

`coach_api_tokens` gains `scope text not null default 'coach'`. Every row that exists keeps the
access it was issued for, and no migration has to find them.

The alternative shapes were considered and are recorded because the next reader will think of them:

- **Reuse the token as-is, no scope.** Rejected: a token handed to a practice tool would silently
  gain the ability to write the one table holding the only copy of the owner's rejection letters.
  Widening what an already-issued credential opens is not a thing to do quietly.
- **Rename the table to `api_tokens`.** The name is stale after this and renaming is honest, but it
  touches a table three coach routes read to buy nothing the column does not. A comment carries the
  staleness instead.
- **A second table.** Two mechanisms doing one job — the failure mode `008` named for view
  registries, one layer down.

## Resolution, and the one rule that must not be copied loosely

`currentCoachUser` resolves session-then-bearer and returns a user. The applications equivalent
differs in one way: **the bearer must carry the right scope**, and the scope is read from the row,
never from the request. A caller cannot ask for a scope.

`POST /tokens` takes the session cookie only. That is not a detail — it is what stops a leaked
token minting a fresh one with a wider scope, and `coach.ts` already states the rule at its own
issuing route.

`last_used_at` is already written on every resolution. It stays, and it is the only way the owner
will notice a token being used from somewhere they are not.

## The trail is why `hand` exists

`application_events.hand` has carried `import` and `browser` since the tables were created, with a
comment saying `script` arrives with this ticket. It arrives now. Two writers and no way to tell
them apart is how a wrong status becomes unexplainable six weeks later — and after this there are
genuinely two.

Last-write-wins between them, at one user, is honest **provided the trail shows both**. No merge
logic, no locking.

## What the folder gets

`scripts/update_status.py`, called the way `add_job.py` is: it reads the token from `account.env`,
PATCHes one application, prints what it changed. A missing token prints one line and exits zero —
the same rule `push_to_account.py` follows, because a local tool must not fail because the network
half is not configured.

It does **not** decide anything. Claude reads the email with the owner and calls it with a status;
the script is a transport. That boundary is what `.harness/backlogs/027` is built on top of.
