# Tasks — fix-a-canadian-ca-reads-as-california

## 1. Reproduce (done before this proposal)

- [x] 1.1 RED: `location.test.ts` › "does not read a two-letter code as a US state when the place
      is plainly elsewhere" — fails on `Toronto, ON, CA: expected 'us' to be 'elsewhere'`.
- [x] 1.2 Guard, green before the fix: `location.test.ts` › "still lets real US evidence win when
      a posting is open in two countries".

## 2. Fix

- [x] 2.1 `artifacts/api-server/src/lib/new-grad/location.ts`: split the US patterns into strong
      and weak (the bare state code); order strong US → foreign → weak US → unknown; add `sf`,
      `nyc` to the US city pattern; update the header comment's "US wins a tie" to say it is
      real US evidence that wins. Proof: 1.1 GREEN, 1.2 still green, the four pre-existing cases
      in `location.test.ts` still green.

## 3. Verify

- [x] 3.1 `pnpm --filter @workspace/api-server test` — whole suite green, including
      `routes/internships.test.ts` and `routes/new-grad.test.ts` untouched. Result: 20 files passed, 2 skipped (DB contract tests, no scratch Postgres configured); 230 tests passed.
- [x] 3.2 `pnpm run typecheck` clean. Result: exit 0, all four projects.
- [x] 3.3 Re-run the 6,000-row measurement against the fixed reader: exactly 54 rows
      `us` → `elsewhere` and 24 `unknown` → `us` (the proposal first said 26 — an addition slip over the same simulated rows, corrected there), nothing else moved. Record the numbers in
      the change's closing note. Result 2026-10-02, old reader at 084ae5c vs fixed: 6,000 rows, 78 moved — 54 `us` → `elsewhere`, 24 `unknown` → `us` (all `SF` / `NYC` lists), nothing else.
- [x] 3.4 replit.md working loop; note in replit.md where the location reader's rule is
      described (one line: strong US wins a tie, a bare state code does not). Done: replit.md "Location is three states…" gains the rule.

## 4. Review finding (close-out gate, owner: "先修", 2026-10-02)

- [x] 4.1 `location.ts` + `location.test.ts`: a US town that shares its name with a foreign city
      (`Dublin, CA`, `Dublin, OH`, `Vancouver, WA`, `Athens, GA`, `Melbourne, FL`…) reads as US
      again — before 2.1 it did, after 2.1 the foreign name beat the weak state code. A strong
      pattern for "that town, then its own state"; RED test first ("reads a US town that shares
      its name with a foreign city as US"), and `Dublin, Ireland` / `Melbourne, Australia` stay
      elsewhere. Proof: the new test RED then GREEN, the full api-server suite and typecheck green,
      and the 6,000-row comparison against 4f1b561 moves nothing (none of these towns are in it). Result: new test RED (`Dublin, CA: expected 'elsewhere' to be 'us'`) then GREEN; suite 231 passed; typecheck exit 0; 6,000 rows vs 4f1b561: 0 moved.
