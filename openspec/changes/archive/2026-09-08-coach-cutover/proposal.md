# Proposal — coach-cutover

## Why

PRD slice ④ (`AceLeetcode/.harness/prd/coach-on-web.md`): the web coach is
built (engine, API, page), but the candidate's actual practice still runs on
the local Python system, and nothing connects the two. This change makes the
website the single source of truth: local history imports once, and the
local grilling workflow reads and writes the web API from then on.

## What Changes

- **Importer** (this repo): `lib/db/src/import-coach-data.ts` — one-shot,
  idempotent import of a local AceLeetcode `data/` directory (reviews with
  their history, daily log, config) into the coach tables for a named user.
  Import wins on re-run: review state and events are replaced, day rows
  upserted.
- **Local grill bridge** (AceLeetcode repo, cross-repo edit): a small
  `scripts/coach_api.py` client plus remote modes in `record.py` and
  `daily.py`, activated by `COACH_API_BASE` + `COACH_TOKEN` env vars:
  - `record.py` posts the grade (weak points, mode, notes) to
    `POST /coach/grade` and **stops writing local state files**; the
    insight-card reminder stays local (cards remain files).
  - `daily.py` fetches `GET /coach/plan`, renders the same markdown plan to
    `plans/`, and stops local freezing and dashboard rebuilds — so the 9:04
    scheduled task keeps working unchanged, now mirroring the API.
  - With the env vars unset, both scripts behave exactly as today (local
    mode), so nothing breaks before the site is deployed.
- **Not in this change**: deploying the site (the owner runs the platform),
  retiring the local dashboard (it simply stops being rebuilt in remote
  mode), and any web grilling.

## Capabilities

### New Capabilities

- `coach-cutover`: what the importer guarantees (fidelity, idempotency,
  user scoping) and how the local bridge behaves in remote mode (single
  source of truth, no local state writes, plan mirroring, offline failure
  behavior).

### Modified Capabilities

_None — the API and page are consumed as specified._

## Impact

- This repo: `lib/db/src/import-coach-data.ts` + an `import-coach` script
  in `lib/db/package.json`.
- AceLeetcode repo: new `scripts/coach_api.py`; remote branches in
  `scripts/record.py` and `scripts/daily.py`; a short remote-mode note in
  its CLAUDE.md commands section.
- No schema changes, no API changes, no new dependencies (urllib / node
  built-ins only).
