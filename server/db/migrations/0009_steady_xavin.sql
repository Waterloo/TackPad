PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_usage_quota` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`consumption` integer,
	`limit` integer DEFAULT 250000000,
	`updated_at` text,
	FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_usage_quota`("profile_id", "consumption", "limit", "updated_at") SELECT "profile_id", "consumption", "limit", "updated_at" FROM `usage_quota`;--> statement-breakpoint
DROP TABLE `usage_quota`;--> statement-breakpoint
ALTER TABLE `__new_usage_quota` RENAME TO `usage_quota`;--> statement-breakpoint
PRAGMA foreign_keys=ON;