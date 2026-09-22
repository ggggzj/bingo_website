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

Declaring those tables in `lib/db/src/schema/` would put them inside `db run push`'s scope
here. A push run from this repo for an unrelated coach change would then compare its
declaration against the live table and reconcile the difference — and the difference is
whatever h1_checker added since. Nothing would error; a column would simply be gone.

Raw SQL keeps the declaration out of the schema entirely, so no push from this repo can
reach those two tables. The cost is that the compiler does not check the column names. That
cost is paid by the repro tests plus the contract test in task 3.2, which is the only place
in this change that touches a real database.

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
