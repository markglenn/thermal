CREATE TABLE "label_sizes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"width_dots" integer NOT NULL,
	"height_dots" integer NOT NULL,
	"unit" text DEFAULT 'in' NOT NULL,
	"dpi" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"label_id" text NOT NULL,
	"version" integer NOT NULL,
	"status" text,
	"archived_at" timestamp,
	"document" jsonb NOT NULL,
	"thumbnail" "bytea",
	"width_dots" integer,
	"height_dots" integer,
	"dpi" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "label_versions_label_id_version_unique" UNIQUE("label_id","version")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "print_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"label_id" text NOT NULL,
	"label_version" integer NOT NULL,
	"printer" text NOT NULL,
	"status" text NOT NULL,
	"copies" integer DEFAULT 1 NOT NULL,
	"total_chunks" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "label_versions" ADD CONSTRAINT "label_versions_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE no action ON UPDATE no action;