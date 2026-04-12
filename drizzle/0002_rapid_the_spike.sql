ALTER TABLE "print_jobs" ALTER COLUMN "label_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "print_jobs" ALTER COLUMN "label_version" DROP NOT NULL;