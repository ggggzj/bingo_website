---
id: 018
title: The website's half of one account — read the surviving users table, and move 157 rows without losing one
status: picked-up
change: openspec/changes/2026-09-20-move-onto-the-surviving-database/
  Written 2026-09-20 after the owner ran the queries this ticket needed and settled three
  decisions. Step 1 was already delivered by 010; step 2 is decided as "no change here".
  The change covers step 3 only, and it is far smaller than this ticket assumed: no `users`
  row moves, four dependent rows do.
origin: Owner decision 2026-09-13, recorded in ../h1_checker/.harness/backlogs/015 — "网站和
  extension 的输入的密码是一样的,而且不管在哪里注册,用同一个邮箱和密码的人就是同一个账户,
  在两边都可以登录". That ticket is the h1_checker half and says in its own header that the
  website half is "needed in ../bingo_website-main/.harness/backlogs/". This is it. Written
  2026-09-16 because tickets 010 and 011 are both blocked on it.
counterpart: ../h1_checker/.harness/backlogs/015-one-account-on-both-surfaces.md
blocks: .harness/backlogs/016 (the personal feed), .harness/backlogs/017 (the tracker), and
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

## Note added 2026-09-18 — step 1 is already its own ticket

Renumbered from 012 on 2026-09-18 (see 016's note for why).

Step 1 of this ticket — dropping `.notNull()` from `password_hash` — is
`.harness/backlogs/010`, written by another session on 2026-09-13 and scoped to exactly that one
line, with both production databases measured. It can ship on its own and it unblocks Google
sign-in (`011`). Do not do it twice: this ticket's step 1 is satisfied when 010 lands.

---

# State at pickup, 2026-09-20 — two steps moved, the third is all that is left

Measured against the code, not assumed.

## Step 1 is done

`lib/db/src/schema/auth.ts` now reads `passwordHash: text("password_hash")` — no `.notNull()`.
It shipped as `.harness/backlogs/010` / `openspec/changes/2026-09-18-a-password-less-identity`,
exactly as this ticket's own 2026-09-18 note said it would. **Do not do it again.**

## Step 2 shrank, and may now be empty

`MIN_PASSWORD_LENGTH` is still 10 and `routes/auth.ts:18` still says *"Long rather than
fussy"*, so the owner's 2026-09-13 choice (eight characters, upper, lower, symbol) is
**not** applied here.

But `2026-09-18-one-way-in-and-it-is-google` is merged: the website signs people in with
Google and shows no password form. This ticket's own 2026-09-17 note already anticipated
that and shrank the website's role to *"never stricter than the surface that set the
credential"*. Whether that leaves anything to build **in this repo** is an owner call, not
an inherited task.

## The migration inventory is stale in two directions

This ticket lists what moves as *"the owner's `users` row, 3 `sessions`, 150
`coach_problems`, every `coach_*` row keyed on `user_id`, and `waitlist`"*.

- **`waitlist` is gone** — `openspec/changes/archive/2026-09-15-drop-waitlist` and
  `.harness/session-todos/2026-09-18-drop-the-waitlist-table-in-production.md`.
- **`new_grad_seen` is new**, and this ticket could not have known about it. Created in this
  site's production database on 2026-09-19 (`lib/db/src/schema/new-grad.ts`, change
  `2026-09-18-the-new-grad-list-behind-the-login`). It is keyed on `user_id` with
  `ON DELETE CASCADE` to `users`, so it moves with the account rows and its foreign key has
  to survive the move. The exact statement that created it is in `replit.md` under
  "Run & Operate", beside the one that made `password_hash` nullable.

**Anything added to this database between now and the move joins that list.** The inventory
belongs in the proposal as a query against the live schema, not as a sentence written once.

## Why this stopped at a grill rather than a proposal

The remaining work is a production migration between two databases, and two of the facts it
turns on cannot be read from a session:

1. **Does `OWNER_EMAIL`'s address exist as a `users` row on BOTH sides?** If it does,
   `unique(email)` refuses the copy, one row has to be chosen, and every `coach_*` and
   `new_grad_seen` row keyed to the losing id has to be remapped. If it does not, the move
   is a straight copy. These are different plans, and the difference is one query per side.
