CREATE TABLE `print_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`label_id` text NOT NULL,
	`label_version` integer NOT NULL,
	`printer` text NOT NULL,
	`status` text NOT NULL,
	`copies` integer DEFAULT 1 NOT NULL,
	`total_chunks` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE no action
);