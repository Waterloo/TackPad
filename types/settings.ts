export interface BoardSettingsRecord {
  id?: number; // Optional, might not always be present or needed client-side
  board_id: string;
  profile_id: string; // The profile ID this setting belongs to
  // user_token seems deprecated/removed in favor of profile_id, remove if not used
  // user_token?: string | null;
  last_accessed: string; // ISO Date string
  // You might add other user-specific settings here if needed, e.g.,
  // zoomLevel?: number;
  // lastPosition?: { x: number; y: number };
}

export type BoardSettings = Record<string, BoardSettingsRecord[]>;
