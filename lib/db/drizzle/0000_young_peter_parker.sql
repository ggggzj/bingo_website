CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "coach_api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "coach_api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "coach_config" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"daily_minutes" integer DEFAULT 60 NOT NULL,
	"new_per_day" integer DEFAULT 2 NOT NULL,
	"sprint_window_days" integer DEFAULT 14 NOT NULL,
	"interview_date" date,
	"target_companies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_track" text DEFAULT 'sde' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_daily_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"day" date NOT NULL,
	"assigned_new" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assigned_reviews" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"planned_minutes" integer DEFAULT 0 NOT NULL,
	"solved" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"done" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "coach_daily_log_user_day_uq" UNIQUE("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "coach_problems" (
	"id" text PRIMARY KEY NOT NULL,
	"num" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"difficulty" text NOT NULL,
	"neetcode_group" text NOT NULL,
	"patterns" jsonb NOT NULL,
	"company_freq" jsonb NOT NULL,
	"followups" jsonb NOT NULL,
	"siblings" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_review_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"date" date NOT NULL,
	"mode" text NOT NULL,
	"grade" text NOT NULL,
	"interval_days" integer NOT NULL,
	"failed_on" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"problem_id" text NOT NULL,
	"state" text DEFAULT 'new' NOT NULL,
	"ease" real DEFAULT 2.5 NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"due" date,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_grade" text,
	"weak_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "coach_reviews_user_problem_uq" UNIQUE("user_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "new_grad_seen" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"listed" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_api_tokens" ADD CONSTRAINT "coach_api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_config" ADD CONSTRAINT "coach_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_daily_log" ADD CONSTRAINT "coach_daily_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_review_events" ADD CONSTRAINT "coach_review_events_review_id_coach_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."coach_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_reviews" ADD CONSTRAINT "coach_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_reviews" ADD CONSTRAINT "coach_reviews_problem_id_coach_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."coach_problems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "new_grad_seen" ADD CONSTRAINT "new_grad_seen_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coach_api_tokens_user_id_idx" ON "coach_api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coach_review_events_review_date_idx" ON "coach_review_events" USING btree ("review_id","date");--> statement-breakpoint
CREATE INDEX "coach_reviews_user_due_idx" ON "coach_reviews" USING btree ("user_id","due");