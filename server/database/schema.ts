import { sqliteTable, text, SQLiteBlobJson } from 'drizzle-orm/sqlite-core'

export const BOARDS = sqliteTable('boards', {
    board_id: text('board_id').primaryKey(),
    data: text("data", {mode:"json"})
})

export const BOARD_SETTINGS = sqliteTable('board_settings', {
    board_id: text('board_id').primaryKey(),
    user_token: text('user_token'),
    profile_id: text('profile_id'),
    last_accessed: text('last_accessed')
})

export const PROFILE = sqliteTable('Profile', {
    id: text('id').primaryKey(),
    firstName: text('firstName'),
    email: text('email'),
    authProvider: text('authProvider'),
    providerID: text('providerID'),
    createdAt: text('createdAt'),
})