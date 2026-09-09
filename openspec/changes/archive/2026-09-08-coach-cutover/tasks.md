# Tasks — coach-cutover

## 1. Importer (this repo)

- [x] 1.1 Write `lib/db/src/import-coach-data.ts` (args: `--email`,
      `--dir`; reviews + history→events with replace-on-reimport, day-log
      and config upserts, unknown problem ids reported and skipped, prints
      the env lines to set on success) and add an `import-coach` script;
      verify with a crafted local data dir imported twice against the
      scratch database: counts stable, unknown id reported, plan reflects
      the import.

## 2. Bridge (AceLeetcode repo)

- [x] 2.1 Add `scripts/coach_api.py` (env-driven, stdlib urllib,
      `CoachApiError` with the server/token/allowlist hint) and the remote
      branch in `record.py` (post grade, print server verdict + card
      reminder, no local state writes); verify against the live local
      server: grade appears via the API, local JSON byte-identical, server
      down → non-zero exit and clear message.
- [x] 2.2 Add the remote branch in `daily.py` (fetch plan, adapt to the
      existing markdown renderer, save to `plans/`, no freeze, no
      dashboard rebuild, footer points at /coach) and a remote-mode note in
      AceLeetcode's CLAUDE.md; verify the rendered plan matches the API
      response and local mode still passes the repo's engine tests.

## 3. Verification

- [x] 3.1 Full rehearsal against the scratch stack: import a crafted local
      history for the smoke user, set the env vars, run `daily.py` (plan
      mirrors the site), `record.py N pass` (grade lands on the site), and
      confirm `/coach` in the browser shows the graded day; then unset the
      vars and confirm local mode still works untouched.
