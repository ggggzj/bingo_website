# Design — fix-google-signin-skips-the-owner-list

## Why the seam, and not `db` in the route

`routes/auth.ts` takes an `AuthStore` and never imports `db`, which is what lets
`auth.test.ts` run the real route, the real cookies and the real hashing against memory.
Reaching for `db` inside the route to write two rows would buy three lines and cost that
property — the tests would need a Postgres, and the thing worth testing hardest in this
server is the part that would stop being tested.

So the seam grows one method. The memory implementation records into a `Map`, which is what
the three repro tests read; the Drizzle implementation writes the rows.

## Raw SQL, deliberately

h1_checker's `models.py` owns `registrations` and `email_verifications`, and migrates them
lazily at runtime — `_ensure_column` added `last_verified_at` to `email_verifications` after
that table had shipped. Two repos now share one `DATABASE_URL`.

**Correction, made while verifying and left in rather than rewritten away.** This section
first said the danger was `drizzle-kit push` reconciling a stale declaration against the live
table. Running it proved that cannot happen: `lib/db/drizzle.config.ts` already throws on
`push`, and its message is this same argument reached first and independently — *"it
reconciles the WHOLE schema, and after 2026-09-20 this schema describes seven of the
surviving database's twenty-seven tables, so a push would offer to drop h1_checker's
application."* The hazard is real and it is already guarded.

What is **not** guarded is the path that guard sends people down: `generate`, read the SQL,
apply it through `railway connect`. `drizzle-kit generate` emits DDL for everything the
schema declares. Declare `registrations` and `email_verifications` here and the next
generated migration carries `CREATE TABLE` — or, once they drift, `ALTER TABLE` — for two
tables h1_checker owns and migrates at runtime in `models.py`. Somebody then applies that SQL
by hand, believing it to be this repo's, because every other statement in the file is.

So the conclusion stands and the reason is one step further along than it was written. Raw
SQL keeps the declaration out of the schema, so nothing this repo generates can describe
those two tables at all.

The cost is that the compiler checks no column name on that path. It is paid by
`proven-address.contract.test.ts`, which ran green against a real Postgres (see tasks 3.2 and
4.1) — and, for the one thing that test cannot check, by reading the production schema
directly on 2026-09-21.

## One `now`, passed in

h1_checker's `/register/status` counts an address as confirmed only when the proof is not
older than the registration asking about it. Both rows therefore take the same `now`, passed
from the route, which already has one for the session and the login stamp. Reading the clock
twice inside the store would make that comparison hold by luck.

## Idempotency, and what "already there" means

`registrations` is one row per `(email, client_id)`; `client_id` is NULL from this site,
because there is no install here and inventing one would put a false install id on the
dashboard's Installed column. So the guard is `WHERE NOT EXISTS (email = $1 AND client_id IS
NULL)` — `= NULL` would never match and would insert a row per sign-in.

`email_verifications.email` is unique, so its guard is an upsert: set `verified_at` only when
it is null (it is when the address was first proven and must not drift, the rule h1_checker's
`/verify` follows) and `last_verified_at` always. That is exactly what the counterpart's
`_record_proven_address` does, and the two implementations are meant to stay readable as one
behaviour in two languages.
