CREATE TABLE `board_settings` (
	`board_id` text PRIMARY KEY NOT NULL,
	`user_token` text,
	`profile_id` text,
	`last_accessed` text
);
