-- Custom SQL migration file, put your code below! --

-- FTS5 full-text search index for cross-board item search.
-- Not managed by Drizzle schema.ts (Drizzle doesn't support FTS5 virtual tables).
-- Rebuilt per-board on each debounced save (DELETE + batch INSERT from the save endpoint).
-- Must use lowercase "fts5" — D1 rejects uppercase "FTS5".

CREATE VIRTUAL TABLE IF NOT EXISTS board_items_fts USING fts5(
  board_id UNINDEXED,
  item_id  UNINDEXED,
  kind     UNINDEXED,
  owner_id UNINDEXED,
  text
);