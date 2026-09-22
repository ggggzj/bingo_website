# Tasks — fix-google-signin-skips-the-owner-list

Repro committed RED at `51028db`: three tests in `artifacts/api-server/src/routes/auth.test.ts`.
Baseline before them, 36 of 36 green in that file; with them, 3 failed / 36 passed.

## 1. The seam, and the memory side

- [ ] 1.1 Add `recordProvenAddress(email: string, now: Date): Promise<void>` to `AuthStore`
      in `artifacts/api-server/src/lib/auth/store.ts`, with the doc comment saying what the
      two rows are for and that no mail is sent.
- [ ] 1.2 Implement it in `InMemoryAuthStore`, exposing `provenAddresses` and
      `provenRecordCount` — the surfaces the repro tests already read. Idempotent per address.
- [ ] 1.3 Close this group with the replit.md working loop before group 2 starts.

## 2. The route

- [ ] 2.1 In `artifacts/api-server/src/routes/auth.ts`, call `store.recordProvenAddress(email, now)`
      in `POST /google` after the identity is settled and before `startSession`, so a failure
      cannot leave a session without a list entry.
      Proven by all three repro tests going green, and by the 36 existing ones staying green —
      especially "a refused token creates nothing and leaves no session", which is what says
      the call sits after the verifier rather than before it.
- [ ] 2.2 Close this group with the working loop.

## 3. The Postgres side

- [ ] 3.1 Implement `recordProvenAddress` in `DrizzleAuthStore` as raw SQL through the existing
      client — no new entry in `lib/db/src/schema/`, per the proposal's decision (a).
      `registrations` guarded by `NOT EXISTS (email = $1 AND client_id IS NULL)`;
      `email_verifications` upserted on its unique `email`, `verified_at` set only when null,
      `last_verified_at` always.
- [ ] 3.2 Add a contract test beside the existing drizzle contract test, running against
      `COACH_TEST_DATABASE_URL`, that proves the two statements are idempotent and that the
      column names are real. This is the only place the raw SQL is checked by a machine
      rather than by reading; the proposal's decision (a) is paid for here. If that scratch
      database cannot be reached, say so and leave this task open rather than ticking it.
- [ ] 3.3 Close this group with the working loop.

## 4. Verify and close

- [ ] 4.1 Run the api-server suite. Paste the real output. The 36 existing auth tests must be
      green without amendment.
- [ ] 4.2 Run `pnpm -w typecheck` (or the repo's equivalent) — the seam gained a method, so
      every `AuthStore` implementer must still compile.
- [ ] 4.3 Update `replit.md`: the "User preferences" note on `users.password_hash` already
      explains the password-less identity; add beside it that such an identity is also recorded
      in `registrations` and `email_verifications`, tables this repo shares but does not own.
- [ ] 4.4 Retire `../h1_checker/.harness/session-todos/2026-09-21-website-google-signin-skips-the-owner-list.md`
      — it exists to point here, and this change closes it. That file is in the other repo, so
      it is a separate commit there, not part of this change's PR.
