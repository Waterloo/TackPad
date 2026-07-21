ALTER TABLE `boards`
  ADD `board_type` text NOT NULL DEFAULT 'standard';

CREATE TABLE `profile_keys` (
  `profile_id` text PRIMARY KEY NOT NULL,
  `public_key` text NOT NULL,
  `encrypted_private_key` text NOT NULL,
  `backup_salt` text NOT NULL,
  `backup_iv` text NOT NULL,
  `backup_version` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `one_off_secret_links` (
  `id` text PRIMARY KEY NOT NULL,
  `created_by` text NOT NULL,
  `kind` text NOT NULL,
  `payload` text NOT NULL,
  `consumed_at` text,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (`created_by`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS profile_keys_profile_id_idx
  ON profile_keys(profile_id);

CREATE INDEX IF NOT EXISTS one_off_secret_links_created_by_idx
  ON one_off_secret_links(created_by);
