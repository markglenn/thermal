PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_label_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`label_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text,
	`document` text NOT NULL,
	`thumbnail` blob,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`label_id`) REFERENCES `labels`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_label_versions`("id", "label_id", "version", "status", "document", "thumbnail", "created_at") SELECT "id", "label_id", "version", "status", "document", "thumbnail", "created_at" FROM `label_versions`;--> statement-breakpoint
DROP TABLE `label_versions`;--> statement-breakpoint
ALTER TABLE `__new_label_versions` RENAME TO `label_versions`;--> statement-breakpoint
UPDATE `label_versions` SET `status` = NULL WHERE `status` != 'production';--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `label_versions_label_id_version_unique` ON `label_versions` (`label_id`,`version`);