PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_board_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text,
	`user_token` text,
	`profile_id` text,
	`title` text,
	`is_owner` integer DEFAULT false,
	`read_only` integer DEFAULT false,
	`last_accessed` text
);
--> statement-breakpoint
INSERT INTO `__new_board_settings`("id", "board_id", "user_token", "profile_id", "title", "is_owner", "read_only", "last_accessed") SELECT "id", "board_id", "user_token", "profile_id", "title", "is_owner", "read_only", "last_accessed" FROM `board_settings`;--> statement-breakpoint
DROP TABLE `board_settings`;--> statement-breakpoint
ALTER TABLE `__new_board_settings` RENAME TO `board_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;