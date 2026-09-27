-- Task 1.2 — the three tables this change adds, to run against the surviving database.
--
-- Emitted by `pnpm --filter @workspace/db run generate` (drizzle/0001_vengeful_forge.sql) and
-- copied here because this repo applies schema by statement, not by migration runner:
-- `push` is gone (it would offer to drop h1_checker's twenty-one tables) and the recorded
-- path is `railway connect Postgres` — see replit.md, Run & Operate.
--
-- **Three statements the generator emitted are deliberately absent**: ALTER TABLE on
-- "users" and "sessions" to drop a default and a NOT NULL. They appeared because
-- drizzle/meta/0000_snapshot.json still recorded defaults those columns never had in the
-- surviving database. Those two tables are h1_checker's DDL (owner decision 2026-09-20) and
-- nothing in this repo may alter them; lib/db/src/schema/auth.ts says so in its header and
-- predicted this exact residue.
--
-- Additive only: three CREATE TABLEs, two foreign keys to tables that already exist, two
-- indexes. It reads nothing and changes no existing row. To undo, drop the three tables in
-- the reverse of the order below.
--
-- Which database: `Postgres`, not `Postgres-EBWW`. The second is the old one that nothing
-- has read since 2026-09-21.

CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_key" text NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"location" text,
	"locations_all" text,
	"region" text,
	"url" text,
	"ats" text,
	"imported_status" text NOT NULL,
	"applied_date" date,
	"saved_date" date,
	"job_type" text,
	"csv_notes" text,
	"dup_count" integer DEFAULT 1 NOT NULL,
	"jd_markdown" text,
	"jd_path" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_user_source_key" UNIQUE("user_id","source_key")
);

CREATE TABLE "application_status" (
	"application_id" integer PRIMARY KEY NOT NULL,
	"status" text,
	"stage" text,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "application_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"hand" text NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"value" text
);

ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "application_status" ADD CONSTRAINT "application_status_application_id_applications_id_fk"
	FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk"
	FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "applications_user_idx" ON "applications" USING btree ("user_id");

CREATE INDEX "application_events_application_idx" ON "application_events" USING btree ("application_id");
