# Proposal — a-password-less-identity

## Why

`lib/db/src/schema/auth.ts:22` says every identity has a password:

```ts
passwordHash: text("password_hash").notNull(),
```

That was true while a password was the only way in. Signing in with Google produces an
identity with **no password at all** — that is the point of it — and the code that does so is
already written, tested and deployed in `../h1_checker` (`POST /auth/google`, `google_auth.py`).

The owner decided on 2026-09-13 that the two databases become one and the extension's
survives. Measured the same day: **that database already permits an empty password_hash; this
repo's does not, and this repo's schema declares it cannot exist.** So after the merge this
repo would read rows its own types say are impossible.

Nothing here migrates a column. What changes is this repo's belief about one.

Origin: `.harness/backlogs/010-let-an-identity-exist-without-a-password.md`, counterpart
`../h1_checker/.harness/backlogs/015-one-account-on-both-surfaces.md`. It blocks that ticket's
merge step, `.harness/backlogs/011` (Google sign-in here) and `.harness/backlogs/018`.

## What Changes

- **`lib/db/src/schema/auth.ts`** — `passwordHash` drops `.notNull()`.
- **The `AuthStore` seam** — `UserRecord.passwordHash` becomes `string | null`, and the
  interface gains a way to create a user without one. `drizzle-store` and `memory-store` both
  follow, as does `toRecord`'s row type.
- **Tests pin what is already true.** Grounding this ticket found the dangerous part already
  safe, in two independent places — see `design.md`. Neither is stated as deliberate anywhere,
  so the change adds the tests that make them properties instead of accidents.

## What does not change

**No behaviour, today.** A password-less row cannot exist in this database until something
creates one, and nothing does: Google sign-in on this site is `.harness/backlogs/011`, and the
rows that have no password are in the other database until `018` moves them. This change makes
such a row *representable and safely handled* — it does not make one.

That is why it can land on its own, ahead of both.

## Non-goals

- **Google sign-in** (`.harness/backlogs/011`) — the thing that will create these identities.
- **The account merge** (`.harness/backlogs/018`) — moving the rows, repointing `DATABASE_URL`,
  the password rule. The order is fixed by the counterpart and this change is first: the line
  changes, then the rows move, then `DATABASE_URL` is repointed. Repointing first would leave
  the site reading a database that does not hold its data yet.
- **Password reset**, and **removing the password form**. Neither is touched.
- **Pushing the schema.** See `design.md` §3 — the push is a deploy step with a named hazard,
  not part of this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

**None, and it is worth saying why.** No file under `openspec/specs/` specifies signing in —
the specs cover the coach, the dashboard shell, the job feed and the company bank. The
capability this change sits under does not exist yet, and `.harness/backlogs/011` is the change
that will write it. Declaring `skip_specs: true` here rather than inventing half a `sign-in`
spec keeps that ticket's job whole.
