# Design — move-onto-the-surviving-database

Five decisions. The first three are about not corrupting four rows; the last two are about
being able to undo it.

## D1 — The remap is a literal, written down and read back, never "keep the ids"

The failure this change exists to avoid is silent. This site's `user_id 1` is
`christineguo610@gmail.com`; the surviving side's `id 1` is `zguo7940@usc.edu`. Copying rows
with their ids intact violates nothing, errors nowhere, and hands four rows of one person's
practice history to another.

So the mapping is stated once, as data:

```
this site 1  →  surviving 3     christineguo610@gmail.com
this site 3  →  surviving 1     zguo7940@usc.edu
```

and every statement that moves a row joins through it rather than carrying `user_id`.

**It is checked by reading back, not by trusting the write.** After the move, each moved row's
`user_id` is resolved to an email on the surviving side and compared to the email it had on
this one. Four rows; the check costs one query and is the only thing standing between this and
a mistake nobody would notice for months.

`this site 3 → surviving 1` is in the table even though the owner's account moves nothing.
A mapping with one row in it invites the reader to wonder about the other.

## D2 — The six tables are generated from the schema, not hand-written

The owner decided (2026-09-20) that this repo keeps ownership of `coach_*` and `new_grad_seen`.
That makes `lib/db/src/schema/` the source of the DDL — so the DDL should come *out of it*
mechanically rather than be retyped.

**Options.** (a) Hand-write six `CREATE TABLE` statements, as `new_grad_seen` was written on
2026-09-19. (b) `drizzle-kit generate` the SQL, review it, apply it through `railway connect`.
(c) `drizzle-kit push` against the surviving database.

**Choice: (b).** One table hand-written is a paste; six with their indexes, defaults and
foreign keys is a transcription exercise, and a column that silently differs from the schema is
a bug that appears weeks later as a type error in production. (c) is what D4 makes impossible,
for reasons that have nothing to do with these six tables.

The generated SQL is reviewed before it is run, because generation is not the same as
correctness: these tables reference `users`, which this repo no longer owns, and the foreign
keys must point at the surviving table rather than recreate it.

## D3 — `sessions` is not carried, and that is a feature

Five session rows exist here. A session is an unexpired cookie bound to an origin; moving one
moves a credential whose only property is that it stops working. Worse, `sessions` exists on
**both** sides already — h1_checker has its own — so "moving" them means merging two live
credential tables to save the owner one login.

The owner signs in again. That is the whole cost, and it is also the cheapest possible
end-to-end proof that the move worked.

## D4 — `push` is removed, not discouraged

`.harness/backlogs/018` asks that a push be made *unable* to reach the surviving database.
Documentation does not make anything unable.

**Options.** (a) A warning in `replit.md`. (b) A guard in `drizzle.config.ts` that refuses
unless an explicit override variable is set. (c) Delete the `push` and `push-force` scripts.

**Choice: (c), with (b) behind it.** A script that does not exist cannot be run by habit, by a
future session reading an old note, or by tab-completion. The config guard stays as the second
line for anyone invoking `drizzle-kit` directly.

What replaces it is `generate` — SQL out, applied by hand through `railway connect`, which is
already how both previous production schema changes were made and is recorded in `replit.md`
under Run & Operate.

The reason is arithmetic: after the move this repo's schema describes **six** tables in a
database holding **twenty-seven**. Whole-schema reconciliation from here reads h1_checker's
entire application as unknown. `replit.md` already records a push offering to drop `waitlist`
over a single stray table.

## D5 — Nothing is deleted, so the rollback is one environment variable

The old database is not modified by this change at any point. Rows are read from it and written
to the surviving one; nothing is dropped, truncated or updated there.

That gives a rollback with no data path: **point `DATABASE_URL` back and redeploy.** The old
rows are exactly where they were.

The cost is a window where two databases hold the same four rows and either could be written
to. It is bounded by the cutover, it is the owner's own two accounts, and the alternative —
deleting as we go — trades a recoverable mistake for an unrecoverable one.

Cleaning up the old database is deliberately **not** in this change. It is a separate decision,
made after the move has been lived with, and it belongs in its own session-todo rather than at
the end of a checklist somebody is tired by the time they reach.
