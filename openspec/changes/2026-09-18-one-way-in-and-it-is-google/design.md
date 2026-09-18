# Design — one-way-in-and-it-is-google

## 1. The ID-token flow, not the redirect flow — and simplify.jobs took the other one

Two ways to accept a Google sign-in, and the reference product uses the one we are not using.
Read off simplify.jobs' own login page on 2026-09-17: its buttons call
`/v2/auth/oauth/google/login`, `/v2/auth/oauth/linkedin/login` and `/v2/auth/oauth/apple/login`
on its own backend, which redirects to Google and is redirected back to `/auth/oauth`. That is
the **authorization-code redirect flow**: a registered redirect URI, a client secret, a code
exchanged for tokens.

They need it. Their bundle also carries `/v2/auth/oauth/gmail/login` — a *separate* Google flow,
which is how a tracker learns an interview was scheduled, and which is only worth building if
you hold a refresh token and have passed Google's review for a restricted scope.

We need none of that. Taking only `email`, `profile` and `openid`, the **ID-token flow** is
strictly less machinery: no redirect URI, no client secret, and **no Google review** — those
three scopes are non-sensitive, so the only console step is moving the app from Testing to
Production. Verified against Google's own documentation on 2026-09-12 by
`../h1_checker/.harness/backlogs/014` rather than from memory.

**Read the discovery document; do not hardcode the JWKS URL.** Google publishes
`https://accounts.google.com/.well-known/openid-configuration` for exactly this reason, and a
rotated key behind a stale URL is an outage nothing in this repo would explain.

## 2. Why verification lands here, and the correction that changed the reason

Ticket 011 recommends posting the token to h1_checker's already-live `/auth/google`, because
*"every identity this page creates in this repo's database is a row somebody has to move by hand
later"*. Checked on 2026-09-18, and it does not hold:

- **`sessions.user_id` has a foreign key to this repo's `users`** (`lib/db/src/schema/auth.ts`,
  `onDelete: "cascade"`). A signed-in browser on this origin needs a row in *this* database
  whoever verified the token. Verification and identity are separable; session and identity are
  not.
- **h1_checker's `/auth/google` creates a row on its side too.** So that route yields **two**
  rows per person, not one — the opposite of what its reason claims.
- **Its CORS would refuse the browser anyway.** `main.py:112` allows `chrome-extension://.*`,
  `https://linkedin.com` and `https://www.linkedin.com`, with `allow_credentials=False`. The
  page cannot post there directly; it would take a server-to-server proxy through this API — no
  CORS problem, but a second hop in the sign-in path and possibly a third shared secret
  (`API_KEY`, enforced only when set).

What (b) genuinely buys is **one verifier** — one place that can be wrong about who somebody is
— and that is a real benefit this change gives up. It is bounded: the two verifiers check the
same four claims against the same published keys, and after the merge (`018`) one of them can
go. The owner chose to verify here on 2026-09-18 having been shown all of the above.

## 3. What the server checks, and what it refuses

The page hands over a string. All of this is checked server-side before any row is read or
written; failing any of it is one answer, `401`, with nothing created:

- **Signature**, against Google's current published keys (RS256).
- **`iss`** is `https://accounts.google.com`.
- **`aud`** equals this deployment's `GOOGLE_CLIENT_ID`. A token minted for another application
  — including this product's own extension client — is not a sign-in here. h1_checker's
  implementation passes the audience **explicitly**, and its ticket notes that this is the check
  skipped silently when the argument is left off. Same here.
- **`exp`** has not passed.
- **`email_verified` is true.** Google will assert an address it has not verified for some
  account types, and an unverified address from Google proves no more than a typed one.

The address is then `normalizeEmail(claims.email)` — the trim-and-lowercase every other route
uses.

### Keyed on the address, not on Google's `sub`

`sub` is the stable identifier and an address can change; keying on `sub` is the textbook
answer. This product cannot use it. `OWNER_EMAIL` is an address, `018` merges two databases **by
address**, the extension's identities are addresses, and `isOwner()` reads configuration rather
than a row. One of those would have to become a lie.

So the address identifies the person, and the cost is recorded: somebody who changes the address
on their Google account arrives as a new person. At this size that is a support question, and
`sub` can be stored alongside later without moving anything.

## 4. Two doors, one address — proof beats a claim

`POST /auth/register` is open and **does not verify the address**; that is why it reserves
`OWNER_EMAIL` (`routes/auth.ts:99` — *"sign-up is open and an address is not verified"*). So a
password row on `alice@gmail.com` is a **claim** on that address. A Google sign-in is **proof**
of it.

Note what decision 1 does to this: with no form on the page, a password row can now only be
created by posting to the route directly. That makes such a row rarer and, when it appears,
more deliberate — it does not make it more trustworthy.

Three landings were on the table, and this is the one place this change could let someone into
an account that is not theirs:

