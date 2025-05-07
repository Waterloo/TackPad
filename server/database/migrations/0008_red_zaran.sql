CREATE TABLE `usage_quota` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`consumption` integer,
	`limit` integer DEFAULT 25000000,
	`updated_at` text,
	FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_board_settings` (
	`board_id` text PRIMARY KEY NOT NULL,
	`user_token` text,
	`profile_id` text,
	`last_accessed` text,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`board_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_board_settings`("board_id", "user_token", "profile_id", "last_accessed") SELECT "board_id", "user_token", "profile_id", "last_accessed" FROM `board_settings`;--> statement-breakpoint
DROP TABLE `board_settings`;--> statement-breakpoint
ALTER TABLE `__new_board_settings` RENAME TO `board_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_user_uploads` (
	`file_url` text PRIMARY KEY NOT NULL,
	`profile_id` text,
	`board_id` text,
	`file_name` text,
	`file_type` text,
	`file_size` integer,
	`created_at` text,
	FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`board_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_user_uploads`("file_url", "profile_id", "board_id", "file_name", "file_type", "file_size", "created_at") SELECT "file_url", "profile_id", "board_id", "file_name", "file_type", "file_size", "created_at" FROM `user_uploads`;--> statement-breakpoint
DROP TABLE `user_uploads`;--> statement-breakpoint
ALTER TABLE `__new_user_uploads` RENAME TO `user_uploads`;--> statement-breakpoint
CREATE INDEX `profile_id_index` ON `user_uploads` (`profile_id`);--> statement-breakpoint
CREATE INDEX `board_id_index` ON `user_uploads` (`board_id`);