ALTER TABLE "print_jobs" ADD COLUMN "site_id" text;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD COLUMN "completed_at" timestamp;