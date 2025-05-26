-- First add new columns and tables while keeping old columns
CREATE TABLE `board_access` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `board_id` text NOT NULL,
    `profile_id` text NOT NULL,
    `role` text NOT NULL,
    `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    `last_accessed` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    FOREIGN KEY (`board_id`) REFERENCES `boards` (`board_id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`profile_id`) REFERENCES `Profile` (`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `board_profile_unique_idx` ON `board_access` (`board_id`, `profile_id`);

--> statement-breakpoint
CREATE INDEX `access_board_idx` ON `board_access` (`board_id`);

--> statement-breakpoint
CREATE INDEX `access_profile_idx` ON `board_access` (`profile_id`);

--> statement-breakpoint
-- Create the profile_authentications table
CREATE TABLE `profile_authentications` (
    `profile_id` text NOT NULL,
    `provider_name` text NOT NULL,
    `provider_user_id` text NOT NULL,
    PRIMARY KEY (`profile_id`, `provider_name`),
    FOREIGN KEY (`profile_id`) REFERENCES `Profile` (`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE UNIQUE INDEX `provider_unique_idx` ON `profile_authentications` (`provider_name`, `provider_user_id`);

--> statement-breakpoint
CREATE INDEX `auth_profile_idx` ON `profile_authentications` (`profile_id`);

--> statement-breakpoint
-- Add new columns to existing tables
ALTER TABLE `Profile` ADD `user_token` text;

--> statement-breakpoint
CREATE INDEX `username_idx` ON `Profile` (`username`);

--> statement-breakpoint
-- Add new columns to boards table
ALTER TABLE `boards` ADD `owner_id` text REFERENCES Profile (id);

--> statement-breakpoint
ALTER TABLE `boards` ADD `access_level` text DEFAULT 'public' NOT NULL;

--> statement-breakpoint
-- MIGRATION DATA STEP: Populate the profile_authentications table from existing Profile data
INSERT INTO
    profile_authentications (profile_id, provider_name, provider_user_id)
SELECT
    id,
    authProvider,
    providerID
FROM
    Profile
WHERE
    authProvider IS NOT NULL
    AND providerID IS NOT NULL;

--> statement-breakpoint
-- Update boards.owner_id with a default value if needed (assuming some relationship to Profile)
-- This is a critical step - you may need to customize this query based on your data relationships
UPDATE boards
SET
    owner_id = (
        SELECT
            id
        FROM
            Profile
        LIMIT
            1
    )
WHERE
    owner_id IS NULL;

--> statement-breakpoint
-- Now that data is migrated, we can drop the old columns
ALTER TABLE `Profile`
DROP COLUMN `authProvider`;

--> statement-breakpoint
ALTER TABLE `Profile`
DROP COLUMN `providerID`;

--> statement-breakpoint
DROP INDEX IF EXISTS `providerID_index`;
