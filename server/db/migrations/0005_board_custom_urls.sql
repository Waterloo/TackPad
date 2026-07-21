CREATE TABLE `board_custom_urls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`board_id` text NOT NULL,
	`custom_url` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `board_custom_urls_board_id_unique` ON `board_custom_urls` (`board_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `board_custom_urls_custom_url_unique` ON `board_custom_urls` (`custom_url`);--> statement-breakpoint
