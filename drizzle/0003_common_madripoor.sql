CREATE TABLE "variable_banks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"fields" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
