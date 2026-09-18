---
id: 015
title: Sign in with Google — the only control on the page, with the email routes kept out of sight
status: picked-up
produced: openspec/changes/google-sign-in/ — proposal drafted 2026-09-17, awaiting owner approval
origin: ROADMAP.md 第一步 3 — owner 2026-09-17: "网页的登录用 google sign in/sign up（目前先
  只支持 google sign in），一个 google 的邮箱就是一个账户". The reason is measured, not
  aesthetic: every mailed step in this funnel dies (48 verification mails → 2 opened; 60
  addresses → 5 credentialed → 4 profiles, `../h1_checker/.harness/prd/email-capture-funnel.md`).
  Google returns an address already proven, in one click, with no message to open.
counterpart: ../h1_checker/.harness/backlogs/014-sign-in-with-google.md — the extension's own
  Google sign-in, on the pairing page. Different origin, different service; that change lists
  "Google on the website" as an explicit non-goal. Neither blocks the other.
blocks: .harness/backlogs/014 (/go/<job_id> reading a session), and everything in ROADMAP 第二步
  that needs to know who is looking.
---

## What ships

`/login` leads with **Sign in with Google**: a Google address that has never been here gets an
account, one that has been here signs in, same button — "一个 google 的邮箱就是一个账户" means
the distinction is invisible to the person.

**Nothing else is on the page.** No email field, no password field, no tabs — owner, 2026-09-17:
"sign in 的界面上只有 sign in with google".

The email routes stay served, and stay **reachable without being shown**: `/login?password=1`
renders the form, and nothing anywhere links to it. That is this ticket's answer to the
contradiction it raised — a recovery path nobody can reach is not a recovery path, and a
recovery path on the front page is not "only Google". A URL you have to know satisfies both.

The home page redesign (left intro, right sign-in) is ROADMAP 第一步 4 and a separate ticket.
This one changes `/login`, the auth routes, and the schema line they need.

## The expensive half is already done

| | |
|---|---|
| Google client, non-sensitive scopes (`email`, `profile`, `openid`) | exists for the extension: `1069740098250-jg66jfblauhtkk6hg497fuukbpqd9vdd`, JS origin `h1bchecker-production.up.railway.app` |
| Google review | **not required** for non-sensitive scopes — only the Testing → Production switch in the console |
| Redirect URI | none needed; the ID token comes back to the page's own JavaScript |
| Client secret | none — the server verifies the token against Google's public keys |
| Cookie/origin trouble | none: Vercel rewrites `/api/*` to Railway, so the browser sees one origin (`bingocareer.com`) and the session cookie lands where it already does |
| `isOwner()` | configuration keyed on the address (`lib/auth/owner.ts`), so the owner signing in with their USC Google account keeps the dashboard with no change |

Verified against Google's own documentation on 2026-09-12 by the counterpart ticket, not from
memory: issuer `https://accounts.google.com`, keys at the `jwks_uri` in the discovery document,
RS256. **Read the discovery document rather than hardcoding the JWKS URL** — a rotated key
behind a stale URL is an outage nothing in this repo would explain.

## The four places the code says a password is mandatory

Each is small; together they are the ticket, and none can be skipped.

1. **`lib/db/src/schema/auth.ts:22`** — `passwordHash: text(...).notNull()`. A Google identity
   has no password. This is the same line `.harness/backlogs/012` needs for the account merge;
   **it lands here**, and 012 inherits it rather than doing it twice.
2. **`lib/auth/store.ts`** — `UserRecord.passwordHash: string`, and `createUser(email, hash)`
   takes a hash. Both need to admit "no password": the type becomes nullable and the store
   gains a way to create a password-less user. `drizzle-store.ts` and `memory-store.ts` both
   implement it, so both change.
3. **`routes/auth.ts:123` `POST /auth/login`** — with a nullable hash, a null must be an
   explicit refusal, never a crash and never a pass. It must also still spend the decoy scrypt
   (`DECOY_HASH`, line 37) so a password-less account is not detectable by how fast it is
   refused. This is the one line in the ticket where a mistake is a vulnerability rather than a
   bug, and it needs its own test.
4. **`routes/auth.ts:88` `POST /auth/register`** — stays open (decision 2), and so does its
   `isOwner(email)` reservation. That reservation is now load-bearing in a second way: with the
   form still reachable, `OWNER_EMAIL` remains an address a stranger would otherwise be able to
   claim, exactly as the comment there says. Nothing about this route changes; it is listed here
   because the first draft closed it.

## What must not regress

- **Not being the owner answers 404, never 403.** Unchanged, and the new route must not leak
  who is who either.
- **The page is never believed about who somebody is.** The ID token is verified server-side and
  the address is read from verified claims, never from the request body. A forged or expired
  token is refused, and there is a test that posts one.
- **`aud` is checked** against this deployment's configured client id. Whichever client is used
  (decision 1), a token minted for a different application is not a sign-in here.
- **Sessions stay rows.** The new route ends in the same `startSession` the others use — opaque
  cookie value, SHA-256 in `sessions`, revocable.
- **The AuthStore seam holds.** Tests run the real routes against memory. Google verification
  goes behind its own small seam for the same reason — the suite must not reach Google, and
  "mock the network" is not this repo's style.

## What done looks like

- A Google address that has never signed in here ends up with an account and a session, in one
  click, with no mail and no password.
- The same address signing in again lands on the same account — never a second row.
- The owner signs in with their USC Google account and sees the growth dashboard, **and their
  password still works** afterwards — the exemption above, with a test.
