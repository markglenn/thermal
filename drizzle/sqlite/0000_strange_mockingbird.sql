CREATE TABLE `label_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`label_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`document` text NOT NULL,
	`thumbnail` blob,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `label_versions_label_id_version_unique` ON `label_versions` (`label_id`,`version`);--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
