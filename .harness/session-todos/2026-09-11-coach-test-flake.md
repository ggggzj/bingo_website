---
title: coach.test.ts has a UTC-midnight flake, found while implementing jobs-page
status: open
origin: Observed 2026-09-11 during `/implement 2026-09-11-jobs-page`. Pre-existing;
  nothing in that change touches the coach.
---

`src/routes/coach.test.ts > coach routes > solved and grade > a solved tick shows up in
the plan` failed once, then passed on three consecutive full-suite runs and on a
targeted re-run.

`coach.test.ts:45` defines "today" as `new Date().toISOString().slice(0, 10)`, and
several tests build fixtures around it (lines 248, 288–299). A run that crosses UTC
midnight between fixture construction and assertion gets two different days.

Not fixed here: the jobs-page change touches `routes/index.ts`, `routes/jobs.ts` and
`lib/jobs/`, none of which the coach reads. Fixing it inside that change would be work
outside its checklist.

The fix is to freeze the clock for those tests rather than read the wall clock twice.
