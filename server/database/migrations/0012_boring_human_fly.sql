CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text,
	`profile_id` text,
	`expires_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_unique` ON `api_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `api_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `api_token_profile_idx` ON `api_tokens` (`profile_id`);--> statement-breakpoint
CREATE TABLE `oauth_apps` (
	`client_id` text PRIMARY KEY NOT NULL,
	`client_secret` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`redirect_uris` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE INDEX `oauth_apps_secret_idx` ON `oauth_apps` (`client_secret`);--> statement-breakpoint
CREATE TABLE `oauth_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`last_used_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_apps`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_token_client_idx` ON `oauth_tokens` (`client_id`);--> statement-breakpoint
CREATE INDEX `oauth_token_profile_idx` ON `oauth_tokens` (`profile_id`);--> statement-breakpoint
CREATE INDEX `oauth_token_expires_idx` ON `oauth_tokens` (`expires_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_boards` (
	`board_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`access_level` text DEFAULT 'public' NOT NULL,
	`data` text,
	FOREIGN KEY (`owner_id`) REFERENCES `Profile`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_boards`("board_id", "owner_id", "access_level", "data") SELECT "board_id", "owner_id", "access_level", "data" FROM `boards`;--> statement-breakpoint
DROP TABLE `boards`;--> statement-breakpoint
ALTER TABLE `__new_boards` RENAME TO `boards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;