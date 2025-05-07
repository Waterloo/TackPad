import { InferInsertModel } from "drizzle-orm";
import {
  sqliteTable,
  text,
  SQLiteBlobJson,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

export const BOARDS = sqliteTable("boards", {
  board_id: text("board_id").primaryKey(),
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

export const PROFILE = sqliteTable(
  "Profile",
  {
    id: text("id").primaryKey(),
    firstName: text("firstName"),
    username: text("username").unique(),
    email: text("email"),
    authProvider: text("authProvider"),
    providerID: text("providerID"),
    createdAt: text("createdAt"),
  },
  (table) => [index("providerID_index").on(table.username)]
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
  ]
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
