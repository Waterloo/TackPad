export enum BoardAccessLevel {
  PUBLIC = "public",
  LIMITED_EDIT = "limited_edit",
  PRIVATE_SHARED = "private_shared",
  VIEW_ONLY = "view_only",
  ADMIN_ONLY = "admin_only", // Note: 'admin_only' seems like it might functionally overlap with owner/editor roles in BOARD_ACCESS. Ensure your API logic handles this consistently.
}

// Based on server/database/schema.ts BOARD_ACCESS.role enum
export enum BoardAccessRole {
  VIEWER = "viewer",
  EDITOR = "editor",
  OWNER = "owner", // Note: 'owner' role exists in the schema enum, often handled specially in logic.
}

// Type for individual user access details as returned by the API
// Matches the SELECT statement in /api/board/[id]/access.get.ts
export interface BoardAccessUser {
  id: number; // BOARD_ACCESS record ID (or 0 placeholder for owner if added manually)
  profileId: string; // PROFILE.id
  role: BoardAccessRole | "owner"; // Role from BOARD_ACCESS or the special 'owner' identifier
  username: string | null; // PROFILE.username
  firstName: string | null; // PROFILE.firstName
  lastAccessed: string | null; // BOARD_ACCESS.last_accessed (ISO string)
}

export interface BoardAccessDetails {
  boardId: string;
  accessLevel: BoardAccessLevel;
  owner: string; // Profile ID of the owner
  accessList: BoardAccessUser[];
}
