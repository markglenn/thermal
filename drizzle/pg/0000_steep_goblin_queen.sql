CREATE TABLE "label_sizes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"width_inches" double precision NOT NULL,
	"height_inches" double precision NOT NULL,
	"dpi" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"label_id" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"document" jsonb NOT NULL,
	"thumbnail" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "label_versions_label_id_version_unique" UNIQUE("label_id","version")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "label_versions" ADD CONSTRAINT "label_versions_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;