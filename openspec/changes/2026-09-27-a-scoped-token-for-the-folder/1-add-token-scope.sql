-- Task 1.1 — what a personal token opens.
--
-- Additive and backward-safe by construction: `default 'coach'` means every token already
-- issued keeps exactly the access it was issued for, with no migration having to find them.
-- That default is the guarantee this change rests on — adding a second thing a token can reach
-- must not widen one that is already in somebody's hands.
--
-- Emitted by `pnpm --filter @workspace/db run generate` (drizzle/0002_lonely_sue_storm.sql).
-- Applied through `railway connect Postgres` — the path replit.md records; this repo has no push.
--
-- To undo: alter table coach_api_tokens drop column scope;

ALTER TABLE "coach_api_tokens" ADD COLUMN "scope" text DEFAULT 'coach' NOT NULL;
