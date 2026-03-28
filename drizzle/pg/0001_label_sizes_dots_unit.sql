ALTER TABLE "label_sizes" ADD COLUMN "width_dots" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "label_sizes" ADD COLUMN "height_dots" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "label_sizes" ADD COLUMN "unit" text NOT NULL DEFAULT 'in';
--> statement-breakpoint
UPDATE "label_sizes" SET
  "width_dots" = CAST(ROUND("width_inches" * "dpi") AS INTEGER),
  "height_dots" = CAST(ROUND("height_inches" * "dpi") AS INTEGER),
  "unit" = 'in';
--> statement-breakpoint
ALTER TABLE "label_sizes" DROP COLUMN "width_inches";
--> statement-breakpoint
ALTER TABLE "label_sizes" DROP COLUMN "height_inches";
