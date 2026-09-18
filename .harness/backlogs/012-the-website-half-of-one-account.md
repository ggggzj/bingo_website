---
id: 012
title: The website's half of one account — read the surviving users table, and move 157 rows without losing one
status: open
origin: Owner decision 2026-09-13, recorded in ../h1_checker/.harness/backlogs/015 — "网站和
  extension 的输入的密码是一样的,而且不管在哪里注册,用同一个邮箱和密码的人就是同一个账户,
  在两边都可以登录". That ticket is the h1_checker half and says in its own header that the
  website half is "needed in ../bingo_website-main/.harness/backlogs/". This is it. Written
  2026-09-16 because tickets 010 and 011 are both blocked on it.
counterpart: ../h1_checker/.harness/backlogs/015-one-account-on-both-surfaces.md
blocks: .harness/backlogs/010 (the personal feed), .harness/backlogs/011 (the tracker), and
  h1_checker's already-written Google sign-in change, which creates a password-less row this
  repo's schema forbids.
---

## The problem, in one scenario

Somebody registers on this site with `a@usc.edu`, then installs the extension and registers
there with the same address. Today that is **two accounts** in **two databases**, each with a
table called `users`, and neither side knows the other exists. The job feed engine
(`../h1_checker`, `GET /api/my/jobs`) knows the extension's user. The coach knows this site's
user. The same person, and the feed cannot see them.

The owner decided on 2026-09-13: **one database, h1_checker's survives** (1214 MB and every
foreign key, against 157 rows here), and this site's rows move over. Both halves of the auth
code turn out to already agree — see below — so this is an operations ticket with two code
changes, not a rewrite.

## Measured 2026-09-16: how close the two sides already are

| | this site (`lib/db/src/schema/auth.ts`) | h1_checker (`models.py:586`, `:750`) |
|---|---|---|
| `users` columns | `id, email, password_hash, created_at, last_login_at` | identical |
| `users.password_hash` | **NOT NULL** (`auth.ts:22`) | nullable |
| `sessions` columns | `id, user_id (cascade), token_hash, created_at, expires_at, revoked_at` | identical |
| password hash format | `scrypt$N$r$p$salt$hash`, params read back at verify | identical |
| where the connection string is read | `lib/db/src/index.ts` (`DATABASE_URL`) | — |

So a hash written by either side verifies on the other, and the table shapes are the same
to the column. What differs is one `NOT NULL`, one password rule, and which Postgres the
string in `DATABASE_URL` names.

## What this repo has to do, in the order 015 fixes

1. **`password_hash` stops being NOT NULL** — `lib/db/src/schema/auth.ts:22`. One line.
   Google sign-in on the other side creates exactly such a row and is blocked on this.
2. **The password rule changes, and the change is cited, not slipped in.**
   `artifacts/api-server/src/routes/auth.ts:17-19` says *"Long rather than fussy"* and
   `MIN_PASSWORD_LENGTH = 10`. The owner was shown that line on 2026-09-13 and chose eight
   characters with upper case, lower case and a symbol. `openspec/config.yaml` requires the
   proposal to name the position it reverses; the counter-argument stays on record in 015.
   Two rules follow and neither is a preference: the rule is enforced when a password is
   **set** (sign-up, reset) and never when one is **checked** (login) — nine identities on the
   other side and the owner's own account here were made under older rules; and whatever the
   form says while somebody types is exactly what the server enforces.
3. **Then the move.** `DATABASE_URL` points at the surviving database, and the 157 rows go
   with it: the owner's `users` row, 3 `sessions`, 150 `coach_problems`, every `coach_*` row
   keyed on `user_id`, and `waitlist`. Steps 1 and 2 come first because after this step two
   codebases write one table, and a disagreement between them stops being theoretical.

## What will go wrong if it is not named

- **Sequences.** `users.id` is `nextval(...)` on both sides. Copy rows without the sequence and
  the surviving database issues an id that already exists. `pg_dump` carries sequences;
  hand-written `INSERT`s do not. (`../h1_checker/.harness/backlogs/017`, "the one that bites".)
