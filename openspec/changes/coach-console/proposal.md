# Proposal — coach-console

## Why

Origin: `AceLeetcode/.harness/backlogs/coach-console.md` (user request
2026-09-09). Two gaps that live on the same pages:

1. **The coach is hidden after login.** `/account` — where a signed-in
   person lands — offers only the owner's Growth dashboard and sign-out;
   `/coach` is reachable solely from the marketing header. The logged-in
   area should read as a console with two separate parts: usage/growth,
   and practice.
2. **The web `/coach` is a weaker dashboard than the local Python one.**
   `coach-api` deliberately deferred the `analytics.py` port, so the web
   page has no knowledge gaps, no pattern strength, no "Do this next"
   guidance, and no grilling affordance.

## What Changes

- **Engine**: port `analytics.py`'s read-only logic into
  `@workspace/coach-engine` as pure functions — `knowledgeGaps`,
  `leeches`, `patternStrength`, `ungraded`, `overview`, `guidance` —
  keeping the guidance copy close to verbatim (it names problems, dates
  and numbers on purpose).
- **API**: one new read endpoint `GET /coach/insights` returning
  guidance, open/cleared gaps, pattern strength, ungraded backlog and the
  overview counters, behind the same allowlist gate.
- **`/coach` page**: a guidance panel at the top ("Do this next"), plus
  gaps and pattern-strength panels; every problem row gains a copyable
  `Grill me on LC N` prompt (the web cannot launch a local Claude Code
  session, so it hands over the exact sentence instead).
- **`/account` page**: becomes a small console — one card per dashboard
  the viewer may use (Growth for the owner, Practice for allowlisted
  users), the practice card showing today's live progress instead of a
  bare link.
- **Zero-data honesty**: with no grades yet, panels state what will fill
  them rather than rendering empty boxes.
- **Not in this change**: cards on the web, weekly reports, browser-based
  grilling (all separately ticketed / PRD phase 2).

## Capabilities

### New Capabilities

- `coach-insights`: the read-only analysis the coach exposes — gaps,
  pattern strength, ungraded backlog and prioritized guidance — and what
  those numbers are allowed to claim.

### Modified Capabilities

- `coach-page`: gains the guidance/gaps/patterns panels, the grilling
  prompt affordance, and the logged-in console entry point.

## Impact

- `lib/coach-engine`: new `analytics.ts` (+ tests); no change to
  scheduling, so parity fixtures stay untouched.
- `lib/api-spec` + codegen: one new operation and its schemas.
- `artifacts/api-server`: `GET /coach/insights` over the existing store.
- `artifacts/landing`: `Coach.tsx` panels, `Account.tsx` console.
- No schema change, no new dependencies.
