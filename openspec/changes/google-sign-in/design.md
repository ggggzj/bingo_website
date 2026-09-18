# Design — google-sign-in

## 1. The ID-token flow, not the redirect flow — and simplify.jobs took the other one

There are two ways to accept a Google sign-in, and the reference product uses the one we are
not using. Read off simplify.jobs' own login page on 2026-09-17: its buttons call
`/v2/auth/oauth/google/login`, `/v2/auth/oauth/linkedin/login`, `/v2/auth/oauth/apple/login` on
its own backend, which redirects to Google and is redirected back to a callback page at
`/auth/oauth`. That is the **authorization-code redirect flow**: a registered redirect URI, a
client secret on the server, a code exchanged for tokens.

They need it. Their login bundle also carries `/v2/auth/oauth/gmail/login` — a *separate* Google
flow, which is how a tracker learns that an interview was scheduled, and which is only worth
building if you hold a refresh token and have passed Google's review for a restricted scope.

We need none of that. Taking only `email`, `profile` and `openid`, the **ID-token flow** is
strictly less machinery:

| | redirect flow (theirs) | ID-token flow (ours) |
|---|---|---|
| Redirect URI registered | required | **none** — the token comes back to the page's own JavaScript |
| Client secret stored | required | **none** |
| Refresh token / extra scopes | available | not available, not wanted |
| Google review | required for Gmail scopes | **not required** — `email`/`profile`/`openid` are non-sensitive |

Verified against Google's own documentation on 2026-09-12 by the counterpart ticket rather than
from memory: *"Optionally, credentials may be returned using a redirect … If this is the case,
add your redirect URIs"*, and *"If your app utilizes only non-sensitive scopes, it is not
mandatory for your app to complete the app verification process."*

**Read the discovery document, do not hardcode the JWKS URL.** Google publishes
`https://accounts.google.com/.well-known/openid-configuration` for exactly this reason, and a
rotated key behind a stale URL is an outage nothing in this repo would explain.

## 2. What the server checks, and what it refuses

The page hands over a string. Everything below is checked on the server before any row is read
or written; failing any of them is one answer, `401`, with nothing created:

- **Signature**, against Google's current published keys (RS256).
- **`iss`** is `https://accounts.google.com`.
- **`aud`** equals this deployment's `GOOGLE_CLIENT_ID`. A token minted for another application
  — including one of this product's own other clients — is not a sign-in here.
- **`exp`** has not passed.
- **`email_verified` is true.** Google will assert an address it has not verified for some
  account types, and an unverified address from Google proves no more than a typed one. This
  single claim is what the rest of this design leans on.

The address is then `normalizeEmail(claims.email)` — the same trim-and-lowercase every other
route uses.

### Keyed on the address, not on Google's `sub`

`sub` is the stable identifier and the address can change; keying on `sub` is the textbook
answer. This product cannot use it. `OWNER_EMAIL` is an address, `.harness/backlogs/012` merges
two databases **by address**, the extension's identities are addresses, and `isOwner()` reads
configuration rather than a row. One of those would have to become a lie.

So: the address identifies the person, and the cost is recorded here — somebody who changes the
address on their Google account arrives as a new person. At this size that is a support
question, not an outage, and `sub` can be stored alongside later without moving anything.

## 3. Two doors, one address — the collision, and why the proven claim wins

