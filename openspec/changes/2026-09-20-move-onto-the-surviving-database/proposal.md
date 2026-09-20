# Proposal — move-onto-the-surviving-database

## Why

This product has two `users` tables in two databases, and the same address in both is two
people. `.harness/backlogs/018` is this repo's half of closing that; its counterpart is
`../h1_checker/.harness/backlogs/015`, and the owner settled the direction on 2026-09-13:
**h1_checker's database survives, this site's rows move to it.**

Everything below was measured on 2026-09-20 against both production databases, run by the
owner through `railway connect` because no session can reach either. The measurements changed
what this change is three times, so they lead rather than follow.

**Both databases are services in one Railway project** (`h1b_checker`): `Postgres-EBWW` is
this site's, `Postgres` is h1_checker's. No cross-project networking is needed.

### The ids are crossed, and that is the whole risk

| address | this site | h1_checker |
|---|---|---|
| `zguo7940@usc.edu` | id **3**, no password | id **1**, has a password |
| `christineguo610@gmail.com` | id **1**, has a password | id **3**, no password |

Both of this site's two addresses already exist on the surviving side, which holds ten users.
**So no `users` row moves at all** — nothing is inserted, `unique(email)` is never tested, and
the sequence worry in ticket 018 falls away with it.

What is left is re-keying dependent rows, and the ids are not merely different — they are
*swapped*. Keeping them would put this site's id 1 onto h1_checker's id 1, which is a different
person. Nothing errors. The wrong owner simply has the data afterwards.

### What actually moves: four rows

```
coach_api_tokens  user 1   2 rows        coach_reviews    0 rows
coach_config      user 1   1 row         new_grad_seen    0 rows
coach_daily_log   user 1   1 row         sessions         5 rows — not carried
```

All four belong to `christineguo610@gmail.com`. The owner's own account holds one session and
nothing else.

### The surviving database has none of these tables

h1_checker's 21 tables are employers, postings, the feed and auth. There is no `coach_*` and no
`new_grad_seen`. So this is **create six tables there, move the 150-row problem bank, then move
four rows** — not a re-key.

## What Changes

- **Six tables are created in the surviving database** — `coach_problems`, `coach_config`,
  `coach_daily_log`, `coach_reviews`, `coach_api_tokens`, `new_grad_seen` — from this repo's
  drizzle definitions, which the owner decided on 2026-09-20 continue to own them.
- **`coach_problems` moves whole** (150 rows, global, no user key). A coach with no bank is not
  a coach.
- **Four rows move with `user_id` remapped `1 → 3`**, from a literal table written down and
  checked, never from "keep the ids".
- **`sessions` does not move.** A session row is an unexpired cookie for an origin that is about
  to stop being that account's home; carrying it moves a credential whose only property is that
  it expires. The owner signs in once afterwards.
- **`DATABASE_URL` for `artifacts/api-server` points at the surviving database.**
- **`pnpm --filter @workspace/db run push` is made unable to run against it.** After the move
  this repo's drizzle describes six tables in a database holding twenty-seven; a whole-schema
  reconciliation from here would read h1_checker's entire application as unknown. `replit.md`
  already records that a push once offered to drop `waitlist` for exactly this reason, and that
  was with one stray table rather than twenty-one.
- **`lib/db/src/schema/auth.ts` says in the file that it no longer owns what it describes.**
  `users` and `sessions` become h1_checker's DDL (owner, 2026-09-20); the file stays because
  the api-server needs its types.

## What does not change

- **The `AuthStore` seam.** `lib/auth/store.ts` with its drizzle and memory implementations is
  untouched, and the api-server's tests keep running the real routes, hashing and cookies
  against memory. **No test in this repo cares which Postgres is behind drizzle** — that is
  what makes this a store-and-environment change rather than a route change, and it is also
  why most of the work below has no Vitest to name.
- **The password rule.** `MIN_PASSWORD_LENGTH` stays 10 (owner, 2026-09-20). The website has no
  password form; the rule belongs to the surface that sets the credential, and the extension's
  popup still does.
- **`OWNER_EMAIL` and `COACH_EMAILS` stay configuration, not columns.** Nothing about who the
  owner is moves with the rows.
- **404 and never 403** for a non-owner, everywhere.

## Non-goals

- **Single sign-on.** Cookies are per-origin. "One address on both surfaces" means the
  credential works on both, not that signing in here signs in the extension. This change must
  say that somewhere a person reads, or the first support question is why they were asked
  twice.
- **The extension's half.** `../h1_checker/.harness/backlogs/015` is the counterpart and ships
  through its own repo. One change, one repo, one PR.
- **Making `christineguo610@gmail.com` able to sign into the extension popup.** On the surviving
  side that row has no password and the popup still asks for one
  (`../h1_checker/.harness/backlogs/018` is open). That account will sign in on the website and
  not in the popup until Google reaches the extension. Stated, not fixed here.
- **A general migration tool.** Four rows and a 150-row bank, once.

## Capabilities

### New Capabilities

- `one-account` — one address is one identity across both surfaces, and the rows that were
  keyed to this site's ids are keyed to the surviving ones.

### Modified Capabilities

None. `coach-api` and the coach specs describe behaviour over `user_id`, and which database
holds that column is not something they assert.
