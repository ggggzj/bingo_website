# Design — coach-page

## Context

See proposal.md. Binding conventions from the existing app: Dashboard.tsx is
the template — unguarded route, redirect-to-login when signed out, 404 →
`<NotFound />`, generated hooks with explicit query keys, `retry: false`,
`enabled: isSignedIn`, shadcn ui + recharts, `data-testid` attributes on
interactive elements.

## Goals / Non-Goals

**Goals:** one page, five panels, all data from the coach API via generated
hooks; the plan panel is the workhorse. **Non-Goals:** no browser grading,
no analytics panels, no local-storage state (the API is the only truth), no
mobile-specific layout work beyond the app's existing responsive classes.

## Decisions

1. **One page file, panel subcomponents inside it.** `Coach.tsx` with
   internal `PlanPanel`, `ConsistencyPanel`, `ForecastPanel`,
   `SettingsPanel`, `TokenPanel` components; split into files only if it
   passes ~500 lines. Mirrors how Dashboard keeps everything local.
2. **The plan query is the gate probe.** `useGetCoachPlan` runs first;
   its 404 renders `<NotFound />` for the whole page (same as Dashboard's
   totals query). Other queries run with `enabled: plan.isSuccess` so a
   refused visitor fires one request, not five.
3. **Solved ticks are optimistic-free.** Mutate, then invalidate the plan
   and log queries. The API refuses un-ticking graded problems with 409;
   the UI disables those checkboxes anyway, so the 409 path is belt and
   suspenders, surfaced via toast if it ever fires.
4. **Heatmap is CSS grid, not a chart library.** 13 columns × 7 rows of
   colored squares from `GET /coach/log?days=91`, colored by status with a
   legend; recharts is only used for the forecast bars, matching the
   Dashboard's chart idiom.
5. **Nav link via a lightweight probe hook.** `SiteHeader` renders "Coach"
   when `useGetCoachPlan` has succeeded — implemented as a tiny
   `useCoachAccess()` hook wrapping the same query key so header and page
   share the cache and the header adds zero extra requests for outsiders
   beyond the single cached probe (only run when signed in).
6. **Token plaintext lives in component state only.** Kept in a `useState`,
   rendered once, gone on unmount. Copy button uses the clipboard API.

## Risks / Trade-offs

- [Header probe fires one coach request for every signed-in non-allowlisted
  user] → acceptable: one cached 404 per session, indistinguishable from
  the page probe; gated on `isSignedIn` so visitors cost nothing.
- [Plan GET writes (freezes) on first visit of a day] → that is the
  specified product behavior inherited from coach-api; the page adds no
  extra surprise.
- [No component tests — landing has no test runner today] → verification
  is typecheck + build + a live browser walkthrough against the real
  api-server and scratch Postgres; adding a test stack to landing is out
  of scope for this change.

## Migration Plan

Pure addition to the SPA; rollback is removing the route and nav entry.
