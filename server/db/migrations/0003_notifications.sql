CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_id` text NOT NULL REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`board_id` text REFERENCES `boards`(`id`) ON DELETE CASCADE,
	`read` integer NOT NULL DEFAULT false,
	`created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX `idx_notifications_recipient` ON `notifications`(`recipient_id`, `read`, `created_at`);
