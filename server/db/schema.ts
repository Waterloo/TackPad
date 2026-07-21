import { sqliteTable, text, integer, primaryKey, unique } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),                         // "usr_<nanoid>"
  firstName: text('first_name'),
  username: text('username').unique(),                  // Set-once user handle
  email: text('email'),
  anonymousToken: text('anonymous_token'),              // SHA-256 of cookie token
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// profile_authentications
// ---------------------------------------------------------------------------
export const profileAuthentications = sqliteTable('profile_authentications', {
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  providerName: text('provider_name').notNull(),        // "google" | "github"
  providerUserId: text('provider_user_id').notNull(),
}, (t) => [
  primaryKey({ columns: [t.profileId, t.providerName] }),
  unique().on(t.providerName, t.providerUserId),
])

// ---------------------------------------------------------------------------
// boards
// ---------------------------------------------------------------------------
export const boards = sqliteTable('boards', {
  id: text('id').primaryKey(),                          // "BOARD-<nanoid10>"
  ownerId: text('owner_id').references(() => profiles.id),
  title: text('title').notNull().default('Untitled Board'),
  boardType: text('board_type').notNull().default('standard'), // standard | vault
  data: text('data'),                                   // JSON: { items: { [id]: BoardItem } }
  accessLevel: text('access_level').notNull().default('public'), // public | private | view_only
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// board_custom_urls
// ---------------------------------------------------------------------------
export const boardCustomUrls = sqliteTable('board_custom_urls', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }).unique(),
  customUrl: text('custom_url').notNull().unique(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// board_access
// ---------------------------------------------------------------------------
export const boardAccess = sqliteTable('board_access', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('viewer'),       // viewer | editor | owner
  lastAccessed: text('last_accessed').default(sql`(datetime('now'))`),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => [
  unique().on(t.boardId, t.profileId),
])

// ---------------------------------------------------------------------------
// uploads
// ---------------------------------------------------------------------------
export const uploads = sqliteTable('uploads', {
  id: text('id').primaryKey(),                          // nanoid
  fileUrl: text('file_url').notNull(),                  // Full URL on S3/CDN
  objectKey: text('object_key'),
  profileId: text('profile_id').notNull().references(() => profiles.id),
  boardId: text('board_id').references(() => boards.id, { onDelete: 'set null' }),
  fileName: text('file_name'),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// usage_quotas
// ---------------------------------------------------------------------------
export const usageQuotas = sqliteTable('usage_quotas', {
  profileId: text('profile_id').primaryKey().references(() => profiles.id),
  consumption: integer('consumption').notNull().default(0),      // Bytes used
  quotaLimit: integer('quota_limit').notNull().default(26214400), // 25 MB
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// api_tokens
// ---------------------------------------------------------------------------
export const apiTokens = sqliteTable('api_tokens', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name'),                                   // "Chrome Extension", "Telegram Bot"
  scopes: text('scopes'),                               // JSON array of permitted scopes
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// profile_keys
// ---------------------------------------------------------------------------
export const profileKeys = sqliteTable('profile_keys', {
  profileId: text('profile_id').primaryKey().references(() => profiles.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  encryptedPrivateKey: text('encrypted_private_key').notNull(),
  backupSalt: text('backup_salt').notNull(),
  backupIv: text('backup_iv').notNull(),
  backupVersion: integer('backup_version').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// one_off_secret_links
// ---------------------------------------------------------------------------
export const oneOffSecretLinks = sqliteTable('one_off_secret_links', {
  id: text('id').primaryKey(),
  createdBy: text('created_by').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),                         // secret_note | secret_kv
  payload: text('payload').notNull(),                   // JSON: { version, algorithm, ciphertext, iv }
  consumedAt: text('consumed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// checkpoints
// ---------------------------------------------------------------------------
export const checkpoints = sqliteTable('checkpoints', {
  id: text('id').primaryKey(),                           // "cp_<nanoid>"
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),                     // widget ID within the board
  content: text('content').notNull(),                    // JSON snapshot of the full BoardItem
  createdBy: text('created_by').references(() => profiles.id),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// comments
// ---------------------------------------------------------------------------
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),                           // "cmt_<nanoid>"
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),                     // widget ID within the board
  checkpointId: text('checkpoint_id').references(() => checkpoints.id, { onDelete: 'cascade' }),
  authorId: text('author_id').references(() => profiles.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),                    // text with @[label](type:id) markers
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),                           // "notif_<nanoid>"
  recipientId: text('recipient_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),                          // 'mention_user'
  data: text('data').notNull(),                          // JSON: { mentionedBy, mentionedByUsername, boardId, boardTitle, itemId, itemKind, itemDisplayName, context }
  boardId: text('board_id').references(() => boards.id, { onDelete: 'cascade' }),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})
