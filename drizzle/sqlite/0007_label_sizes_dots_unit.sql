-- Create new table with dots + unit columns (replacing width_inches/height_inches)
CREATE TABLE `label_sizes_new` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `width_dots` integer NOT NULL DEFAULT 0,
  `height_dots` integer NOT NULL DEFAULT 0,
  `unit` text NOT NULL DEFAULT 'in',
  `dpi` integer NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
-- Migrate existing data: convert inches to dots
INSERT INTO `label_sizes_new` (`id`, `name`, `width_dots`, `height_dots`, `unit`, `dpi`, `created_at`)
SELECT `id`, `name`,
  CAST(ROUND(`width_inches` * `dpi`) AS INTEGER),
  CAST(ROUND(`height_inches` * `dpi`) AS INTEGER),
  'in',
  `dpi`, `created_at`
FROM `label_sizes`;
--> statement-breakpoint
DROP TABLE `label_sizes`;
--> statement-breakpoint
ALTER TABLE `label_sizes_new` RENAME TO `label_sizes`;
