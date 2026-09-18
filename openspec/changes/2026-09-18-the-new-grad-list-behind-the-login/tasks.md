# Tasks — the-new-grad-list-behind-the-login

Groups 1 and 2 are pure decisions with no I/O: they leave the repo wired exactly as it was
and are verifiable on their own. **The first user-visible slice is group 3**, and every group
after it leaves a working page behind. Close each group with the `replit.md` working loop
before starting the next.

## 1. Decide what "early-career software" means, in one place, against real titles

- [ ] 1.1 New `artifacts/api-server/src/lib/new-grad/titles.ts`: the early-career term list,
      the software-role test and the seniority exclusions, as exported data plus one
      predicate. Word boundaries are applied here, because the upstream `ilike` has none.
      **Test:** `artifacts/api-server/src/lib/new-grad/titles.test.ts` — proven against real
      strings from the owner's own list, not invented ones:
      `Entry Level Java Developer Associate` ✓, `Associate Software Engineer - Pega` ✓,
      `EFA Network Software Engineer 1 - Annapurna Labs` ✓,
      `Software Engineer Graduate - 2027` ✓, `Senior Software Engineer I` ✗,
      `Software Engineering Intern` ✗, `Sr. Solutions Architect` ✗,
      `Robotics Systems Engineering Manager` ✗.
- [ ] 1.2 Same test file: the exclusions are applied **after** the terms and win, proven by a
      title that satisfies both.
- [ ] 1.3 Same module: the class-year rule (D3), with `2027` as an exported constant rather
      than a literal in a condition. A title naming a year other than the target is excluded;
      a title naming the target is flagged for the sort; a title naming no year passes
      untouched.
      **Test:** same test file — `Software Engineer New Grad - December 2026` ✗,
      `Software Engineer - University Hire 2027` ✓ and flagged,
      `Entry Level Java Developer Associate` ✓ and not flagged. And one that pins the
      proportion this rule rests on: a title with no year is **not** excluded, which is 97% of
      the owner's own list and the single assumption most likely to be broken by a careless
      edit.

## 2. Decide what a location means, and admit when it cannot be read

- [ ] 2.1 New `artifacts/api-server/src/lib/new-grad/location.ts`: `us` / `unknown` /
      `elsewhere` over the provider's raw location string.
      **Test:** `artifacts/api-server/src/lib/new-grad/location.test.ts` —
      `Irving Texas United States` → us, `US-Remote` → us, `San Jose / LA` → us,
      `2 Locations` → unknown, `""` → unknown, `London, UK` → elsewhere,
      `Bengaluru` → elsewhere. An unreadable string SHALL NOT resolve to `us`.

## 3. The server answers — one route, owner-only, fanned out upstream

- [ ] 3.1 `lib/api-spec/openapi.yaml`: add the route and its response schema, then run
      `pnpm --filter @workspace/api-spec run codegen` **in this same task**. Nothing else
      regenerates the hooks, and `lib/*/src/generated` is never hand-edited.
- [ ] 3.2 New `artifacts/api-server/src/routes/new-grad.ts`: one upstream query per
      early-career term against `/api/postings`, merged and de-duplicated by `job_id`, then
      narrowed by groups 1 and 2. Refuses a non-owner with **404, never 403**, the way
      `coachGate` already does — the rail's `entitled` is convenience, never the boundary.
      **Test:** `artifacts/api-server/src/routes/new-grad.test.ts`, real routes against a fake
      upstream — never a mock of our own code. It proves: a non-owner gets 404; two upstream
      terms returning the same `job_id` yield one row; a row failing the software test is
      absent though the upstream returned it; an `elsewhere` row is absent and an `unknown`
      row is present and marked.
- [ ] 3.3 Same test file: the PR states the number of upstream requests one page-load makes,
      the way `../h1_checker`'s `022` was made to state its daily count.

## 4. The rail lists it, and the page says what it cannot see

- [ ] 4.1 `artifacts/landing/src/pages/dashboard/views.tsx`: one entry, `entitled: (viewer) =>
      viewer.isOwner`. **Test:** extend `artifacts/landing/src/pages/dashboard/Shell.test.tsx`
      — the entry is absent from a non-owner's rail.
- [ ] 4.2 New `artifacts/landing/src/pages/dashboard/NewGradList.tsx`: rows carrying employer,
      title, location, posted date, days since posted, the employer's filing count and tier,
      and the posting's own refusal where one was read. **Ordered: titles naming the target
      class first, then newest first**, with each row showing why it sorted where it did. No
      badge, no score, no deadline.
      **Test:** `artifacts/landing/src/pages/dashboard/NewGradList.test.tsx` — a posting with
      no refusal verdict renders nothing about refusing, matching what
      `openspec/specs/jobs-page/spec.md` already requires of the public page; and a
      2027-titled posting sorts above a newer one that names no year, with its reason shown.
- [ ] 4.3 Same component: a header naming the gap — how many boards feed this and that
      company-owned sites (TikTok, ByteDance, Amazon, Apple, Google) are not among them.
      **Test:** same file — the gap sentence is present with no postings and with postings.

## 5. What is new since the owner last looked, and what closed

- [ ] 5.1 `lib/db/src/schema/`: one table keyed by user and view holding the marker, cascading
      with the account the way `coach_*` does. Schema is source of truth; no hand-written SQL.
- [ ] 5.2 New store module beside the route: read the marker, and advance it only on an
      explicit acknowledgement. **Test:** in `new-grad.test.ts` — rendering twice without
      acknowledging leaves the same rows new; acknowledging then re-reading empties them.
- [ ] 5.3 `NewGradList.tsx`: the two sections, and a posting that has closed since the marker
      shown as closed rather than dropped. **Test:** in `NewGradList.test.tsx`.

## 6. Say what changed

- [ ] 6.1 `replit.md`: the working loop's update, and an "Architecture decisions" entry for D1
      (the fan-out, and that it is deleted when `016` moves the query upstream), D3 (the class
      year fences and sorts but never filters — 8 of the owner's 376 titles name a year) and
      D5 (the marker's table, and why not `localStorage`).
- [ ] 6.2 `.harness/backlogs/019`: status and a pointer to this change. The note and the alumni
      import stay open on the ticket — they are this change's non-goals, not its leftovers.
