# Tasks — track-split

## 1. Pattern table (owner-gated)

- [x] 1.1 Draft the pattern→multiplier table for the `ai-engineer` track
      over the bank's 29 patterns (boost candidates: matrix, math, heap,
      hash-map, prefix-sum, dp variants with simulation flavor; most stay
      1.0), each non-1.0 entry with a one-line rationale; commit as
      `research/track-weights.md`. Verify every boosted entry has a
      rationale.
- [ ] 1.2 **STOP — owner approves the table** (adjust boosts, add drops);
      record the approval in the research file.

## 2. Engine

- [ ] 2.1 Add `src/trackWeights.ts` (approved table + `trackFactor(problem,
      track)` with the [0.5, 1.5] clamp, `sde` hardwired to 1.0) and blend
      it into `scoreProblem`/`rankNewProblems` via an optional `track`
      option defaulting to `sde`; verify with new unit tests (AI track
      reorders an ML-adjacent tie; sde identical scores) and the untouched
      parity fixtures all passing.

## 3. Schema, API, page

- [ ] 3.1 Add `active_track` (text, default `sde`) to `coach_config`,
      thread it through mapping/stores/config route with zod validation
      (`sde | ai-engineer`), add `activeTrack` to the OpenAPI config
      schemas + codegen, and pass the track into the plan route's
      `buildPlan` call; verify with route tests: round-trip, invalid value
      422, plan for an ai-engineer user ranks a boosted-pattern problem
      first against a crafted bank.
- [ ] 3.2 Add the SDE / AI Engineer toggle to the settings panel with the
      "applies from the next plan" note; verify in the browser: toggle,
      save, reload persists.

## 4. Verification

- [ ] 4.1 Run the full gates (typecheck, build, coach-engine tests
      including parity, api-server tests) and push the schema to the
      scratch database cleanly.
