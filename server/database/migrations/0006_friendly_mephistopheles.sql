PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text,
	`board_id` text,
	`file_name` text,
	`file_type` text,
	`file_size` integer,
	`file_url` text,
	`created_at` text
);
--> statement-breakpoint
INSERT INTO `__new_user_uploads`("id", "profile_id", "board_id", "file_name", "file_type", "file_size", "file_url", "created_at") SELECT "id", "profile_id", "board_id", "file_name", "file_type", "file_size", "file_url", "created_at" FROM `user_uploads`;--> statement-breakpoint
DROP TABLE `user_uploads`;--> statement-breakpoint
ALTER TABLE `__new_user_uploads` RENAME TO `user_uploads`;--> statement-breakpoint
PRAGMA foreign_keys=ON;