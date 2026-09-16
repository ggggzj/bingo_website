# Tasks — drop-waitlist

Six groups, each leaving the site working end to end. A removal has one ordering trap:
delete a thing before its last user stops using it and the build breaks in between. Every
group here removes a *usage* before the thing it used, so no commit is broken.

**How each group is proven.** Server groups use the existing Vitest + supertest suite;
web groups use the Vitest + Testing Library suite installed by `dashboard-shell`. Two
groups are proven by a test that must be *written* rather than one that exists — a
deletion has no natural assertion, so the assertion is "the page no longer offers it" and
"the route no longer answers", both of which have to be stated somewhere to be a
regression test at all.

**One file, one task.** `openspec/config.yaml` forbids two tasks writing the same file.
`replit.md` is edited once, in group 5.

## 1. The page stops offering it

Leaves the system working: the home page ends with the Chrome call to action and nothing
else changes. `WaitlistForm.tsx` still exists and still compiles; it is now imported by
nobody, which is the state group 3 cleans up.

- [x] 1.1 `artifacts/landing/src/pages/Home.tsx` — the last section loses its heading,
      both paragraphs and `<WaitlistForm />`, and the `WaitlistForm` import goes with
      them. The Chrome link stays and becomes the section's content rather than a
      footnote under a form, so it is laid out as the closing action (drop the `mt-10`
      that spaced it away from the box). Proven by new
      `artifacts/landing/src/pages/Home.test.tsx`: the page renders no email input, no
      "Keep me posted" control and no text about a mailing list, and the Chrome link is
      present and points at `CHROME_STORE_URL`. That last assertion is the one that
      matters — without it the test passes just as well on a page that failed to render.

## 2. The harness proof moves before its holder goes

Leaves the system working: no product behavior changes at all. This group exists only so
that no commit in this change has a test suite without a real generated-mutation-hook
test in it.

- [x] 2.1 New `artifacts/landing/src/pages/Login.test.tsx` — takes over what
      `WaitlistForm.test.tsx` was chosen to prove (`dashboard-shell` tasks.md 2.2): a
      component under the query client, a generated mutation hook issuing a real request
      through the custom fetch mutator, and a typed user event. Two cases, the same pair
      the waitlist test held: a successful sign-in posts the credentials it was given and
      leaves the login page, and a refused sign-in keeps the form and shows the server's
      own reason. MSW answers `POST /api/auth/login`; the generated `useLogIn` hook runs
      for real.

## 3. The component goes

Leaves the system working: nothing references the form, and the suite that proves the
harness works is green without it.

- [x] 3.1 Delete `artifacts/landing/src/components/WaitlistForm.tsx` and
      `artifacts/landing/src/components/WaitlistForm.test.tsx`. Proven by the full
      landing suite (`pnpm --filter @workspace/landing run test`) and `pnpm run
      typecheck` — an import left behind anywhere fails the typecheck, which is the whole
      assertion a deletion can carry.

## 4. The API stops offering it

Leaves the system working: the contract, the generated clients and the server agree that
there is no such path.

- [x] 4.1 `lib/api-spec/openapi.yaml` — remove the `/waitlist` path, the `waitlist` tag
      from the tag list, and the `WaitlistInput` and `WaitlistEntry` schemas. Leave
      `ErrorResponse` alone; thirty other responses reference it. **Run codegen in this
      task** — nothing else regenerates the hooks and Zod schemas. Proven by: no file
      under `lib/api-client-react/src/generated` or `lib/api-zod/src/generated` matches
      `waitlist` case-insensitively, and `pnpm run typecheck` passes across the
      workspace.
- [ ] 4.2 `artifacts/api-server/src/routes/index.ts` — drop the `waitlistRouter` import
      and its `router.use("/waitlist", …)` mount; delete
      `artifacts/api-server/src/routes/waitlist.ts`. Proven by new
      `artifacts/api-server/src/routes/index.test.ts`, which mounts the real aggregate
      router the way `app.ts` does and asserts `POST /api/waitlist` answers 404 — **with
      `GET /api/healthz` answering 200 in the same test as the control.** Without that
      control the 404 assertion passes on an app that never mounted, which is the way
      this exact test is usually wrong.

## 5. The record stops describing it

Leaves the system working: the documentation and the code comments stop pointing at
files that do not exist.

- [ ] 5.1 `replit.md` — three places. "DB schema, source of truth" drops `waitlist.ts`
      from its file list. The auth-store architecture decision cites `routes/waitlist.ts`
      as the counter-example of a route that reaches for `db` directly; it needs a route
      that still exists (`routes/jobs.ts` does the same thing) or the clause removed. The
      description of what the site is drops the waitlist sentence. Then append to
      "Architecture decisions" why the feature was removed rather than hidden: zero rows
      after four months, nothing reading the table, and a dead form as the last thing a
      visitor sees.
- [ ] 5.2 `artifacts/api-server/src/lib/auth/store.ts` — the doc comment names the
      waitlist route as the thing auth deliberately does not do. Same fix as in
      `replit.md`: name a route that exists, or drop the comparison. No interface or
      behavior change; the auth tests are untouched and must stay green.

## 6. The table

Leaves the system working: the schema describes the database the code actually uses.

- [ ] 6.1 Delete `lib/db/src/schema/waitlist.ts` and its `export * from "./waitlist"`
      line in `lib/db/src/schema/index.ts`. Proven by `pnpm run typecheck` and the full
      api-server suite — `store.contract.test.ts` imports `@workspace/db/schema` as a
      namespace and would fail to compile against a broken index.
- [ ] 6.2 **Owner-run, not part of `/implement`.** After the API deploy lands, the owner
      drops the production table: `railway link` → service `bingo_website`,
      `railway connect Postgres-EBWW`, then `drop table waitlist;`. Not `db run push` —
      see the proposal for why. Left unticked until the owner confirms it is done; if the
      change is archived before then, it goes to `.harness/session-todos/` instead of
      being ticked.
