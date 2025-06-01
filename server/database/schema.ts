import { InferInsertModel, InferSelectModel, sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey, // Import primaryKey for composite keys
  uniqueIndex, // Import uniqueIndex for unique constraints
} from "drizzle-orm/sqlite-core";

// --- PROFILE Table (Simplified) ---
// Represents the core user identity in your system, independent of auth method.
export const PROFILE = sqliteTable(
  "Profile",
  {
    id: text("id").primaryKey(), // Your internal unique user ID (e.g., UUID)
    firstName: text("firstName"),
    username: text("username").unique(), // Keep username if it's a distinct concept from provider usernames
    email: text("email"), // Maybe the primary email, could be updated
    user_token: text("user_token"),
    createdAt: text("createdAt"),
  },
  // No need for providerID or authProvider here anymore
  // Index on username is good if you query by it often
  (table) => [index("username_idx").on(table.username)], // Example if needed
);

// --- NEW: PROFILE_AUTHENTICATIONS Table ---
// Links a user profile to one or more external authentication providers.
export const PROFILE_AUTHENTICATIONS = sqliteTable(
  "profile_authentications",
  {
    // Using provider_name + provider_user_id as the natural composite primary key
    // Alternatively, you could add an 'id' column as a surrogate key if preferred.

    profile_id: text("profile_id")
      .notNull()
      .references(() => PROFILE.id, { onDelete: "cascade" }), // Cascade delete: if profile is deleted, remove associated auth methods
    provider_name: text("provider_name").notNull(), // e.g., 'github', 'google'
    provider_user_id: text("provider_user_id").notNull(), // The unique ID provided by the external provider (e.g., GitHub user ID, Google subject ID)
    // Optional: Store provider-specific email or other details if needed
    // provider_email: text("provider_email"),
    // provider_username: text("provider_username"),
  },
  (table) => ({
    // Composite Primary Key: Ensures a user can only link a specific provider account once.
    pk: primaryKey({ columns: [table.profile_id, table.provider_name] }),
    // Unique Index: Ensures a specific external account (provider + its ID) can only be linked to ONE profile in your system. Crucial for security.
    providerUniqueIdx: uniqueIndex("provider_unique_idx").on(
      table.provider_name,
      table.provider_user_id,
    ),
    // Index for faster lookup of auth methods for a given profile
    profileIdx: index("auth_profile_idx").on(table.profile_id),
  }),
);

// --- BOARDS Table (Updated) ---
export enum BoardAccessLevel {
  PUBLIC = "public", // Anyone can view/edit
  LIMITED_EDIT = "limited_edit", // Anyone view, invited edit
  PRIVATE_SHARED = "private_shared", // Invited view/edit
  VIEW_ONLY = "view_only", // Anyone view, admin edit
  ADMIN_ONLY = "admin_only", // Admin view/edit
}
const boardAccessLevelValues = Object.values(BoardAccessLevel) as [
  string,
  ...string[],
];
// References the unified PROFILE.id
export const BOARDS = sqliteTable("boards", {
  board_id: text("board_id").primaryKey(),
  owner_id: text("owner_id")
    .notNull()
    .references(() => PROFILE.id), // Assuming PROFILE table exists

  // Updated access_level column
  access_level: text("access_level", { enum: boardAccessLevelValues }) // Enforce values
    .notNull()
    .default(BoardAccessLevel.PUBLIC), // Set a sensible default

  data: text("data", { mode: "json" }),
});

export const BOARD_SETTINGS = sqliteTable("board_settings", {
  board_id: text("board_id")
    .primaryKey()
    .references(() => BOARDS.board_id),
  user_token: text("user_token"),
  profile_id: text("profile_id").references(() => PROFILE.id),
  last_accessed: text("last_accessed"),
});
export enum BoardAccessRole {
  VIEWER = "viewer",
  EDITOR = "editor",
  OWNER = "owner",
}
const boardAccessRoleValues = Object.values(BoardAccessRole) as [
  string,
  ...string[],
];

export const BOARD_ACCESS = sqliteTable(
  "board_access",
  {
    id: integer("id").primaryKey({ autoIncrement: true }), // Unique ID for the access record (e.g., generate UUID in application)
    board_id: text("board_id")
      .notNull()
      .references(() => BOARDS.board_id, { onDelete: "cascade" }), // If board deleted, remove access records
    profile_id: text("profile_id")
      .notNull()
      .references(() => PROFILE.id, { onDelete: "cascade" }), // If profile deleted, remove access records

    // Role granted to this profile for this specific board (e.g., for invited users)
    role: text("role", { enum: boardAccessRoleValues }).notNull(),

    // Timestamps
    created_at: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`), // Record creation time (first access/invitation)
    last_accessed: text("last_accessed")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`), // Tracks the most recent interaction time
    // Consider adding .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`) if your DB supports it and Drizzle dialect,
    // otherwise, you'll update this field manually in your application logic on each access.
  },
  (table) => ({
    // Ensures a profile has only one access/role entry per board
    boardProfileUniqueIdx: uniqueIndex("board_profile_unique_idx").on(
      table.board_id,
      table.profile_id,
    ),
    // Indexes for common lookups
    boardIdx: index("access_board_idx").on(table.board_id), // Find all users for a board
    profileIdx: index("access_profile_idx").on(table.profile_id), // Find all boards a user has access to
  }),
);
export const USER_UPLOADS = sqliteTable(
  "user_uploads",
  {
    file_url: text("file_url").primaryKey(),
    profile_id: text("profile_id").references(() => PROFILE.id),
    board_id: text("board_id").references(() => BOARDS.board_id),
    file_name: text("file_name"),
    file_type: text("file_type"),
    file_size: integer("file_size"),
    created_at: text("created_at"),
  },
  (table) => [
    index("profile_id_index").on(table.profile_id),
    index("board_id_index").on(table.board_id),
  ],
);

export type InsertUserUpload = InferInsertModel<typeof USER_UPLOADS>;

export const USAGE_QUOTA = sqliteTable("usage_quota", {
  profile_id: text("profile_id")
    .primaryKey()
    .references(() => PROFILE.id),
  consumption: integer("consumption"),
  limit: integer("limit").default(25000000),
  updated_at: text("updated_at"),
});