2. **What is actually in each table today?** This ticket's "157 rows" was counted on
   2026-09-16 and three changes have landed since.

Neither is reachable from here: `DATABASE_URL` is not in this repo (measured 2026-09-19 —
there is no `.env`), and `pnpm --filter @workspace/db run push` cannot reach production at
all, because Railway hands it an internal hostname that does not resolve from a laptop.
Both databases are reachable only through `railway connect`, which is the owner's session.

So the next move is the owner running one query per side, not a session writing a plan
against numbers it guessed.

## The two decisions that shape the proposal, and neither is a session's to make

- **Who owns `users` and `sessions` DDL after the move.** This ticket's own answer is
  h1_checker, with this repo's drizzle schema becoming a description of tables it does not
  migrate. That is a recommendation and has never been recorded as a decision.
  `.harness/backlogs/007` exists because a push does not say which database it is about to
  change, and after the move a careless one here would describe h1_checker's production.
- ~~**Whether step 2 survives Google-only**~~ — **decided by the owner 2026-09-20: this repo
  does not change the password rule.** Their words: *"目前网站这边先不要改"*, on the reasoning
  that the website has no password form and that non-Google email registration is a later
  question.

  One fact in the owner's reasoning was corrected at the time and the decision survived it.
  They recalled that both surfaces are Google-only now. Measured: the website is, but the
  **extension's popup still signs in with a password** — `extension/popup.js` still carries
  the box, `../h1_checker/.harness/backlogs/014` is `shipped-in-part` (Google landed on the
  pairing page only) and its `018` is still open. That makes the decision *stronger*, not
  weaker: the credential is live on the extension, so the rule belongs to the surface that
  sets it, and this repo's role is the one this ticket's 2026-09-17 note already named —
  **never stricter than the surface that set the credential.**

  `MIN_PASSWORD_LENGTH = 10` therefore stays as it is, and the 2026-09-13 choice (eight
  characters, upper, lower, symbol) is h1_checker's to apply if and when it applies it.

- ~~**Who owns `users` and `sessions` DDL after the move**~~ — **decided by the owner
  2026-09-20: h1_checker owns it.** The surviving database is that repo's and its SQLAlchemy
  models already create and maintain these tables, so the definition that runs is the
  definition that rules.

  What that obliges this repo to do, and the proposal must carry all three:

  1. `lib/db/src/schema/auth.ts` **stays** — the api-server needs its types — but stops
     being a migration source. It becomes a description of tables this repo does not own.
     Say so in the file itself, not only in a proposal nobody reads twice.
  2. **A guard so `pnpm --filter @workspace/db run push` cannot reach the surviving
     database.** This is not hypothetical: `replit.md` already records that a successful
     push would have offered to drop `waitlist`, because that table was in the database and
     not in the schema file. After the move, the tables not in this repo's schema file are
     h1_checker's whole application. `.harness/backlogs/007` ("say which database a push is
     about to change") is the ticket that exists for this and should be read with it.
  3. `lib/db/src/schema/new-grad.ts` is now in the same position — created by this repo on
     2026-09-19 but keyed to `users`. After the move it describes a table in h1_checker's
     database, and whichever side owns that DDL has to be stated rather than left to whoever
     edits first.

  Recorded here rather than only in the proposal because this is the answer to a question
  the next session will otherwise ask again.

---

# Measured against both production databases, 2026-09-20

Run by the owner through `railway connect`, because no session can reach either. **Both
databases are services in one Railway project** (`h1b_checker`) — `Postgres-EBWW` is this
site's, `Postgres` is h1_checker's — so the move needs no cross-project networking.

## The collision is real, and the ids are crossed

| address | this site (`Postgres-EBWW`) | h1_checker (`Postgres`) |
|---|---|---|
| `zguo7940@usc.edu` | **id 3**, no password (Google) | **id 1**, has a password |
| `christineguo610@gmail.com` | **id 1**, has a password | **id 3**, no password (Google) |

This site holds 2 users. h1_checker holds 10, and **both of this site's addresses are
already among them.**

