# Tasks — coach-console

## 1. Engine: analytics port

- [x] 1.1 Add `lib/coach-engine/src/analytics.ts` porting `analytics.py`'s
      read-only functions as pure, clock-free code: `knowledgeGaps`,
      `leeches`, `patternStrength`, `ungraded`, `overview`, `guidance`
      (guidance copy close to verbatim). History comes in as review events
      per problem, since the web keeps events as rows rather than an
      embedded array. Verify with unit tests covering the spec scenarios
      (repeated gap ordering, pass clears a gap, lapses cost strength,
      confidence at one seen problem, oldest ungraded first, overdue
      leads guidance, fresh-account guidance) and confirm the parity
      fixtures still pass untouched.

## 2. API

- [x] 2.1 Extend the store with an events reader (`loadEvents(userId)`)
      in both implementations, add `GET /coach/insights` to the OpenAPI
      spec with its schemas, run codegen, and implement the route over
      the engine's analytics behind the existing gate; verify with route
      tests: shape matches the spec, gate answers 404, and calling it
      twice writes nothing.

## 3. Page and console

- [x] 3.1 Add the guidance, gaps and pattern-strength panels to
      `Coach.tsx` (guidance above the plan; zero-data copy in each) and a
      copyable `Grill me on LC N` control on every problem row; verify in
      the browser against seeded data and against a fresh account.
- [x] 3.2 Rework `Account.tsx` into the console: one card per dashboard
      the viewer may use, the practice card showing today's progress and
      streak from the coach API; verify in the browser for an allowlisted
      user and for an ordinary one (no entries, no hints).

## 4. Verification

- [x] 4.1 Run the full gates — typecheck, build, coach-engine tests
      (parity included), api-server tests — and confirm all pass.
