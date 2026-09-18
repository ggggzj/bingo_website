# Proposal — google-sign-in

## Why

Every way into an identity on this site runs through a typed password, and the funnel's own
numbers say that is where people stop. Measured on the extension's side, which shares this
product's audience: **48 verification mails, 2 opened; 60 addresses collected, 5 credentialed,
4 profiles answered** (`../h1_checker/.harness/prd/email-capture-funnel.md`). Signing in with
Google returns an address Google has already proven, in one click, with no message to open.

The audience fits: international students, overwhelmingly on Gmail or a university Google
account — USC, the school on most rows in that repo's `user_profiles`, is Google Workspace.

Most of the cost is already paid. The scopes are non-sensitive, so **no Google review** stands
between this and real users; Vercel rewrites `/api/*` to Railway, so the browser sees one
origin and the session cookie is unchanged; `isOwner()` reads the address from configuration,
so the growth dashboard needs no change at all.

Origin: `.harness/backlogs/015-sign-in-with-google-and-nothing-else.md`, serving
`ROADMAP.md` 第一步 3. Its counterpart is `../h1_checker/.harness/backlogs/014`, the extension's
own Google sign-in on the pairing page — a different origin and a different service, which that
repo's change lists as an explicit non-goal of its own work.

## What Changes

- **`POST /api/auth/google`** — the page sends a Google ID token; the server verifies it against
  Google's published keys and establishes the same session `POST /auth/login` does. **The page is
  never believed about who somebody is**: the address is read from verified claims, never from
  the request body.
- **A password-less identity becomes representable.** `lib/db/src/schema/auth.ts` drops
  `.notNull()` from `password_hash`; `UserRecord.passwordHash` becomes nullable and the
  **`AuthStore` seam** gains a way to create a user without one. Both implementations
  (`drizzle-store`, `memory-store`) follow.
- **Verification sits behind its own small seam**, for the reason `AuthStore` exists: the suite
  runs the real route, the real cookie and the real session against memory, and it must not
  reach Google to do it.
- **`/login` gains the Google button above the form it already has.** Both tabs stay
  (owner, 2026-09-17): a recovery path nobody can reach is not a recovery path.
- **An address that arrives through both doors resolves one way, and it is a security decision
  rather than a merge** — see `design.md` §3. Google proves the address; open sign-up does not.
- **`lib/api-spec/openapi.yaml`** gains the route, with codegen run in the same task.

## Non-goals

- **Removing email and password.** Both routes stay and both tabs stay visible. Closing
  `POST /auth/register` was the first draft's plan and the owner reversed it the same day.
- **Password reset.** There is none in this repo and this change does not add one. A reset means
  sending mail and this service cannot send mail at all — no sender, no token table. Both exist
  in `../h1_checker`, and `.harness/backlogs/012` moves this site onto that database, so building
  a second sender here would be the same work twice. Queued in `ROADMAP.md` 第二步 1.5.
- **Email verification for password sign-up.** Same reason, same timing. It is the right answer
  to §3's collision and it is unavailable until the merge.
- **The account merge itself** (`.harness/backlogs/012`). This change makes a password-less row
  legal, which that one needs; it does not move a row or change a database.
- **LinkedIn and Apple.** simplify.jobs offers all three; the owner asked for Google only.
- **The home page redesign** (`ROADMAP.md` 第一步 4) and **the `/jobs` login wall** (第一步 5).
  Separate tickets; this change touches `/login` and the auth routes.
- **Anything the extension does.** Its Google sign-in is its own repo's change.

## Capabilities

### New Capabilities

- `sign-in`: how somebody proves which address is theirs on this site, what happens when an
  address arrives through more than one door, and what a session is worth afterwards.

### Modified Capabilities

None. `openspec/specs/` holds `coach-*`, `company-bank`, `jobs-page` and `track-split`; none of
them specifies signing in.
