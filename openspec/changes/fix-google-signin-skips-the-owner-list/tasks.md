# Tasks — fix-google-signin-skips-the-owner-list

Repro committed RED at `51028db`: three tests in `artifacts/api-server/src/routes/auth.test.ts`.
Baseline before them, 36 of 36 green in that file; with them, 3 failed / 36 passed.

## 1. The seam, and the memory side

- [x] 1.1 Add `recordProvenAddress(email: string, now: Date): Promise<void>` to `AuthStore`
      in `artifacts/api-server/src/lib/auth/store.ts`, with the doc comment saying what the
      two rows are for and that no mail is sent.
- [x] 1.2 Implement it in `InMemoryAuthStore`, exposing `provenAddresses` and
      `provenRecordCount` — the surfaces the repro tests already read. Idempotent per address.
- [x] 1.3 Close this group with the replit.md working loop before group 2 starts.

## 2. The route

- [x] 2.1 In `artifacts/api-server/src/routes/auth.ts`, call `store.recordProvenAddress(email, now)`
      in `POST /google` after the identity is settled and before `startSession`, so a failure
      cannot leave a session without a list entry.
      Proven by all three repro tests going green, and by the 36 existing ones staying green —
      especially "a refused token creates nothing and leaves no session", which is what says
      the call sits after the verifier rather than before it.
- [x] 2.2 Close this group with the working loop.

## 3. The Postgres side

- [x] 3.1 Implement `recordProvenAddress` in `DrizzleAuthStore` as raw SQL through the existing
      client — no new entry in `lib/db/src/schema/`, per the proposal's decision (a).
      `registrations` guarded by `NOT EXISTS (email = $1 AND client_id IS NULL)`;
      `email_verifications` upserted on its unique `email`, `verified_at` set only when null,
      `last_verified_at` always.
- [ ] 3.2 **Written, never yet run — `COACH_TEST_DATABASE_URL` is not set on this machine, so
      it skips.** Left open deliberately, as this task's own last line instructs. The file is
      `artifacts/api-server/src/lib/auth/proven-address.contract.test.ts`; point that variable
      at a scratch Postgres and it runs.

      What was done instead, and what it is worth: the two statements' column names were read
      straight off the production schema on 2026-09-21 — `registrations` has four columns
      (`id`, `email`, `client_id`, `created_at`), `email_verifications` has six, and
      `ix_email_verifications_email` is unique, so `ON CONFLICT (email)` has an index to land
      on. `gen_random_uuid()` and `sha256()` both evaluate there without `pgcrypto`. That is
      evidence the statements match reality today, and it is not a test: nothing re-checks it
      when h1_checker next changes those tables.

      Original task follows.

- [ ] 3.2-original Add a contract test beside the existing drizzle contract test, running against
      `COACH_TEST_DATABASE_URL`, that proves the two statements are idempotent and that the
      column names are real. This is the only place the raw SQL is checked by a machine
      rather than by reading; the proposal's decision (a) is paid for here. If that scratch
      database cannot be reached, say so and leave this task open rather than ticking it.
- [x] 3.3 Close this group with the working loop.

## 4. Verify and close

- [x] 4.1 Run the api-server suite. Paste the real output. The 36 existing auth tests must be
      green without amendment.

      ```
      Test Files  13 passed | 1 skipped (14)
           Tests  156 passed | 7 skipped (163)
      ```

      Run with the repo's own runner, `pnpm --filter @workspace/api-server run test`. An
      earlier attempt used `npx vitest`, which installed its own vitest, missed the config
      that pins `DATABASE_URL` to a dummy, and reported two files as failing — a defect in
      how it was run, not in the code. Worth writing down: the same mistake will read as two
      broken test files to whoever makes it next.

      The skipped file is this change's own `proven-address.contract.test.ts` (task 3.2),
      plus the six pre-existing coach contract skips.
- [x] 4.2 Run `pnpm -w typecheck` (or the repo's equivalent) — the seam gained a method, so
      every `AuthStore` implementer must still compile.
- [x] 4.3 Update `replit.md`: the "User preferences" note on `users.password_hash` already
      explains the password-less identity; add beside it that such an identity is also recorded
      in `registrations` and `email_verifications`, tables this repo shares but does not own.
- [ ] 4.4 Retire `../h1_checker/.harness/session-todos/2026-09-21-website-google-signin-skips-the-owner-list.md`
      — it exists to point here, and this change closes it. That file is in the other repo, so
      it is a separate commit there, not part of this change's PR.
