# Tasks — fix-a-canadian-ca-reads-as-california

## 1. Reproduce (done before this proposal)

- [x] 1.1 RED: `location.test.ts` › "does not read a two-letter code as a US state when the place
      is plainly elsewhere" — fails on `Toronto, ON, CA: expected 'us' to be 'elsewhere'`.
- [x] 1.2 Guard, green before the fix: `location.test.ts` › "still lets real US evidence win when
      a posting is open in two countries".

## 2. Fix

- [ ] 2.1 `artifacts/api-server/src/lib/new-grad/location.ts`: split the US patterns into strong
      and weak (the bare state code); order strong US → foreign → weak US → unknown; add `sf`,
      `nyc` to the US city pattern; update the header comment's "US wins a tie" to say it is
      real US evidence that wins. Proof: 1.1 GREEN, 1.2 still green, the four pre-existing cases
      in `location.test.ts` still green.

## 3. Verify

- [ ] 3.1 `pnpm --filter @workspace/api-server test` — whole suite green, including
      `routes/internships.test.ts` and `routes/new-grad.test.ts` untouched.
- [ ] 3.2 `pnpm run typecheck` clean.
- [ ] 3.3 Re-run the 6,000-row measurement against the fixed reader: exactly 54 rows
      `us` → `elsewhere` and 26 `unknown` → `us`, nothing else moved. Record the numbers in
      the change's closing note.
- [ ] 3.4 replit.md working loop; note in replit.md where the location reader's rule is
      described (one line: strong US wins a tie, a bare state code does not).
