CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`profile_id` text NOT NULL,
	`name` text,
	`scopes` text,
	`expires_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_unique` ON `api_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `board_access` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`board_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`last_accessed` text DEFAULT (datetime('now')),
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `board_access_board_id_profile_id_unique` ON `board_access` (`board_id`,`profile_id`);--> statement-breakpoint
CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`title` text DEFAULT 'Untitled Board' NOT NULL,
	`data` text,
	`access_level` text DEFAULT 'public' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profile_authentications` (
	`profile_id` text NOT NULL,
	`provider_name` text NOT NULL,
	`provider_user_id` text NOT NULL,
	PRIMARY KEY(`profile_id`, `provider_name`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_authentications_provider_name_provider_user_id_unique` ON `profile_authentications` (`provider_name`,`provider_user_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text,
	`username` text,
	`email` text,
	`anonymous_token` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`file_url` text NOT NULL,
	`profile_id` text NOT NULL,
	`board_id` text,
	`file_name` text,
	`file_type` text,
	`file_size` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `usage_quotas` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`consumption` integer DEFAULT 0 NOT NULL,
	`quota_limit` integer DEFAULT 26214400 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