- **The owner's row collides.** `OWNER_EMAIL` has an account here. If that address is also a
  `users` row on the other side, `unique(email)` refuses the copy. Either hash verifies on
  either side, so the question is only *which row survives* — and the coach rows' `user_id`
  must be remapped to it.
- **`db run push` from this repo now describes tables in h1_checker's production database.**
  Drizzle's declarations and SQLAlchemy's DDL are the same shape but not the same text
  (`text` vs `String(320)`, `timestamp` vs `DateTime`), and a push would try to reconcile
  them. Ticket 007 here already exists for "say which database a push is about to change";
  this is the case that makes it urgent. The proposal has to say who owns `users` and
  `sessions` DDL after the move — the honest answer is h1_checker, and this repo's drizzle
  schema becomes a description of tables it does not migrate.
- **Same credential, not same session.** Cookies are per-origin. Signing in here does not
  sign the extension in, and 015's "signs in on both" means the password works on both, not
  single sign-on. Say so somewhere a user reads it, or the first support question is "I
  logged in on the website, why is the extension asking me again".

## What stays the same, and why that is the point

- The `AuthStore` seam (`lib/auth/store.ts`, `drizzle-store.ts`, `memory-store.ts`). The
  api-server tests run the real routes, hashing and cookies against memory, so no test here
  cares which Postgres is behind drizzle. That is what makes this a store-and-environment
  change rather than a route change.
- `OWNER_EMAIL` and `COACH_EMAILS` stay configuration, not columns. Nothing about who is the
  owner moves with the rows.
- `set-owner-password` keeps working; after the move it writes the shared table.
- Not being the owner still answers 404, never 403.

## What done looks like

- One address plus one password signs in on this site and in the extension, whichever
  surface created it.
- Nothing already stored is lost and nobody sets a password again — verified by signing in
  here with the owner's existing password after the move, not by reading the dump.
- An address that is taken is taken everywhere: `/auth/signup` here refuses an address the
  extension already holds, and vice versa.
- A password-less row can exist here without a crash anywhere that reads `passwordHash`.
- The password rule lives in one place per surface and matches the other side character for
  character, with a test on each side that the same candidate strings pass and fail.
- `pnpm --filter @workspace/db run push` cannot be run against the surviving database by
  accident — whatever ticket 007 lands, or a guard in this change.

## Notes for whoever picks this up

1. **This is the most sensitive change in the repo's own rule 6** — auth, sessions,
   `lib/db/src/schema/`, and more than one file. Full change flow, no shortcuts, failing tests
   first.
2. **The 2-in-48 number is not this ticket's problem**, but do not let this ticket make it
   worse: nothing here should add a verification step to a login that works today.
3. **Where the one password rule lives** is a design call the proposal has to make:
   three surfaces, three languages (Python, TypeScript, the extension's JavaScript). "One
   definition, imported" is true within a repo; across two it is a published constant or a
   contract test, and the proposal should pick.

## Note added 2026-09-17 — the website goes Google-only

Owner decision 2026-09-17 (`ROADMAP.md` §2 C): new website accounts sign in with Google only. Two
consequences for this ticket, neither a reversal:

- **Step 1 stops being optional and comes first.** A Google-born identity has no password, so the
  `NOT NULL` on `password_hash` (`lib/db/src/schema/auth.ts:22`) blocks the website's own sign-in,
  not just the extension's. Google sign-in on the website (`ROADMAP.md` §3 阶段 1) needs this line
  before the move, and can land before the rest of this ticket.
- **Step 2's password rule is enforced by the extension side only** once the website shows no
  password form. It still has to be defined once and match — the owner's account and the nine
  extension identities keep their passwords — but the website's role shrinks to "never stricter
  than the surface that set the credential".

And one thing this ticket cannot fix: a website-created (Google) identity cannot sign into the
extension's popup until the extension also accepts Google (`../h1_checker/.harness/backlogs/014`,
`018`). "One address, both surfaces" is true only when 015 and 014 have both landed.
