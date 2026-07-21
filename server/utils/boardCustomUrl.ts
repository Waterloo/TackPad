import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from './db'
import { sqlNow } from './board'

const MAX_CUSTOM_URL_LENGTH = 256
const INVALID_URL_CHARS = /[\u0000-\u001F\u007F/#?]/

export function normalizeCustomBoardUrl(input: string): string {
  return input.trim().toLowerCase()
}

export function assertCustomBoardUrl(rawValue: string): string {
  const value = normalizeCustomBoardUrl(rawValue)

  if (!value) {
    throw createError({ statusCode: 400, message: 'Custom URL cannot be empty' })
  }
  if (value.length > MAX_CUSTOM_URL_LENGTH) {
    throw createError({ statusCode: 400, message: `Custom URL cannot exceed ${MAX_CUSTOM_URL_LENGTH} characters` })
  }
  if (INVALID_URL_CHARS.test(value)) {
    throw createError({ statusCode: 400, message: 'Custom URL contains invalid URL characters' })
  }

  return value
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'board'
}

function randomDigits(length: number): string {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 10).toString()
  }
  return out
}

export function buildDefaultCustomBoardUrl(title: string): string {
  const base = slugifyTitle(title)
  const suffix = randomDigits(4)
  const joined = `${base}-${suffix}`
  return joined.slice(0, MAX_CUSTOM_URL_LENGTH)
}

type Db = ReturnType<typeof useDrizzle>

export async function reserveDefaultCustomBoardUrl(db: Db, boardId: string, title: string): Promise<string> {
  const existingByBoard = await db
    .select({ customUrl: schema.boardCustomUrls.customUrl })
    .from(schema.boardCustomUrls)
    .where(eq(schema.boardCustomUrls.boardId, boardId))
    .get()

  if (existingByBoard?.customUrl) {
    return existingByBoard.customUrl
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = attempt === 0
      ? buildDefaultCustomBoardUrl(title)
      : `${slugifyTitle(title)}-${randomDigits(4 + Math.min(attempt, 4))}`.slice(0, MAX_CUSTOM_URL_LENGTH)

    try {
      await db.insert(schema.boardCustomUrls).values({
        boardId,
        customUrl: candidate,
        createdAt: sqlNow(),
        updatedAt: sqlNow(),
      })
      return candidate
    }
    catch (err: any) {
      const msg = String(err?.message ?? '')
      if (msg.includes('board_custom_urls.custom_url')) continue
      if (msg.includes('board_custom_urls.board_id')) {
        const existing = await db
          .select({ customUrl: schema.boardCustomUrls.customUrl })
          .from(schema.boardCustomUrls)
          .where(eq(schema.boardCustomUrls.boardId, boardId))
          .get()
        if (existing?.customUrl) return existing.customUrl
      }
      throw err
    }
  }

  throw createError({ statusCode: 500, message: 'Failed to generate unique custom URL' })
}

export async function upsertBoardCustomUrl(db: Db, boardId: string, requested: string): Promise<string> {
  const customUrl = assertCustomBoardUrl(requested)

  const existingByUrl = await db
    .select({ boardId: schema.boardCustomUrls.boardId })
    .from(schema.boardCustomUrls)
    .where(eq(schema.boardCustomUrls.customUrl, customUrl))
    .get()

  if (existingByUrl && existingByUrl.boardId !== boardId) {
    throw createError({ statusCode: 409, message: 'That custom URL is already in use' })
  }

  const existingByBoard = await db
    .select({ id: schema.boardCustomUrls.id })
    .from(schema.boardCustomUrls)
    .where(eq(schema.boardCustomUrls.boardId, boardId))
    .get()

  if (existingByBoard) {
    await db
      .update(schema.boardCustomUrls)
      .set({ customUrl, updatedAt: sqlNow() })
      .where(eq(schema.boardCustomUrls.boardId, boardId))
    return customUrl
  }

  await db.insert(schema.boardCustomUrls).values({
    boardId,
    customUrl,
    createdAt: sqlNow(),
    updatedAt: sqlNow(),
  })

  return customUrl
}
