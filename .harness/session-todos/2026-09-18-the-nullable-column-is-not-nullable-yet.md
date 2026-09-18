---
title: The column is declared nullable and the database is not — guard the gap before ticket 011 lands
status: done
origin: review-board finding 1 on `2026-09-18-a-password-less-identity` (verdict Approve; the
  `production` lens recorded `mixed` for exactly this). Captured as residue rather than fixed in
  that change, per CLAUDE.md rule 4.
---

**摘要:** schema 说 `password_hash` 可以为空，真实数据库在有人跑 push 之前还不行。今天炸不了
（没有调用方），011 落地那天如果忘了 push 就会炸，而且是登录路由上的 500。要么给 auth 补一条
真库 contract 测试，要么把 push 写进 011 的前置项。

## The gap

`lib/db/src/schema/auth.ts` now declares `password_hash` nullable. The deployed Postgres still
carries `NOT NULL` until somebody runs `pnpm --filter @workspace/db run push` against it.

Between those two moments the repo is internally consistent and externally wrong. The first
call to `createPasswordlessUser` is a `NOT NULL` violation — surfacing as a 500 on a sign-in
route, which is the worst place for one.

**It cannot fire today**: `createPasswordlessUser` has zero production callers (verified
2026-09-18; only the interface and the two implementations mention it). It fires the day
`.harness/backlogs/011` (Google sign-in) ships, if the push was skipped.

**Nothing in the repo can catch it.** Vitest pins `DATABASE_URL` to a dummy and the auth tests
run against `memory-store`; neither touches a real database, so both stay green against a
column that would reject the write.

## Two ways to close it, and the first is the real one

1. **A contract test for the auth store, against a real scratch Postgres.** The shape already
   exists: `artifacts/api-server/src/lib/coach/store.contract.test.ts` runs the drizzle
   implementation only when `COACH_TEST_DATABASE_URL` points at a real database, and is inert
   otherwise. An auth equivalent that calls `createPasswordlessUser` and reads the row back
   proves the column accepts a null wherever it runs — including CI, once that variable is set.
   This is a guard; the other is a reminder.
2. **Make the push an explicit precondition item in `011`'s `tasks.md`**, so the change that
   first writes a null cannot be ticked without it. Cheap, and worth doing either way.

## Related, and deliberately not bundled here

`.harness/backlogs/007` — "make a schema push say which database it is about to change" — is the
ticket that makes running the push safe in the first place. It is not a blocker for this, but
this is the second time in a week that a change has had to write "run the push deliberately,
against a database you have confirmed" in prose because the tool will not say it.

---

## Closed 2026-09-18 — the gap is shut, by hand

`alter table users alter column password_hash drop not null;` run through
`railway connect Postgres-EBWW`. Verified in the same session with `\d users`: the Nullable
column for `password_hash` is now blank where `id`, `email` and `created_at` still read
`not null`. `\dt` confirms `waitlist` is untouched — nine tables, including it.

So the hazard this todo was written for is gone: ticket 011 can create a password-less row
whenever it ships, and the deployed database will accept it.

**Two things were learned on the way, and both are now in `replit.md` rather than only here:**

- **`pnpm --filter @workspace/db run push` cannot reach production from a laptop at all.**
  `railway run` supplies the service's own `DATABASE_URL`, whose host is
  `postgres-ebww.railway.internal` — resolvable only from inside Railway. It fails with
  `ENOTFOUND` before opening a connection, which is safe but reads like a bug rather than a
  design. Two attempts were spent on it before switching approach.
- **Which made the better tool the obvious one anyway.** One `alter table` changes one column;
  push would have reconciled the whole schema and offered to drop `waitlist` in the same
  breath, which is exactly what the other todo says not to do.

### What is still not built, and it is no longer urgent

The guard this todo proposed — an auth contract test against a real scratch Postgres, the shape
`lib/coach/store.contract.test.ts` already uses via `COACH_TEST_DATABASE_URL` — does not exist.
It would catch *future* divergence between `lib/db/src/schema/` and a deployed database, not
just this one. Worth a backlog ticket if that divergence ever bites again; not worth one on the
strength of a hazard that has been closed.
