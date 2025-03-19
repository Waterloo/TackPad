ALTER TABLE `Profile` ADD `username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `Profile_username_unique` ON `Profile` (`username`);