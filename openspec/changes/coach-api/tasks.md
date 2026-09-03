# Tasks — coach-api

## 1. Schema and spec

- [ ] 1.1 Add `coach_api_tokens` table to `lib/db/src/schema/coach.ts`
      (user FK cascade, unique token_hash, created_at, last_used_at,
      revoked_at) and verify `pnpm --filter @workspace/db run push` applies
      cleanly with existing tables untouched.
- [ ] 1.2 Add the `coach` tag and all nine operations (plan, solved, grade,
      forecast, log, config get/put, token create/revoke) with request and
      response schemas to `lib/api-spec/openapi.yaml`; run
      `pnpm --filter @workspace/api-spec run codegen` and verify the
      generated hooks and zod schemas compile via `pnpm run typecheck`.

## 2. Gate and token auth

- [ ] 2.1 Add `lib/auth/coach.ts` (`coachEmails`, `isCoachUser`) mirroring
      owner.ts semantics; verify with unit tests: unset var means nobody,
      trimming and case-insensitivity, blank entries dropped.
- [ ] 2.2 Extend the `CoachStore` seam with token operations and add
      `currentCoachUser` (session cookie or Bearer token, hashed lookup,
      last_used touch) plus the uniform-404 gate wrapper; verify with route
      tests: session accepted, bearer accepted, revoked token 404,
      non-allowlisted user 404 identical to signed-out 404.
- [ ] 2.3 Implement `POST /coach/token` (issue, revoking predecessors,
      plaintext returned once; issuance requires the session cookie — a
      stolen bearer token must not be able to mint its own successor) and
      `DELETE /coach/token`; verify with tests: rotation kills the old
      token, revoke kills the current one, bearer-authed issuance refused.

## 3. Coach store

- [ ] 3.1 Define `CoachStore` (problems, review get/upsert+event, day-log
      get/put, config get/put, tokens) and implement `memory-store`;
      verify the interface compiles and memory store passes a shared
      contract test file.
- [ ] 3.2 Implement `drizzle-store` including the grade transaction
      (review upsert + event insert + day-log stamp atomically) and the
      row ↔ engine mapping module; verify with the same contract tests
      run against Postgres when `DATABASE_URL` is present (skipped
      otherwise), plus typecheck.

## 4. Routes

- [ ] 4.1 Implement `GET /coach/plan` with freeze-on-first-call using the
      engine's `buildPlan` (`entry` in, persist `assignment` when
      non-null; unique-constraint race falls back to re-read); verify with
      tests: first call freezes, second call same ids with marks, distinct
      users get distinct plans.
- [ ] 4.2 Implement `POST /coach/solved` and `POST /coach/grade` over the
      engine's `markSolved`/`applyGrade`+`markDone`; verify with tests:
      grade creates review+event and stamps the day, same-day re-grade
      overwrites, un-solving a graded problem is 409, unknown problem 422.
- [ ] 4.3 Implement `GET /coach/forecast`, `GET /coach/log` (statuses,
      streak, adherence via the engine) and `GET/PUT /coach/config`
      (defaults on first read, 422 validation); verify with tests
      including overdue-lands-on-today and invalid config rejection.
- [ ] 4.4 Mount the coach router in `routes/index.ts`, add
      `@workspace/coach-engine` to api-server deps, and document
      `COACH_EMAILS` in replit.md's environment table; verify the server
      boots and unauthenticated `GET /api/coach/plan` returns 404.

## 5. Verification

- [ ] 5.1 Run the full gates — `pnpm run typecheck`, `pnpm run build`,
      `pnpm --filter @workspace/api-server run test`,
      `pnpm --filter @workspace/coach-engine run test` — and verify all
      pass with the pre-existing suites untouched.
- [ ] 5.2 End-to-end smoke against a local Postgres: seed problems, create
      a user, set `COACH_EMAILS`, issue a token, then via bearer token
      fetch the plan, tick solved, record a grade, and see the grade
      reflected in a re-fetched plan and the forecast.