**Read the table again before planning anything.** The two ids are not merely different —
they are *swapped*. Copy this site's rows preserving `id` and this site's id 3, which is
the owner, lands on h1_checker's id 3, **which is the other person**. Every `coach_*` and
`new_grad_seen` row keyed to it follows. No constraint is violated, nothing errors, and the
owner's practice history and job list silently become somebody else's.

That is the one failure mode of this migration that is invisible afterwards, and it is why
the remap table belongs in the proposal as a literal, checked twice:

```
this site id 3  →  h1_checker id 1     zguo7940@usc.edu
this site id 1  →  h1_checker id 3     christineguo610@gmail.com
```

## What this does to the shape of the work

**No `users` row moves at all.** Both addresses exist on the surviving side already, so
there is nothing to insert and `unique(email)` is never tested. The ticket's "157 rows" and
its worry about `users_id_seq` both fall away with it — nothing new claims an id.

What remains is: **re-key the dependent rows onto the surviving user ids.** Measured from
`\d users` on this site, six tables reference it, all `ON DELETE CASCADE`:

```
coach_api_tokens · coach_config · coach_daily_log · coach_reviews · new_grad_seen · sessions
```

`coach_problems` is **not** among them — the bank is global and holds no user data, so the
150 rows the ticket lists do not move.

Two consequences worth stating before the proposal is written:

- **`sessions` should not be carried over.** A session row is a live cookie for an origin
  that is about to stop being that account's home; re-keying them means moving credentials
  whose only value is that they expire. Signing in again is the honest migration for those
  three rows, and it costs the owner one login.
- **Which password survives is now a question, not an accident.** For `zguo7940@usc.edu` the
  surviving row has a password and this site's has none — the owner keeps extension access,
  which is the right outcome. For `christineguo610@gmail.com` it is reversed: the surviving
  row has **no** password, and the extension's popup still asks for one
  (`../h1_checker/.harness/backlogs/018` is open). That account would be able to sign in on
  the website and not in the extension popup until Google reaches it. Not a blocker; it is
  a thing the proposal must say out loud rather than discover.

## What actually moves, counted 2026-09-20

```
coach_api_tokens  user 1  2 rows
coach_config      user 1  1 row
coach_daily_log   user 1  1 row
sessions          user 1  4 rows
sessions          user 3  1 row
coach_reviews             0 rows
new_grad_seen             0 rows
```

**Four rows, and all four belong to `christineguo610@gmail.com`.** The owner's own account
(`zguo7940@usc.edu`, this site's id 3) holds one session and nothing else — no coach history,
no list marker. Sessions are not carried (see above), so the owner's account moves nothing at
all.

The remap that matters is therefore `user_id 1 → 3`, and it is the one a careless "keep the
ids" would get exactly wrong: h1_checker's id 1 is `zguo7940@usc.edu`, so those four rows
would land on the owner rather than on the account that made them.

## The surviving database has none of these tables

Measured against `models.py`: h1_checker's 21 tables are employers, job postings, the feed and
auth. **There is no `coach_*` and no `new_grad_seen`.** So this is not a re-key of four rows —
it is *create six tables on the surviving side, move the 150-row problem bank, then move four
rows*.

`coach_problems` moves even though it references no user: the bank is what the coach reads,
and a coach with no problems is not a coach.

## Third decision, owner 2026-09-20 — who owns the coach tables' DDL

The 2026-09-20 decision above put `users` and `sessions` with h1_checker. It did not cover
these six, and they are a different case: **only this repo's code reads them.**

**Decided: this repo owns them, scoped to its own tables.** Whoever uses a table maintains it;
asking h1_checker's Python to carry six models it never reads is how definitions rot.

The condition attached is not optional. After the move this repo's drizzle describes six tables
in a database holding twenty-seven, so **a whole-schema reconciliation from here would see
h1_checker's entire application as unknown.** `pnpm --filter @workspace/db run push` must be
made unable to run against the surviving database — not documented as unwise, *unable*.
`.harness/backlogs/007` is the ticket for saying which database a push is about to change;
this change needs the harder version of it.
