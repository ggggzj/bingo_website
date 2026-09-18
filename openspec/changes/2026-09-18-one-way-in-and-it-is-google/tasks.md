# Tasks — one-way-in-and-it-is-google

Five groups, each leaving the system working end to end.

**How each group is proven.** Groups 1–3 carry Vitest + supertest tests in
`artifacts/api-server`, the repo's convention. `artifacts/landing` **does** have a test runner
now (added by the dashboard-shell change; `Login.test.tsx` already exists and covers the form
this change removes), so group 4 carries React Testing Library tests too — and one thing it
cannot carry: the Google round trip itself needs a real client id and a real Google account, so
task 4.4 is a browser check and task 5.2 is the owner's.

## 1. Verification, behind a seam and off the network

Leaves the system working: the verifier exists and is tested; no route calls it yet.

- [x] 1.1 `artifacts/api-server/src/lib/auth/google.ts` — a `GoogleTokenVerifier` interface and
      its real implementation: read Google's discovery document for `jwks_uri`, fetch and cache
      the keys, verify RS256, and check `iss`, `aud` against `GOOGLE_CLIENT_ID`, `exp`, and
      `email_verified` (`design.md` §3). It returns verified claims or refuses; it never throws
      a raw library error at a route. An unset `GOOGLE_CLIENT_ID` refuses and logs the missing
      configuration. Pass the audience **explicitly** — it is the check that is skipped silently
      when the argument is left off.
- [x] 1.2 `artifacts/api-server/src/lib/auth/google.test.ts` — the checks above, against locally
      minted tokens signed with a throwaway key pair, never against Google. Tests:
      `a tampered payload is refused`, `the wrong aud is refused`, `an expired token is
      refused`, `email_verified false is refused`, `a missing client id is refused`,
      `a valid token yields the address Google signed`.

## 2. The contract

Leaves the system working: the route exists in the spec and in generated code; nothing serves it.

- [x] 2.1 `lib/api-spec/openapi.yaml` — `POST /auth/google`, taking a single `credential` string
      and answering the account body `/auth/login` answers plus a flag saying whether a password
      was cleared, or 401. **Run codegen in this task** — nothing else regenerates the hooks and
      Zod schemas.

## 3. The route, and the collision it has to resolve

Leaves the system working: Google sign-in works end to end from `curl`; the page does not offer
it yet.

- [ ] 3.1 `artifacts/api-server/src/routes/auth.ts` — `POST /auth/google` beside `/auth/login`,
      taking the verifier the way the router already takes the store. Verified claims → normalize
      the address → find or create (via `createPasswordlessUser`, which ticket 010 added) →
      `startSession` → `recordLogin` → the body `describe()` returns. The address comes from the
      claims; anything in the body is ignored. Rate-limited like its neighbours.
- [ ] 3.2 `artifacts/api-server/src/routes/auth.ts` — the collision rule (`design.md` §4): a
      Google sign-in onto an address that already holds a password clears that password,
      **unless the address is listed in `OWNER_EMAIL`**, and the response says so, so the page
      can tell the person. Clearing goes through a store method, not a raw query.
- [ ] 3.3 `artifacts/api-server/src/lib/auth/store.ts` + both implementations — the method 3.2
      needs to clear a password. `memory-store` and `drizzle-store` keep identical behaviour, as
      ticket 010 left them.
- [ ] 3.4 `artifacts/api-server/src/routes/auth.test.ts` — against `memory-store` and a fake
      verifier. Tests: `a new Google address gets an account and a session`, `the same address
      twice is one account`, `an address in the body is ignored`, `a password account meeting
      its Google owner loses its password`, `the owner keeps their password`, `a refused token
      creates nothing`.

## 4. The page

Leaves the system working: somebody can sign in with Google in a browser.

- [ ] 4.1 `artifacts/landing/index.html` — load `https://accounts.google.com/gsi/client`, with a
      `preconnect` beside the two font origins already there. First external script on the page;
      there is no CSP to widen (`design.md` §6).
- [ ] 4.2 `artifacts/landing/src/pages/Login.tsx` — the split page: the product's case and its
      trusted-by strip on the left, Google's own rendered button alone on the right. The tabs,
      the fields and `MIN_PASSWORD_LENGTH`'s use come off the default view. On success, forget
      the cached "who am I" and navigate to `/jobs`; show the "this account now signs in with
      Google" line when the response carries it.
- [ ] 4.3 `artifacts/landing/src/pages/Login.tsx` — `?password=1` renders the existing form,
      unchanged and unlinked; an unset `VITE_GOOGLE_CLIENT_ID` renders the form instead of a
      dead button (`design.md` §5, §6).
- [ ] 4.4 `artifacts/landing/src/pages/Login.test.tsx` — it currently proves the form; rewrite it
      for the new default view. Tests: `the sign-in page offers no password field`,
      `?password=1 renders the form`, `no client id falls back to the form`. **Do not delete the
      form's existing coverage** — move it under the `?password=1` case, or the fallback ships
      untested.
- [ ] 4.5 Verify in a browser against the dev server: `/login` shows one Google button and no
      password field, `/login?password=1` shows the form and still signs in, console and network
      clean, screenshots at 320px and desktop. **The Google round trip itself cannot be verified
      until 5.2 is done** — say so in the report rather than implying it was tested.

## 5. Say what changed, and what only the owner can do

- [ ] 5.1 `replit.md` — `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` in Environment. Under
      Architecture decisions: the ID-token flow rather than the redirect flow and why; the
      address rather than `sub` and what it costs; the collision rule with its `OWNER_EMAIL`
      exemption and the un-revoked sessions limit. Under Gotchas: `/login?password=1` is the
      unlinked fallback and is **not** a security boundary; one Google client serves both
      surfaces, so `aud` no longer separates them.
- [ ] 5.2 **Owner-run, not part of `/implement`.** In the Google console: add
      `http://localhost:5173` and `https://bingocareer.com` to Authorized JavaScript origins, and
      move the app from Testing to Production. Until both are done nobody can sign in, including
      the owner, and the failure reads like a bug. Left unticked until the owner confirms; if the
      change is archived first, this becomes a `.harness/session-todos/` item rather than a tick.