- `/login` shows the Google button and the email form together, and both work.
- An address that has a password account and then arrives through Google behaves exactly as the
  proposal's collision rule says, with a test per branch of it.
- An account with no password cannot be signed into by guessing at `POST /auth/login`, and
  refusing it takes as long as refusing anyone else.
- A tampered, expired, or wrong-`aud` ID token is refused with nothing created.
- `lib/api-spec/openapi.yaml` gains the route and **codegen runs in the same task** — nothing
  else regenerates the hooks.
- Tests: the real route, the real cookie, against memory and a fake verifier; plus the null-hash
  login refusal and the forged-token refusal above.
- `replit.md` gains the env row (`GOOGLE_CLIENT_ID`) and the decision, in its own sections.

## Decisions — all four taken 2026-09-17 ("都按照你建议的来")

Recorded so `/pickup` does not re-open them. The reasoning behind each stays below.

1. **One Google client.** Add `https://bingocareer.com` as an authorized JavaScript origin to
   the extension's existing client; do not create a second. `aud` is still checked.
2. **Google is the only control on the page** (revised twice on 2026-09-17: hidden → visible →
   hidden with a way in). `POST /auth/login` and `POST /auth/register` both stay served, and the
   form is reachable at `/login?password=1`, linked from nowhere.
3. **The owner's password account stays**, `set-owner-password` unchanged.
4. **Sign-in lands on `/jobs`.**

### The collision two doors create, and it is not cosmetic

With both doors open, one address can arrive twice: somebody registers `alice@gmail.com` with a
password, and later that address signs in with Google. The proposal must say what happens, and
the honest framing is that **the two doors prove different things**. Google proves the address.
`POST /auth/register` does not — sign-up here is open and unverified, which is the whole reason
the route reserves `OWNER_EMAIL` in the first place (`routes/auth.ts:99`).

So a password account on `alice@gmail.com` is only a *claim* on that address, and it may have
been made by somebody else. Three ways to land it:

- **Sign in to the existing account, and clear its password.** The proven claim wins: the person
  Google vouched for keeps the account, and whoever set the password loses the way in. Cheap,
  and it leaves nobody stranded. **Exempt `OWNER_EMAIL`** — that password is a deliberate
  recovery path (decision 3) and must survive the owner signing in with Google.
- **Sign in to the existing account, leave the password alone.** Simplest, and it means an
  unverified password and a verified Google login share one account forever.
- **Refuse the Google sign-in.** Safe, and a dead end the person cannot fix themselves.

Recommended: the first. Whatever is chosen, it is a security decision and belongs in the
proposal with its reasoning, not in an implementation detail.

## The reasoning behind each, kept


**1. One Google client or two.** Adding `https://bingocareer.com` to the extension's existing
   client is one console field and gives both surfaces one consent-screen identity. A second
   client keeps the two services' tokens unusable on each other — which matters less once
   `.harness/backlogs/012` makes them one account anyway. Recommended: **add the origin to the
   existing client**, and still check `aud`.
**2. What happens to email + password on this site.** *(Superseded the same evening: the owner
chose to show both tabs. Kept because the fallback reasoning still holds.)* Recommended: the `/login` UI shows only
   Google; `POST /auth/register` is closed; `POST /auth/login` **stays** — it is the owner's way
   in if Google is ever misconfigured, and it is what the nine password identities on the
   extension side will use after the merge. Removing it entirely is the alternative and it
   deletes the fallback.
**3. Whether the owner's account keeps its password** (`set-owner-password`). Recommended yes,
   unchanged — it costs nothing and it is the recovery path.
**4. What a person sees on the way in.** Straight to `/jobs` is the roadmap's answer; confirm,
since it decides whether this ticket touches routing at all.

## The fallback has no backup, and that is a separate ticket

Recorded 2026-09-17 while comparing this page against simplify.jobs' — theirs carries "Forgot
your password?", "Remember this device" and a reCAPTCHA; ours carries none of the three.

Only the first matters yet, and it matters *because* of decision 2: **there is no password
reset anywhere in this repo.** `routes/auth.ts` serves register, login, logout and `/me`;
`AuthStore` has no reset method; `replit.md` says outright that for the owner's account "there
is no reset flow". So the recovery path this ticket deliberately keeps is itself unrecoverable —
a forgotten password means `set-owner-password` on a terminal.

Not fixed here, and not a gap in this ticket: a reset flow means sending mail, and **this
service cannot send mail at all** — no Resend, no sender of any kind, no token table. All of it
exists next door (`../h1_checker`: `email_verifications`, `mailer.py`), and
`.harness/backlogs/012` moves this site onto that database. Building a second sender here and
discarding it at the merge is the same work twice.

So: after 012, not before. Its own ticket then, and it would also answer the question this one
parked — whether a verified password account and a Google sign-in on one address are a merge
rather than a takeover (see the collision section above). Mail verification proves exactly what
Google proves: control of the inbox. It is the right answer at the wrong time.

## Notes for whoever picks this up

1. **Not trivial by rule 6**: auth, sessions, `lib/db/src/schema/`, `openapi.yaml`, more than one
   file. Full change flow, failing tests first.
2. **Two console actions are the owner's, not code**: the JS origin (decision 1) and moving the
   app from Testing to Production. Until the second one, only listed test users can sign in and
   the failure reads like a bug.
3. **The Gmail-dots gotcha in `replit.md` gets smaller here.** Google returns the account's own
   canonical address, so the dotted spellings that `OWNER_EMAIL` cannot match do not arise from
   this path. It stays true for anything still typed by hand.
