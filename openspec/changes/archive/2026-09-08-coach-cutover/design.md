# Design — coach-cutover

## Context

See proposal.md. The local `data/` is nearly empty today (no grades ever
recorded, three stale August day-log rows), so the importer's value is
fidelity and idempotency guarantees more than bulk; the bridge is the part
that will run daily.

## Goals / Non-Goals

**Goals:** one command to move history; local workflow keeps its exact
ergonomics (`record.py 239 pass`, the 9:04 push) with the API underneath.
**Non-Goals:** no deployment automation; no dual-write mode (single source
of truth or nothing); no card sync (cards are and remain local files).

## Decisions

1. **Importer talks to the DB directly, not the API.** It is an owner-run,
   one-shot operation exactly like `seed-coach-problems`; going through the
   API would need a token before the user has migrated, and adds nothing.
   Same tsx-script pattern, same package.
2. **Events are replaced, not merged.** On import, existing events for each
   imported review are deleted and rebuilt from the local history array —
   the only way "import wins" stays true on re-runs without duplicate
   events. Day rows and config use plain upserts.
3. **Bridge is stdlib urllib, ~80 lines.** `scripts/coach_api.py` exposes
   `enabled()`, `get_plan()`, `post_grade()`. No new Python dependencies;
   errors raise a single `CoachApiError` with the check-server/token/
   allowlist hint, and callers exit non-zero.
4. **Remote `daily.py` renders from the API plan shape.** The API's
   camelCase plan maps onto the existing markdown renderer via a small
   adapter, so the plan file and the 9:04 push look identical in both
   modes; the footer says the dashboard now lives at `/coach`.
5. **Mode is decided per process from env, never from config files** — a
   forgotten config flag on one machine is how truth forks; env vars are
   visible in the crontab/scheduled task that sets them.

## Risks / Trade-offs

- [User keeps running local mode out of habit after migrating] → after a
  successful import the importer prints the exact env lines to add; the
  cutover is complete only when those are set — stated in its output.
- [API plan shape drifts from the renderer] → the adapter maps explicit
  fields; typecheck cannot help Python, so the bridge smoke run in the
  verification tasks is the guard.

## Migration Plan

Run importer → set env vars in the shell profile and the 9:04 task → local
JSON becomes an archive (left in place, no longer written). Rollback:
unset the env vars; local mode resumes from the archived files.
