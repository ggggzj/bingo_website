# Tasks — coach-engine

## 1. Package scaffolding

- [x] 1.1 Create `lib/coach-engine/` workspace package (package.json exporting
      `./src/index.ts`, tsconfig extending the base like sibling lib packages,
      vitest.config.ts patterned on api-server's) and verify `pnpm install`
      resolves `@workspace/coach-engine` and `pnpm run typecheck` still passes
      workspace-wide.
- [x] 1.2 Add `src/types.ts` with the engine's plain-object types + zod
      schemas (Problem, ReviewState, ReviewEvent, DayLogEntry, CoachConfig,
      Plan) and `src/round.ts` with `pythonRound()` (half-to-even); verify
      with unit tests pinning `pythonRound` on .5 boundaries (2.5→2, 3.5→4)
      against Python's documented behavior.

## 2. Engine port (one module per reference file)

- [x] 2.1 Port `scheduler.py` → `src/scheduler.ts` (`applyGrade` returning
      `{next, event}`, `retentionRisk`, constants, due/overdue helpers);
      verify by porting every case in `test_scheduler.py` to vitest and all
      pass.
- [x] 2.2 Port `selector.py` → `src/selector.ts` (`companyDemand`,
      `patternStats`, `scoreProblem`, `rankNewProblems` with stable
      number-ascending tie-break, `estimateMinutes`, `pickSibling`,
      hard-lock rule); verify with unit tests covering hard-lock boundary
      (1 vs 2 solid), sprint vs normal weights, and empty-frequency default.
- [x] 2.3 Port the plan-assembly half of `daily.py` → `src/daily.ts`
      (`buildPlan` as a pure function taking `frozenEntry?` and returning
      the plan plus the assignment to freeze; review mode/cost rules; 65%
      ceiling; sprint detection from config + today; <15-minute stop rule;
      deferred count); verify with unit tests for the two spec scenarios
      (backlog capped, sprint review-only) plus the freeze-rebuild path.
- [x] 2.4 Port `daylog.py` pure helpers → `src/daylog.ts` (`dayStatus`,
      `streak`, `adherence`, solved/done id helpers, the solved-implies-
      graded rule and same-day re-grade overwrite as pure entry
      transformers); verify by porting `test_tracking.py` cases and all pass.

## 3. Parity fixtures

- [x] 3.1 Write `lib/coach-engine/fixtures/generate.py` that imports the
      AceLeetcode scripts and dumps golden JSON for the scenario matrix
      (every grade × state transition including .5-rounding cases; ranking
      over a crafted 12-problem bank normal + sprint; plans at budgets
      30/60/104 with and without backlog and sprint; day-status/streak
      sequences); run it once and commit `fixtures/*.json`; verify the
      files exist and record the generation date + source commit inside
      each fixture.
- [x] 3.2 Add `test/parity.test.ts` replaying every fixture through the TS
      engine with deep equality; verify `pnpm --filter
      @workspace/coach-engine run test` passes with zero tolerance
      (no approximate matchers).

## 4. Database schema and seed

- [x] 4.1 Add `lib/db/src/schema/coach.ts` with `coach_problems`,
      `coach_reviews` (unique user+problem), `coach_review_events`,
      `coach_daily_log` (unique user+day), `coach_config` per design §3,
      export from `schema/index.ts`; verify `pnpm run typecheck` passes and
      `pnpm --filter @workspace/db run push` applies cleanly against a dev
      database with existing tables untouched.
- [x] 4.2 Commit the problem bank copy to `lib/db/data/coach-problems.json`
      (from AceLeetcode `data/problems.json`, noting copy date in the file)
      and add `seed-coach-problems.ts` upserting by id with a `seed-coach`
      package script; verify running it twice against the dev database
      leaves exactly 150 rows with no duplicates.

## 5. Integration verification

- [x] 5.1 Run the full gates — `pnpm run typecheck`, `pnpm run build`,
      `pnpm --filter @workspace/coach-engine run test`, and the existing
      `pnpm --filter @workspace/api-server run test` — and verify all pass,
      proving the change is additive and the site's existing behavior is
      untouched.