1. **Sign in, and clear the password.** Proof beats claim; whoever set the password loses the
   way in.
2. Sign in, leave it. An unverified password and a verified login share one account forever.
3. Refuse. Safe, and a dead end the person cannot fix.

**Chosen: 1**, with one exemption and one limit.

- **`OWNER_EMAIL` is exempt.** That password is a deliberate recovery path (owner, 2026-09-17,
  reaffirmed when the page lost its form). Without the exemption the first thing this ships in
  production is the deletion of the only fallback it was told to keep.
- **Sessions already open on a cleared account are not revoked.** Revoking is safer and is not
  this change's call — it would sign the legitimate owner out of their other browser as a side
  effect of signing in. A known limit, recorded rather than decided quietly.
- The person is told, on the page they land on, that the account now signs in with Google.
  Silently revoking a credential is how a support question becomes a bug report.

Email verification would dissolve the whole question — a mailed link proves exactly what Google
proves — and it is unavailable until the merge, because this service cannot send mail at all
(`ROADMAP.md` 第二步 1.5).

## 5. What decision 1 costs, and where the fallback went

`POST /auth/login` stays served, tested and working. Nine identities hold passwords and the
owner's is one of them; it is the way into the growth dashboard when Google's own configuration
is wrong — the app still in Testing, an origin not yet added, a client id typo'd into one of its
two environment variables.

The page does not mention it. That is the owner's decision and the cost is real: somebody who
has a password sees a page that offers them nothing. Two things keep that from being a dead end:

- **`/login?password=1` renders the existing form**, linked from nowhere. One conditional, not a
  second route. It is **not a security boundary and must not be built as one** — the routes are
  rate-limited and answer 401 the same either way; the parameter hides a form from people who
  are not looking for it. Anyone reading the page's JavaScript finds it, which is fine: an
  attacker who wanted the password endpoint never needed the form.
- **`replit.md` records it**, so the fallback survives the next person who reads only the page.

## 6. The page, and why the button is Google's own

The screenshots are the specification for the layout: the product's case and its trusted-by
strip on the left, the way in on the right. Decision 1 empties the right-hand side down to one
control.

**The button is rendered by Google's library, not drawn here.** A hand-drawn button asking for a
Google address is the shape of a phishing page even when the intent is honest, and Google's
identity library is the only thing that can hand the page a real ID token anyway. It loads from
`https://accounts.google.com/gsi/client`; `artifacts/landing/index.html` carries no CSP and no
external scripts today, so this is the first one — the proposal's task list adds it with
`preconnect` beside the two font origins already there.

**When `VITE_GOOGLE_CLIENT_ID` is unset the button is not rendered at all**, and the page shows
the email form instead of nothing. A control that cannot work is worse than no control; a page
with neither is a dead end.

## 7. Verification behind a seam, because the suite must not call Google

`AuthStore` exists so the tests run the real routes, the real hashing and the real cookies
against memory. A route that reached Google would undo that for the one area this repo says is
worth testing hardest.

So the route takes a verifier the way it takes a store: one method, token in, verified claims or
a refusal out. The real one reads the discovery document, fetches and caches Google's keys, and
checks every claim in §3. The test one returns fixed claims and can be told to refuse. No HTTP
mocking, no network.

## 8. The client id is two environment variables, and they fail loudly

The server checks `aud` against `GOOGLE_CLIENT_ID`; the page needs the same value at build time
as `VITE_GOOGLE_CLIENT_ID`. One value in two places is a drift hazard, and the mitigation is
that drift is not silent: a mismatch fails every sign-in immediately on `aud`, in development,
with an error naming the claim. An endpoint serving the id to the page would remove the
duplication and add a round trip to every page load, for a value that is public by design and
changes approximately never.

## 9. Two console actions belong to the owner, and neither is code

1. Add **`http://localhost:5173`** and **`https://bingocareer.com`** to Authorized JavaScript
   origins on the extension's existing client
   (`1069740098250-jg66jfblauhtkk6hg497fuukbpqd9vdd`) — owner's decision 2026-09-17: one client,
   two origins, one consent-screen identity.

   **One consequence, recorded rather than re-opened.** With a shared client id, `aud` no longer
   distinguishes this site from the extension: a token minted for one is valid at the other.
   Both are this product's own surfaces and after `018` they resolve to one identity, so the
   blast radius is a token replayed between two places that would each sign the same person in
   — small, but it means §3's audience check stops being a boundary *between the surfaces* while
   remaining one against every other application. A separate client would keep that boundary and
   costs one console form; revisit it only if the two surfaces ever stop being equivalent.
2. Move the app from **Testing** to **Production**. Until then only listed test users can sign
   in, and the failure reads like a bug rather than a configuration state.

The implementation fails with a stated message when `GOOGLE_CLIENT_ID` is unset rather than
accepting an unverifiable token.
