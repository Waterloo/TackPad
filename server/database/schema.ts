import { boolean } from 'drizzle-orm/mysql-core'
import { sqliteTable, text, SQLiteBlobJson, integer } from 'drizzle-orm/sqlite-core'

export const BOARDS = sqliteTable('boards', {
    board_id: text('board_id').primaryKey(),
    data: text("data", {mode:"json"})
})

export const BOARD_SETTINGS = sqliteTable('board_settings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    board_id: text('board_id'),
    user_token: text('user_token'),
    profile_id: text('profile_id'),
    title: text('title'),
    is_owner: integer('is_owner', { mode: 'boolean' }).default(false),
    read_only: integer('read_only', { mode: 'boolean' }).default(false),
    is_private:integer('is_private', { mode: 'boolean' }).default(false),
    last_accessed: text('last_accessed'),
    last_modified: text('last_modified')
})

export const PROFILE = sqliteTable('Profile', {
    id: text('id').primaryKey(),
    firstName: text('firstName'),
    username: text('username').unique(),
    email: text('email'),
    authProvider: text('authProvider'),
    providerID: text('providerID'),
    createdAt: text('createdAt'),
})