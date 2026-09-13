# Tasks — dashboard-shell

Six groups, each leaving the site working end to end.

**How each group is proven.** Server groups use the existing Vitest + supertest suite.
Frontend groups use a Vitest + Testing Library suite that group 2 installs — which reverses
the owner's 2026-09-11 call recorded in `openspec/changes/archive/2026-09-11-jobs-page/tasks.md`
("`artifacts/landing` has no test runner and no test dependencies, by decision rather than by
omission"). Reversed by the owner on 2026-09-12: that call was made for a read-only page one
person could drive in a browser; this change is permission-dependent rendering across four
surfaces, which means driving it as three different viewers every time anything moves.

**One file, one task.** `openspec/config.yaml` forbids two tasks writing the same file, so
`replit.md` is edited once, in group 6, rather than at the close of each group. Every other
part of the working loop (`replit.md` "User preferences") still runs per group.

## 1. The gate opens

Leaves the system working: any signed-in user's browser reaches the coach API. Nothing in
the UI has moved — and because `/account` already probes the plan endpoint to decide whether
to draw its practice entry, ordinary users see that entry appear the moment this lands.

- [x] 1.1 `lib/api-spec/openapi.yaml` — the `coach` tag description ("Interview coach,
      allowlisted users only") and the comment block above `/coach/plan` explaining the
      `COACH_EMAILS` allowlist now say what is true: coach routes answer a uniform 404 to
      anyone not signed in, and nothing else. No operation or schema changes.
      **Run codegen in this task** — nothing else regenerates the hooks and Zod schemas.
- [x] 1.2 `artifacts/api-server/src/lib/coach/auth.ts` and
      `artifacts/api-server/src/routes/coach.ts` — `coachGate` and `POST /coach/token`
      require a resolved caller and nothing more. Delete
      `artifacts/api-server/src/lib/auth/coach.ts` and its test. Proven by
      `artifacts/api-server/src/routes/coach.test.ts`: a signed-in user with no history and
      no allowlist entry gets a plan where they used to get 404; an anonymous caller still
      gets 404; a revoked bearer token still gets 404; `POST /coach/token` still refuses a
      bearer token and takes only the session cookie.

## 2. A test runner for the web app

Leaves the system working: `pnpm --filter @workspace/landing run test` runs and passes. No
product behavior changes.

- [x] 2.1 `artifacts/landing/package.json` (Vitest, Testing Library, `jest-dom`, jsdom, MSW
      — see `design.md` §8; `tsx` stays `catalog:`), `artifacts/landing/vitest.config.ts`,
      `artifacts/landing/src/test/setup.ts`. The setup answers HTTP, never replaces a
      generated hook.
- [x] 2.2 `artifacts/landing/src/components/WaitlistForm.test.tsx` — the first real test,
      chosen because it exercises what a new frontend setup usually gets wrong rather than
      what this change touches: a component rendering under the query client, a generated
      mutation hook running for real, and a user event. Proves the runner, not the feature.

## 3. The shell

Leaves the system working: `/dashboard/growth` and `/dashboard/practice` render inside the
shell, `/coach` redirects, and the old `/account` entries still lead somewhere real.

- [x] 3.1 New `artifacts/landing/src/pages/dashboard/` (`Shell.tsx`, `Rail.tsx`,
      `views.tsx` — the registry of `design.md` §2) and `artifacts/landing/src/App.tsx` —
      `/dashboard/:view` renders the rail plus the selected view; `/dashboard` and an
      unknown segment redirect to the first entitled view in rail order; `/coach` redirects
      to `/dashboard/practice`; an anonymous visitor goes to `/login`. Proven by
      `artifacts/landing/src/pages/dashboard/Shell.test.tsx`: an owner sees two rail
      entries; a signed-in non-owner sees the practice view **with no rail control at all**;
      a non-owner opening `/dashboard/growth` gets the ordinary not-found page; `/coach`
      lands on practice.

## 4. The views move in

Leaves the system working: one frame, one sign-out, each view rendering only its content.

- [ ] 4.1 `artifacts/landing/src/pages/Dashboard.tsx` — becomes the growth view: drops its
      own sign-out chrome, keeps every chart and tile. Proven by
      `artifacts/landing/src/pages/Dashboard.test.tsx`: a non-owner still gets the not-found
      page, and the view renders no sign-out control of its own.
- [ ] 4.2 `artifacts/landing/src/pages/Coach.tsx` — becomes the practice view: drops its own
      chrome, stops consulting `hasAccess`, and its zero state carries the fact from
      `design.md` §7 — the schedule advances when a grilling grades you, and grilling runs
      locally today. Proven by `artifacts/landing/src/pages/Coach.test.tsx`: a signed-in
      user with no reviews and no day log sees that statement rather than empty panels, and
      sees no control that would let them grade themselves.
- [ ] 4.3 `artifacts/landing/src/pages/Account.tsx` — reduced to identity, sign-out, and one
      entry into the dashboard. Proven by
      `artifacts/landing/src/pages/Account.test.tsx`: a signed-in user sees their email, one
      dashboard entry and a sign-out control — and no per-dashboard entries.

## 5. The way in

Leaves the system working: a signed-in visitor on the home page is offered the dashboard,
not a login.

- [ ] 5.1 `artifacts/landing/src/components/SiteHeader.tsx` — "Dashboard" when signed in,
      "Log in" when not, and no separate Coach link, in both the bar and the mobile sheet.
      Then `artifacts/landing/src/hooks/use-coach-access.ts` loses `hasAccess` and `refused`
      — this is its last consumer — keeping the plan query that the practice entry needs.
      Proven by `artifacts/landing/src/components/SiteHeader.test.tsx`: signed in shows
      Dashboard and no Log in; signed out shows Log in and no Dashboard; neither shows a
      Coach link.

## 6. The record

Leaves the system working: the documentation stops describing a gate that no longer exists.

- [ ] 6.1 `replit.md` — remove the `COACH_EMAILS` row from the environment table; update
      "Where things live" for `src/pages/dashboard/` and the landing test setup; append to
      "Architecture decisions" why the allowlist was deleted rather than kept as a kill
      switch (the empty value would invert from "nobody" to "everybody", so an old deploy
      config restored later would silently open the coach), and why the switcher is a rail.
