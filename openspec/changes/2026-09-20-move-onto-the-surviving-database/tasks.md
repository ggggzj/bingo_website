# Tasks — move-onto-the-surviving-database

**Most of this has no Vitest, and saying so is part of the design.** The `AuthStore` seam means
no test in this repo knows which Postgres is behind drizzle, which is exactly why the move is
safe to make — and exactly why the proof is a query against production rather than a green
suite. Where a task has a test, it names it. Where it does not, it names the query that stands
in for one.

Groups 1 and 2 change nothing that anybody is using: they are reversible by `DROP TABLE` and by
`git revert`. The cutover is group 4, and it is one environment variable.

## 1. Stop this repo from being able to reconcile a database it does not own

- [x] 1.1 `lib/db/package.json`: delete the `push` and `push-force` scripts, add
      `generate` (`drizzle-kit generate --config ./drizzle.config.ts`). A script that does not
      exist cannot be run out of habit.
- [x] 1.2 `lib/db/drizzle.config.ts`: refuse to run a push at all — throw with a message naming
      `openspec/changes/2026-09-20-move-onto-the-surviving-database` and what to do instead.
      Second line behind 1.1, for anyone invoking `drizzle-kit` directly.
      **Test:** none possible — it is a config module read by a CLI. The proof is running
      `pnpm --filter @workspace/db run push` and seeing it fail to resolve the script.
- [x] 1.3 `lib/db/src/schema/auth.ts`: a comment at the top of `usersTable` and `sessionsTable`
      saying h1_checker owns this DDL after the move (owner decision 2026-09-20) and that this
      file exists for types. `coach.ts` and `new-grad.ts` get the opposite note: owned here,
      applied by `generate` and by hand.
- [x] 1.4 `replit.md` Run & Operate: `push` is gone and why; `generate` is what to run; the
      apply path is `railway connect`, beside the two statements already recorded there.

## 2. Create the seven tables on the surviving side

- [x] 2.1 Run `generate` and **read the SQL it produces**. The foreign keys must reference the
      surviving `users`, not recreate it. Attach the reviewed SQL to the PR — it is the thing
      being run against production and the only artifact of this group.
- [ ] 2.2 Apply it through `railway connect Postgres` (the surviving database; `Postgres-EBWW`
      is this site's — they are two services in one project and the names are one letter apart
      in a menu).
      **Proof:** `\d coach_config` and `\d new_grad_seen` there show the tables with their
      foreign keys pointing at that database's `users`.
- [ ] 2.3 Copy `coach_problems` — 150 rows, global, no user key. A coach with no bank is not a
      coach.
      **Proof:** `select count(*) from coach_problems` returns 150 on the surviving side.

## 3. Move four rows through the remap, and read them back

- [ ] 3.1 Write the remap as a literal in the migration SQL, both directions, with the email
      beside each id — `1 → 3` and `3 → 1`, per design D1. The owner's own row maps to nothing
      and is in the table anyway, so the reader does not wonder about it.
- [ ] 3.2 Move the four rows: `coach_api_tokens` (2), `coach_config` (1), `coach_daily_log` (1),
      joining through the remap rather than carrying `user_id`. `coach_reviews` and
      `new_grad_seen` are empty and move nothing.
- [ ] 3.3 **Read back and compare by email, not by id.** For each moved row, resolve its new
      `user_id` to an address on the surviving side and check it equals the address it had here.
      Four rows. This is the only check that catches the crossed-id mistake, and the mistake it
      catches is invisible afterwards.
      **Proof:** the query and its output go in the PR.

## 4. Cut over

- [ ] 4.1 Point `artifacts/api-server`'s `DATABASE_URL` at the surviving database and redeploy.
      One variable. Nothing in this repo's code changes.
- [ ] 4.2 The owner signs in again — sessions were deliberately not carried (design D3), so this
      is expected and is also the end-to-end proof.
      **Proof:** signing in with the owner's existing password works, `/account` shows the
      address, and `/dashboard/new-grad` loads rather than erroring on a missing table.
- [ ] 4.3 Sign in as `christineguo610@gmail.com` and confirm the coach page shows **that
      account's** history — the four rows under the right person. If they appear under the
      owner instead, 3.3 was skipped.
- [ ] 4.4 Say somewhere a person reads that signing in here does not sign in the extension.
      Cookies are per-origin; "one address on both surfaces" means the credential works on
      both. Without this the first support question is why they were asked twice.

## 5. Say what changed, and leave the old database alone

- [ ] 5.1 `replit.md`: which database the site runs against, who owns which tables in it, and
      the rollback — point `DATABASE_URL` back, because nothing was deleted (design D5).
- [ ] 5.2 `.harness/backlogs/018`: status and a pointer to this change. Its counterpart
      `../h1_checker/.harness/backlogs/015` is the other half and ships separately.
- [ ] 5.3 A session-todo for cleaning up the old database — **not** a task here. It is a
      separate decision made after this has been lived with, and the end of a long checklist is
      the worst place to decide to delete something.
