PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_uploads` (
	`file_url` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`board_id` text,
	`file_name` text,
	`file_type` text,
	`file_size` integer,
	`created_at` text
);
--> statement-breakpoint
INSERT INTO `__new_user_uploads`("file_url", "profile_id", "board_id", "file_name", "file_type", "file_size", "created_at") SELECT "file_url", "profile_id", "board_id", "file_name", "file_type", "file_size", "created_at" FROM `user_uploads`;--> statement-breakpoint
DROP TABLE `user_uploads`;--> statement-breakpoint
ALTER TABLE `__new_user_uploads` RENAME TO `user_uploads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `profile_id_index` ON `user_uploads` (`profile_id`);--> statement-breakpoint
CREATE INDEX `board_id_index` ON `user_uploads` (`board_id`);--> statement-breakpoint
CREATE INDEX `providerID_index` ON `Profile` (`username`);