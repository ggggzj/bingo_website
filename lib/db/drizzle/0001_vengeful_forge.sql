-- Three statements were removed from this generated file by hand, as
-- lib/db/src/schema/auth.ts instructs: drizzle-kit emitted ALTER TABLE on "users" and
-- "sessions" because meta/0000_snapshot.json still recorded a default those columns never
-- had. Those tables are h1_checker's DDL; nothing here may alter them. The snapshot has
-- caught up, so a later generate will not emit them again.
-- This change (2026-09-25-the-applications-i-already-sent) adds three tables and nothing else.

CREATE TABLE "application_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"hand" text NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "application_status" (
	"application_id" integer PRIMARY KEY NOT NULL,
	"status" text,
	"stage" text,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_status" ADD CONSTRAINT "application_status_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_events_application_idx" ON "application_events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "applications_user_idx" ON "applications" USING btree ("user_id");