`POST /auth/register` is open and **does not verify the address**. That is not an oversight; it
is why the route reserves `OWNER_EMAIL` (`routes/auth.ts:99`, "sign-up is open and an address is
not verified, so otherwise the first stranger to guess OWNER_EMAIL … would hold the account the
dashboard is keyed to").

So a password row on `alice@gmail.com` is a **claim** on that address. A Google sign-in on the
same address is **proof** of it. When they meet, three landings were on the table:

1. **Sign in, and clear the password.** Proof beats claim. Whoever set the password loses the
   way in; the person Google vouched for keeps the account.
2. Sign in, leave the password. An unverified password and a verified login share one account
   forever — which is to say, a stranger who guessed an address early keeps access to it.
3. Refuse the Google sign-in. Safe, and a dead end the person cannot fix themselves.

**Chosen: 1**, with one exemption. Two rules follow:

- **`OWNER_EMAIL` is exempt.** That password is a deliberate recovery path (owner decision,
  2026-09-17) and must survive the owner signing in with Google. Without the exemption, the
  first thing this change does in production is delete the only fallback it was told to keep.
- **The person is told**, on the page they land on: this account now signs in with Google.
  Silently revoking a credential is how a support question becomes a bug report.

Sessions already open on the cleared account are **not** revoked. Revoking them is the safer
choice and it is not this change's call to make — it would sign the legitimate owner out of
their other browser as a side effect of signing in. Recorded as a known limit rather than
decided quietly; a later change may revisit it once `012` gives sessions one home.

**This is the decision that email verification would dissolve.** A verified password row and a
Google sign-in on one address are the same person, and nothing needs clearing. That is
`ROADMAP.md` 第二步 1.5, after the merge — the right answer at the wrong time.

## 4. The null hash already lands safely, and that is worth pinning rather than trusting

The ticket expected the login route to need care once `passwordHash` could be null. Reading it
(`routes/auth.ts:142`), it already does the right thing:

```ts
const matched = await verifyPassword(
  parsed.data.password,
  user?.passwordHash ?? DECOY_HASH,
);
if (!user || !matched) { refuse(); return; }
```

`??` catches `null` as readily as the missing user it was written for, so a password-less
account already costs a full scrypt against the decoy and answers the same `401` as everyone
else. The timing channel the comment above it closes stays closed.

That makes this the smallest of the four changes — **and the one that most needs a test**, since
nothing in the code says it is deliberate. A test that signs in against a password-less account
turns an accident into a property.

## 5. Verification behind a seam, because the suite must not call Google

`AuthStore` exists so the tests run the real routes, the real hashing and the real cookies
against memory (`lib/auth/store.ts`). A route that reaches Google would undo that for the one
area this repo says is worth testing hardest.

So the route takes a verifier the way it takes a store: one method, token in, verified claims or
a refusal out. The real one fetches the discovery document and Google's keys and caches them; the
test one returns fixed claims and can be told to reject. No HTTP mocking, no network, no `nock`.

## 6. The client id is two environment variables, and they fail loudly

The server verifies `aud` against `GOOGLE_CLIENT_ID`; the page needs the same value at build time
as `VITE_GOOGLE_CLIENT_ID`. One value in two places is a drift hazard, and the mitigation here is
that drift is not silent: a mismatch fails every sign-in immediately on `aud`, in development,
with an error that names the claim. An endpoint serving the id to the page would remove the
duplication and add a round trip to every page load; not worth it for a value that is public by
design and changes approximately never.

## 7. Two console actions belong to the owner, and neither is code

1. Add `https://bingocareer.com` to **Authorized JavaScript origins** on the existing client
   (`1069740098250-jg66jfblauhtkk6hg497fuukbpqd9vdd`, owner decision: one client, two origins).
2. Move the app from **Testing** to **Production**. Until then only listed test users can sign
   in, and the failure reads like a bug rather than a configuration state.

The implementation should fail with a stated message when `GOOGLE_CLIENT_ID` is unset, rather
than rendering a button that cannot work.

## 8. Where the kept fallback lives, now that the page will not show it

The owner asked three times for this in three shapes, and the third resolves the first two:
hide the form (morning), show it because a hidden fallback is unreachable (evening), hide it
again but keep the routes (later). The unreachability objection did not go away; it needs an
answer rather than a reversal.

**Chosen: `/login?password=1` renders the form on the same page, and nothing links to it.**

- The page is what the owner asked for: one Google control, no fields.
- The fallback is real, not notional. When Google's configuration is wrong — the app still in
  Testing, an origin not yet added, a client id typo'd into one of its two environment variables
  — the owner types eight characters onto a URL they already have open and signs in with the
  password `set-owner-password` gave them.
- It is one component and one conditional, not a second route, a second page or a second form.

Two alternatives, and why not:

- **Nothing in the UI, use `curl`.** The session is a cookie; a cookie obtained on a terminal
  has to be pasted into a browser by hand to be worth anything. That is not a recovery path, it
  is a story about one.
- **A small "sign in another way" link.** Honest and discoverable — and it puts email and
  password back on the sign-in page, which is the thing being removed.

This is **not** a security boundary and the implementation must not treat it as one. The routes
are rate-limited and answer 401 the same either way; the query parameter hides a form from
people who are not looking for it, and nothing more. Anyone who reads the page's JavaScript can
find it, and that is fine — an attacker who wanted the password endpoint never needed the form.
