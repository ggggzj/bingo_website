---
id: 023
title: After a Google sign-in the owner cannot find the dashboard — `/jobs` has no way to it
status: open
origin: The owner, 2026-09-21, minutes after the first sign-in on the surviving database:
  "登录成功了，但是我的 growth dashboard 呢". The dashboard was there, at `/dashboard/growth`;
  nothing on the page they landed on said so. Captured under Rule 5 during
  `openspec/changes/2026-09-20-move-onto-the-surviving-database/`, not fixed there.
---

## Measured, 2026-09-21

- `artifacts/landing/src/pages/Login.tsx:108` — every Google sign-in navigates to `/jobs`.
  The password path (`:135`) sends an owner to `/dashboard` and everyone else to `/account`.
  Two ways in, two different destinations for the same person.
- `artifacts/landing/src/pages/Jobs.tsx` has one link and it opens a job posting. No
  `/dashboard`, no `/account`.
- `components/SiteHeader.tsx` carries the "Dashboard" door for a signed-in visitor, and is
  rendered by `Home.tsx` only. `/jobs` does not render it.
- `OWNER_EMAIL` was checked first, because the symptom is identical when the address is
  missing from it: it names both of the owner's addresses exactly. The gate was open; the
  door was unmarked.

So the owner, after the only sign-in the site offers, stands on a page from which the
dashboard is reachable by typing a URL. `/dashboard/growth`, `/dashboard/new-grad` and
`/dashboard/practice` all worked once typed.

## What this is not

- **Not a bug in 020.** `2026-09-20-the-front-door-signs-you-in` makes `/jobs` the landing for
  a signed-in visitor on purpose and deletes the header's four section anchors. Whatever fixes
  this has to fit that shape — a way from `/jobs` to the rest of the signed-in area — rather
  than send owners somewhere else again.
- **Not "put the header on `/jobs`" by default.** The header is the marketing page's; 020 is
  already reducing it. Where the door goes on `/jobs` is a design question for the proposal.
- **Not the `/jobs` login wall or the Summer 2027 section** — `.harness/backlogs/021`.

## Done looks like

- A signed-in visitor on `/jobs` reaches `/dashboard` in one click; the rail then does the
  rest (Growth and New grad for an owner, Practice for everyone).
- The password path and the Google path land the same person in the same place, or the
  difference is written down.
- A test in `Jobs.test.tsx` (or wherever the door lands) that asserts the door is present for
  a signed-in visitor and absent for an anonymous one — driven through `/api/auth/me` like
  `Account.test.tsx` does.
