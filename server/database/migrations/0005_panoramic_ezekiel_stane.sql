CREATE TABLE `user_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text,
	`board_id` text,
	`file_name` text,
	`file_type` text,
	`file_size` text,
	`file_url` text,
	`created_at` text
);
