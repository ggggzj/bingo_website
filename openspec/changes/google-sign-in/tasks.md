# Tasks — google-sign-in

Five groups, each leaving the system working end to end.

**How each group is proven.** `replit.md` records the convention: Vitest + supertest,
api-server only. Groups 1–4 carry Vitest tests in
`artifacts/api-server/src/routes/auth.test.ts`, the file that already tests these routes
against `memory-store`. `artifacts/landing` still has no test runner (adding one is ticket
008's job, not this change's), so group 5 is proven in a real browser against the dev server:
drive the page, read the DOM, check the console and the network calls, capture a screenshot.
Same split the jobs-page change used, for the same reason.

## 1. A password-less identity becomes representable

Leaves the system working: the column and the types admit a null, nothing creates one yet, and
every existing behaviour is unchanged.

- [ ] 1.1 `lib/db/src/schema/auth.ts` — drop `.notNull()` from `passwordHash`, and replace the
      comment above it: the column is nullable because an identity proven by Google has no
      password. Note in the same comment that `.harness/backlogs/018` needs this line too and
      inherits it from here.
- [ ] 1.2 `artifacts/api-server/src/lib/auth/store.ts` — `UserRecord.passwordHash` becomes
      `string | null`; `createUser` gains a sibling that creates a user without a password, and
      the interface gains a way to clear one. Document on the interface why clearing exists
      (proposal §3), so the next reader does not find it and delete it as dead weight.
- [ ] 1.3 `artifacts/api-server/src/lib/auth/memory-store.ts` — implement both, keeping the
      in-memory shape identical to the drizzle one.
- [ ] 1.4 `artifacts/api-server/src/lib/auth/drizzle-store.ts` — implement both.
- [ ] 1.5 `artifacts/api-server/src/routes/auth.test.ts` — **pin the accident**: a password-less
      account refused by `POST /auth/login` with the same body as a wrong password, and
      `verifyPassword` still called. Test: `a password-less account is refused like any other`.
      The route needs no edit (design §4) — this test is what makes that deliberate.

## 2. The contract

Leaves the system working: the route exists in the spec and in generated code; nothing serves
it yet.

- [ ] 2.1 `lib/api-spec/openapi.yaml` — `POST /auth/google`, taking a single `credential`
      string and answering the same account body `/auth/login` answers, plus 401.
      **Run codegen in this task** — nothing else regenerates the hooks and Zod schemas.

## 3. Verification, behind a seam and off the network

Leaves the system working: the verifier exists and is tested; no route calls it yet.

- [ ] 3.1 `artifacts/api-server/src/lib/auth/google.ts` — a `TokenVerifier` interface and its
      real implementation: read Google's discovery document for `jwks_uri`, fetch and cache the
      keys, verify RS256, and check `iss`, `aud` against `GOOGLE_CLIENT_ID`, `exp`, and
      `email_verified`. It returns verified claims or refuses; it never throws a raw library
      error at a route. An unset `GOOGLE_CLIENT_ID` refuses and logs the missing configuration.
- [ ] 3.2 `artifacts/api-server/src/lib/auth/google.test.ts` — the checks above, against locally
      minted tokens signed with a throwaway key pair, not against Google. Tests:
      `a tampered payload is refused`, `the wrong aud is refused`, `an expired token is
      refused`, `email_verified false is refused`, `a missing client id is refused`.

## 4. The route, and the collision it has to resolve

Leaves the system working: Google sign-in works end to end from `curl`; the page does not offer
it yet.

- [ ] 4.1 `artifacts/api-server/src/routes/auth.ts` — `POST /auth/google` beside `/auth/login`,
      taking the verifier the way the router already takes the store. Verified claims → normalize
      the address → find or create the account → `startSession` → `recordLogin` → the same body
      `describe()` returns. The address comes from the claims; anything in the body is ignored.
      Rate-limited like its neighbours.
- [ ] 4.2 `artifacts/api-server/src/routes/auth.ts` — the collision rule (design §3): a Google
      sign-in onto an address that already holds a password clears that password, **unless the
      address is listed in `OWNER_EMAIL`**, and the response says the account now signs in with
      Google so the page can show it.
- [ ] 4.3 `artifacts/api-server/src/routes/auth.test.ts` — the behaviours of 4.1 and 4.2 against
      `memory-store` and a fake verifier. Tests: `a new Google address gets an account and a
      session`, `the same address twice is one account`, `an address in the body is ignored`,
      `a password account meeting its Google owner loses its password`, `the owner keeps their
      password`, `a refused token creates nothing`.

## 5. The page

Leaves the system working: somebody can sign in with Google in a browser.

- [ ] 5.1 `artifacts/landing/src/pages/Login.tsx` — the Google control becomes the page: the
      tabs, the fields and the form come off the default view. On success, forget the cached
      "who am I" and navigate to `/jobs` (owner decision). The response's "this account now signs
      in with Google" is shown rather than swallowed.
- [ ] 5.2 `artifacts/landing/src/pages/Login.tsx` — `?password=1` renders the existing form,
      unchanged and unlinked (design §8). When `VITE_GOOGLE_CLIENT_ID` is unset the Google control
      is not rendered at all and the form is shown instead — a control that cannot work is worse
      than no control, and a page with neither is a dead end.
- [ ] 5.3 Verify in the browser against the dev server: sign in with Google end to end, confirm
      the session cookie and that `/account` names the address; confirm `/login` shows no password
      field and `/login?password=1` does and still signs in; check the console and network for
      errors; capture a screenshot at 320px and at desktop width.

## 6. Say what changed

- [ ] 6.1 `replit.md` — the `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` rows in Environment;
      under Architecture decisions, why the ID-token flow rather than the redirect flow, why the
      address rather than `sub`, and the collision rule with its `OWNER_EMAIL` exemption. Under
      Gotchas: the two owner-only console actions, and that sign-in fails until the app leaves
      Testing.
