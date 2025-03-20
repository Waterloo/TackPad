ALTER TABLE `board_settings` ADD `title` text;--> statement-breakpoint
ALTER TABLE `board_settings` ADD `is_owner` integer DEFAULT false;