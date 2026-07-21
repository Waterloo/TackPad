-- checkpoints table
CREATE TABLE IF NOT EXISTS `checkpoints` (
  `id` text PRIMARY KEY NOT NULL,
  `board_id` text NOT NULL REFERENCES `boards`(`id`) ON DELETE CASCADE,
  `item_id` text NOT NULL,
  `content` text NOT NULL,
  `created_by` text REFERENCES `profiles`(`id`),
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `idx_checkpoints_board_item_time` ON `checkpoints` (`board_id`, `item_id`, `created_at`);

-- comments table
CREATE TABLE IF NOT EXISTS `comments` (
  `id` text PRIMARY KEY NOT NULL,
  `board_id` text NOT NULL REFERENCES `boards`(`id`) ON DELETE CASCADE,
  `item_id` text NOT NULL,
  `checkpoint_id` text REFERENCES `checkpoints`(`id`) ON DELETE CASCADE,
  `author_id` text REFERENCES `profiles`(`id`) ON DELETE CASCADE,
  `content` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS `idx_comments_board_item_checkpoint` ON `comments` (`board_id`, `item_id`, `checkpoint_id`);
