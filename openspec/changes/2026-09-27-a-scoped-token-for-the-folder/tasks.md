# Tasks — a-scoped-token-for-the-folder

Each group leaves the system working end to end. Close each with the `replit.md` working loop.

## 1. A token can carry a scope, and every token that exists keeps its own

- [x] 1.1 Add `scope` to `coachApiTokensTable` in `lib/db/src/schema/coach.ts`: `text`, not null,
      default `'coach'`, with the comment saying why the table's name is now stale and why it is
      not being renamed. `generate`, read the SQL, record it as `1-add-token-scope.sql`.
- [x] 1.2 `createToken` takes a scope; `findUserByLiveToken` takes the scope it requires and
      matches on it. **Wider than this task said, and deliberately:** the three methods were
      *moved* off `CoachStore` into `lib/tokens/` rather than extended in place, because the
      applications routes would otherwise have had to depend on the coach's store to check a
      credential. One mechanism, two callers — not two implementations reading one table. Proven in `coach/store.contract.test.ts`: a token issued for `coach` does not
      resolve when `applications` is required, and every pre-existing row reads as `coach`.

## 2. Issuing, owner-only, session-only

- [x] 2.1 `POST /tokens` and `DELETE /tokens` in `lib/api-spec/openapi.yaml`, with the scope in the
      body, **and codegen in this same task**.
- [x] 2.2 `artifacts/api-server/src/routes/tokens.ts`: session cookie only — a bearer may not mint
      a token — owner-only, 404 otherwise, plaintext returned exactly once. Proven in
      `tokens.test.ts`: a bearer token is refused at issuing; a non-owner gets 404; issuing twice
      revokes the first.

## 3. The applications routes accept a scoped token

- [x] 3.1 A gate beside `lib/coach/auth.ts`'s, resolving session **or** a bearer whose scope is
      `applications`, answering the same uniform 404. Proven in `applications.test.ts`: a valid
      coach-scoped token gets 404 on `PATCH /applications/{id}`, an applications-scoped one
      succeeds, and a revoked one gets 404.
- [x] 3.2 Writes arriving by token record `hand: 'script'`. Proven in
      `applications/store.contract.test.ts`: the trail distinguishes the two hands on the same row.

## 4. The folder can call it

- [ ] 4.1 `~/Desktop/job_dashboard/scripts/update_status.py` — reads the token from `account.env`,
      PATCHes one application by key, prints what changed. No token: one line, exit zero.
- [ ] 4.2 The folder's README gains the one line that makes this usable: what to say to Claude
      when a rejection email arrives.

## 5. Say what changed

- [ ] 5.1 `replit.md`: the scope column and its default, the two issuing routes, and the fact that
      a coach token cannot write an application. Append the scope-as-column decision to
      "Architecture decisions" with the two shapes that were rejected.
- [ ] 5.2 `.harness/backlogs/025` to built, with a pointer here.
