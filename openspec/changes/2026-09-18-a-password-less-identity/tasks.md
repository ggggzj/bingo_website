# Tasks — a-password-less-identity

Three groups, each leaving the system working end to end. Tests are Vitest + supertest in
`artifacts/api-server`, the repo's convention; nothing here touches the web app.

## 1. The column stops insisting

Leaves the system working: the declaration allows a null, every reader still receives a string
because nothing writes one yet.

- [ ] 1.1 `lib/db/src/schema/auth.ts` — drop `.notNull()` from `passwordHash`, and replace the
      comment above it: the column is nullable because an identity proven by Google has no
      password, and the database this repo is merging into already permits it. Name
      `.harness/backlogs/018` as the ticket that moves those rows, so the next reader knows why
      a nullable column currently has no nulls in it.

## 2. The seam admits it, and the compiler finds every reader

Leaves the system working: types and both stores agree with the column; no behaviour changes.

- [ ] 2.1 `artifacts/api-server/src/lib/auth/store.ts` — `UserRecord.passwordHash` becomes
      `string | null`. Add a way to create a user with no password, **separate from**
      `createUser` rather than an optional parameter (design §2), documented with why it is
      separate.
- [ ] 2.2 `artifacts/api-server/src/lib/auth/drizzle-store.ts` — `toRecord`'s row type follows,
      and the new creation path. Nothing else in this file should need to change; if the
      compiler asks for more, that is a reader worth reading before silencing.
- [ ] 2.3 `artifacts/api-server/src/lib/auth/memory-store.ts` — the same, keeping the in-memory
      shape identical to the drizzle one so the tests keep proving the same thing.
- [ ] 2.4 `pnpm run typecheck` passes with no `as` casts and no non-null assertions added. An
      assertion here would put the comfortable lie back one layer down.

## 3. Pin what is already true, so a refactor cannot quietly undo it

Leaves the system working: no production code changes in this group.

- [ ] 3.1 `artifacts/api-server/src/lib/auth/password.test.ts` — `verifyPassword` returns
      `false` and does not throw for an empty stored value, and for a couple of other
      unreadable ones. Test: `an unreadable stored value is refused rather than thrown`.
      Comment it with *why* this matters now: once the type allows null, `?? DECOY_HASH` is the
      only thing between this function and a null, and both are easy to "simplify".
- [ ] 3.2 `artifacts/api-server/src/routes/auth.test.ts` — signing in with any password against
      a password-less account answers **the same status and the same body** as a wrong password
      against a real one, asserted against each other rather than against a literal. Test:
      `a password-less account is refused exactly like a wrong password`.
- [ ] 3.3 `artifacts/api-server/src/routes/auth.test.ts` — a password-less user round-trips
      through the store: created, found by email, and reached through a live session, with
      `/auth/me` answering normally. Test: `a password-less identity is a working identity`.
- [ ] 3.4 Run both suites. Existing behaviour for accounts **with** a password is unchanged —
      that is the regression this group's green run proves, and it is why no existing test is
      edited.

## 4. Say what changed

- [ ] 4.1 `replit.md` — under Architecture decisions: the column is nullable, why (a Google
      identity has no password, and the surviving database already permits it), and that the
      two mechanisms which make it safe are `verifyPassword`'s refusal of unreadable values and
      `?? DECOY_HASH` at the call site — with the note that removing either is what the new
      tests exist to catch. Under Gotchas or Run & Operate: the schema push is a separate,
      deliberate deploy step, safe in this direction because every existing row has a password.
