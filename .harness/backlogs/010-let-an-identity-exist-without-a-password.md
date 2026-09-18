---
id: 010
title: Let an identity exist without a password, because Google sign-in makes one
status: picked-up
produced: openspec/changes/2026-09-18-a-password-less-identity/ — proposal drafted 2026-09-18,
  awaiting owner approval. Grounding found both halves of this ticket's stated risk already
  handled (verifyPassword refuses unreadable values; the call site guards with ?? DECOY_HASH),
  so the change pins them with tests instead of adding defensive code.
origin: Owner decision 2026-09-13, recorded in
  ../h1_checker/.harness/backlogs/015-one-account-on-both-surfaces.md — one database, the
  extension's survives, password-less identities allowed. This is the website half; the
  extension half is already written and committed.
counterpart: ../h1_checker/.harness/backlogs/015-one-account-on-both-surfaces.md
blocks: that ticket's merge step, and the Google sign-in already committed in the
  extension repo (openspec/changes/google-signin-on-the-pairing-page)
---

## One word, and it is in the one place Rule 6 will not let through

`lib/db/src/schema/auth.ts:22`:

```ts
passwordHash: text("password_hash").notNull(),
```

`.notNull()` says an identity always has a password. That was true when a password was the
only way in. **Signing in with Google produces an identity with no password at all** — that
is the point of it, and the code that does so is already written, tested and committed in
the extension repo.

So after the two databases become one, this repo will read rows its own schema says cannot
exist.

Rule 6 names `lib/db/src/schema/` as never-trivial regardless of size, which is why a
one-word change gets a ticket. That rule is right here: the column is what every session
lookup and every password check reads through.

## What is actually true today

Measured on the two production databases, 2026-09-13:

| | column allows empty | schema declares |
|---|---|---|
| the extension's database (the one that survives) | **yes** | — |
| this repo's database | no | `.notNull()` |

The surviving database already permits it. Nothing here needs a migration against the column
it is moving to — what needs to change is this repo's belief about it.

## What done looks like

- `passwordHash` is declared as possibly absent, and the type system says so rather than
  being told a comfortable lie.
- Every place that reads it is made to handle an absent one. `verifyPassword` is the one that
  matters: it must answer "no" for an identity with no password, never throw, and never treat
  absent as a match.
- Signing in with a password against a Google-made identity is refused the same way a wrong
  password is — the same answer, so nothing learns from the difference which kind of identity
  an address has.
- Nobody who has a password notices anything.

## Notes for whoever picks this up

- **`verifyPassword` is the risk, not the schema line.** Flipping the type makes TypeScript
  point at every reader; the one to look at hardest is the one that compares a supplied
  password against a stored hash. An absent hash must be a refusal, and it must not be
  distinguishable from a wrong password in what the caller can observe.
- **Ticket 007 is about to matter.** It wants a schema push to say which database it is
  changing. This ticket is a schema change landing in the same week the two databases merge —
  exactly the situation 007 exists to make safe. Doing 007 first is defensible.
- **The order across repos is fixed** and is recorded in the counterpart: this line changes
  **before** the rows move, and the rows move before this repo's `DATABASE_URL` is repointed.
  Repointing first would leave the website reading a database that does not yet hold its data.
