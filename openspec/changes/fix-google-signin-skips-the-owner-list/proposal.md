# Proposal — fix-google-signin-skips-the-owner-list

`counterpart: ../h1_checker/openspec/changes/archive/2026-09-21-fix-google-signin-skips-the-owner-list`

## Why

Signing in with Google on this site creates a row in `users` and stops. The owner's email
list is `registrations`, and whether an address is confirmed is `email_verifications` —
neither is written, so a person who arrives through this page is invisible on the dashboard.

**This became a live defect on 2026-09-21, not before.** Until that day this site had its own
database (`Postgres-EBWW`) with four tables and no `registrations` at all, so there was
nothing to write and no list to be absent from. The cutover in
`2026-09-20-move-onto-the-surviving-database` pointed `DATABASE_URL` at h1_checker's
database — measured today: `coach_problems` (150 rows) and `registrations` (61 addresses)
now sit in one database, and `users` holds 13. From that moment this route writes the same
`users` table the dashboard reads around, and every Google sign-in here adds an invisible
person.

h1_checker fixed the identical defect on its own two Google paths the same day
(D-053 there). It found three such identities and the owner backfilled them; the count is
0 right now, and this route is the one remaining way to make it climb again.

**Nothing here is new behaviour.** `sign-in`'s existing requirement "Signing in with Google
needs no password and no mail" already says the address is proven; this change records that
proof where the product reads it, and sends no mail doing it.

## What Changes

- **The `AuthStore` seam grows one method**, `recordProvenAddress(email, now)` — the seam the
  routes already take, so the route stays testable against memory and the Postgres details
  stay in one file.
- `InMemoryAuthStore` records it, so the tests assert behaviour rather than a mock's script.
- `DrizzleAuthStore` writes two idempotent rows: `registrations` (one per `(email, client_id)`,
  and this site has no install, so `client_id` is NULL) and `email_verifications` with
  `verified_at` stamped — the row that already means proven to both readers.
- The `/google` route calls it after the identity is settled and before the session is opened.

**Repro** (RED, committed at `51028db`): three tests in
`artifacts/api-server/src/routes/auth.test.ts` — the proved address reaches the list, it
reaches it once however many sign-ins, and a refused token puts nobody there. Baseline before
them: 36 of 36 green in that file; with them, 3 failed / 36 passed.

**Guard:** the other 36, unamended — in particular "a password account meeting its Google
owner loses its password", "the owner keeps their password", and "a refused token creates
nothing and leaves no session".

### The decision this change needs from the owner

**How does the Drizzle store reach two tables another repo owns?**

- **(a) Raw SQL through the existing client, no schema declaration** (recommended). h1_checker's
  `models.py` owns these tables and migrates them lazily at runtime — it added
  `email_verifications.last_verified_at` that way. If this repo declares them in
  `lib/db/src/schema/`, they enter `db run push`'s scope, and a push from here would try to
  reconcile *its* idea of those tables with the real ones. The failure mode is a column
  h1_checker added being dropped by a push this repo runs for an unrelated coach change.
  CLAUDE.md already warns that one `DATABASE_URL` is shared; this keeps the two repos'
  schema ownership from overlapping at all.
- (b) Declare both tables in `lib/db/src/schema/`. Type-safe and conventional here, and it puts
  two tables this repo does not own under a push this repo runs.

## Non-goals

- **Not declaring `registrations` or `email_verifications` in the Drizzle schema.** See the
  decision above; `lib/db` stays the source of truth for the tables this repo owns.
- **Not mailing anybody.** `sign-in` already requires no mail on this path, and the
  verification row exists to say "proven", not to record a message.
- **Not touching `users`, the password-clearing rule, or the owner exemption.**
- **Not changing `lib/api-spec/openapi.yaml`.** The response shape does not move, so no codegen.
- **Not the dashboard.** It reads `registrations` and was always right; it had nothing to read.
- **Not backfilling.** h1_checker's owner already ran it and the invisible count is 0. This
  change stops it climbing; there is nothing here to repair.
