# Proposal — coach-page

## Why

The coach API (archived change `coach-api`) works end to end, but only over
curl: there is no page. Per the PRD (`AceLeetcode/.harness/prd/coach-on-web.md`),
the `/coach` page is delivery slice ③ — the tracker becomes something the
candidate opens every morning instead of an API they script against.

## What Changes

- New route `/coach` (nav label "Coach") in the landing app, following the
  Dashboard page's pattern exactly: the route is unguarded, the page renders
  the ordinary not-found when the server answers 404, so non-allowlisted
  visitors learn nothing.
- The page shows, from the coach API alone:
  - **Today's plan** — reviews and new problems with LeetCode links,
    patterns, minutes, weak points to expect, and a solved checkbox per
    problem (writes `POST /coach/solved`; a graded problem's box is locked).
  - **Consistency** — streak, adherence and a day-status heatmap from
    `GET /coach/log`.
  - **Review forecast** — the next two weeks' load from `GET /coach/forecast`.
  - **Settings** — daily minutes, new-per-day, interview date and sprint
    window via `GET/PUT /coach/config`.
  - **Grill bridge token** — issue/rotate and revoke the personal token,
    with the plaintext shown exactly once and a copy-paste
    `export COACH_TOKEN=...` hint.
- Header link to `/coach` appears only for allowlisted users (probed by the
  page itself; the header stays dumb).
- **Not in this change**: grading from the browser (grilling stays in Claude
  Code per the PRD's tracker-first decision), analytics panels
  (gaps/pattern strength — analytics port comes later), migration and the
  9:04 push (change ④).

## Capabilities

### New Capabilities

- `coach-page`: what the `/coach` page shows, which API calls each panel
  relies on, how solved-ticking and token management behave in the browser,
  and how the page hides itself from non-allowlisted visitors.

### Modified Capabilities

_None — `coach-api` is consumed exactly as specified._

## Impact

- `artifacts/landing`: new `src/pages/Coach.tsx` (+ small subcomponents if
  the file grows), a route in `App.tsx`, and a conditional nav entry in
  `SiteHeader.tsx`.
- Uses only generated hooks from `@workspace/api-client-react` and existing
  ui components (shadcn + recharts). No new dependencies, no API changes.
