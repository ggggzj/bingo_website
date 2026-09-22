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
- [x] 3.2 **Written, and run green against a real Postgres.** First reported as "written,
      never run": `COACH_TEST_DATABASE_URL` was unset, so the file skipped. Rather than leave
      it there, a throwaway Postgres was brought up in the session scratchpad; the recipe is
      now in `replit.md`, because two of its traps cost real time — `LC_ALL` unset kills the
      postmaster on macOS naming no cause, and a socket directory under a long path fails at
      103 bytes.

      ```
      Test Files  14 passed (14)
           Tests  163 passed (163)
      ```

      Nothing skipped: this change's contract test and the six pre-existing coach ones, all
      running for the first time on this machine.

      **What running it changed.** The proposal's decision (a) argued from `db run push`
      reconciling a stale declaration. Running it proved that cannot happen —
      `lib/db/drizzle.config.ts` already throws on `push`, with this same argument reached
      first and independently. The decision survives on the path that guard recommends
      instead: `generate` emits DDL for everything the schema declares. `design.md` carries
      the correction rather than a rewrite of the reasoning.

      What the test still cannot check is that the column names match the real tables, since
      it creates its own. Those were read off the production schema on 2026-09-21 —
      `registrations` four columns, `email_verifications` six, `ix_email_verifications_email`
      unique, so `ON CONFLICT (email)` has an index to land on.

- [x] 3.3 Close this group with the working loop.

## 4. Verify and close

- [x] 4.1 Run the api-server suite. Paste the real output. The 36 existing auth tests must be
      green without amendment.

      ```
      Test Files  14 passed (14)
           Tests  163 passed (163)
      ```

      Run with the repo's own runner, `pnpm --filter @workspace/api-server run test`. An
      earlier attempt used `npx vitest`, which installed its own vitest, missed the config
      that pins `DATABASE_URL` to a dummy, and reported two files as failing — a defect in
      how it was run, not in the code. Worth writing down: the same mistake will read as two
      broken test files to whoever makes it next.

      That is the run with a scratch Postgres configured (task 3.2). The first read
      `13 passed | 1 skipped` — green, while two contract files had never executed. Worth
      keeping: a silently-skipping contract test is how a suite reads green while the code it
      covers has never run once.
- [x] 4.2 Run `pnpm -w typecheck` (or the repo's equivalent) — the seam gained a method, so
      every `AuthStore` implementer must still compile.
- [x] 4.3 Update `replit.md`: the "User preferences" note on `users.password_hash` already
      explains the password-less identity; add beside it that such an identity is also recorded
      in `registrations` and `email_verifications`, tables this repo shares but does not own.
- [ ] 4.4 Retire `../h1_checker/.harness/session-todos/2026-09-21-website-google-signin-skips-the-owner-list.md`
      — **when this change merges, not now.** The todo describes a defect that is still live in
      production until then, and deleting it while the fix sits on a branch would leave the
      only written record of an open hole pointing at nothing. Amended 2026-09-21: the todo now
      carries a line naming this change, so a reader knows work is in flight. That file is in
      the other repo and its amendment is a separate commit there, on that repo's open PR.
