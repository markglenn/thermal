CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text,
	"action" text NOT NULL,
	"target_id" text,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
