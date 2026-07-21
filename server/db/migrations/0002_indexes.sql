-- Performance indexes — none of these exist in 0000_real_cyclops.sql (only UNIQUE constraints).
-- Every missing index here causes a full-table scan on high-traffic code paths.

-- profiles.anonymous_token: queried on 100% of API requests (auth middleware)
CREATE INDEX IF NOT EXISTS profiles_anonymous_token_idx
  ON profiles(anonymous_token);

-- board_access.profile_id: queried by /api/board/list and every auth resolve
CREATE INDEX IF NOT EXISTS board_access_profile_id_idx
  ON board_access(profile_id);

-- board_access.board_id: queried on board load and share panel
CREATE INDEX IF NOT EXISTS board_access_board_id_idx
  ON board_access(board_id);

-- boards.owner_id: queried on board lookups and owner checks
CREATE INDEX IF NOT EXISTS boards_owner_id_idx
  ON boards(owner_id);

-- uploads: queried by quota checks and cascade deletes
CREATE INDEX IF NOT EXISTS uploads_board_id_profile_id_idx
  ON uploads(board_id, profile_id);
