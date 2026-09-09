# coach-cutover — spec delta

## Purpose

The handover from the local Python coach to the website: local history is
imported once with full fidelity, and from then on the local grilling
workflow reads and writes the web API, leaving one source of truth.

## ADDED Requirements

### Requirement: Local history imports with full fidelity
The importer SHALL read a local AceLeetcode `data/` directory and write,
for one named existing user: every review state (state, ease, interval,
due, reps, lapses, last grade, weak points) with one review event per
history entry; every day-log row (assigned, planned minutes, solved,
done); and the config (minutes, new-per-day, sprint window, interview
date, target companies). Problem ids not present in the site's bank SHALL
be reported and skipped, never invented. Re-running SHALL leave the same
end state (review state and events replaced, day rows and config
upserted) — import wins, duplicates never accumulate.

#### Scenario: Round trip
- **WHEN** a data directory with graded problems and day logs is imported
  twice for the same user
- **THEN** the coach tables hold exactly one review row per problem, one
  event per history entry, one row per day, and the user's plan reflects
  the imported schedule

### Requirement: Remote mode makes the API the only truth
When `COACH_API_BASE` and `COACH_TOKEN` are set, `record.py` SHALL send
the grade (with weak points, mode and notes) to the coach API and SHALL
NOT write `data/reviews.json` or `data/daily_log.json`; `daily.py` SHALL
fetch the plan from the API, render it to `plans/YYYY-MM-DD.md` in the
same format, and SHALL NOT freeze assignments locally or rebuild the
local dashboard. The insight-card reminder SHALL keep working from local
files in both modes. With the variables unset, both scripts SHALL behave
exactly as before.

#### Scenario: Grade lands on the website only
- **WHEN** remote mode is configured and a grade is recorded
- **THEN** the API shows the new review state and day-log entry, and the
  local JSON files are byte-identical to before the command

#### Scenario: Local mode untouched
- **WHEN** the env vars are unset
- **THEN** record.py and daily.py read and write local files exactly as
  they did before this change

### Requirement: Remote failures are loud and stateless
If the API cannot be reached or answers an error in remote mode, the
scripts SHALL print the failure and exit non-zero without falling back to
writing local state — a silent fallback would fork the truth. The error
message SHALL say what to check (server, token, allowlist).

#### Scenario: Server down at grading time
- **WHEN** remote mode is on and the API is unreachable
- **THEN** record.py exits non-zero with a clear message and no local or
  remote state has changed
