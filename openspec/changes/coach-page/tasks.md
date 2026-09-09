# Tasks — coach-page

## 1. Page

- [ ] 1.1 Create `src/pages/Coach.tsx` with the auth/gate skeleton
      (redirect signed-out to login, 404 → NotFound, loading spinner) and
      the plan panel: reviews + new problems with LeetCode links, patterns,
      minutes, weak points, sprint banner, deferred count, and solved
      checkboxes wired to `setCoachSolved` with plan+log invalidation;
      graded rows locked. Verify by typecheck and in the browser: plan
      renders, tick persists across reload, graded row disabled.
- [ ] 1.2 Add consistency panel (streak, adherence, 91-day CSS-grid
      heatmap with per-status colors + legend, ungraded distinct) and
      forecast panel (14-day recharts bars of minutes with count tooltip).
      Verify in the browser against seeded data showing at least one
      ungraded and one complete day.
- [ ] 1.3 Add settings panel (daily minutes, new/day, sprint window,
      interview date; PUT on save; 422 shown inline) and token panel
      (issue/rotate with once-only plaintext + copy + export hint,
      revoke). Verify in the browser: save round-trips, invalid value
      shows the error, token shows once and is gone after navigation.

## 2. Wiring

- [ ] 2.1 Add the `/coach` route in `App.tsx` and the conditional "Coach"
      nav entry in `SiteHeader.tsx` via a shared `useCoachAccess()` probe
      (signed-in only, shared query key with the page). Verify: link
      visible for an allowlisted user, absent for a non-allowlisted one,
      page still reachable by URL only as NotFound for the latter.

## 3. Verification

- [ ] 3.1 Run `pnpm run typecheck` and `pnpm run build`; then a live
      walkthrough with api-server + landing dev servers against the
      scratch Postgres (`COACH_EMAILS` set): sign in, open /coach, tick a
      problem, edit settings, issue + revoke a token, and confirm a
      non-allowlisted account sees NotFound.
