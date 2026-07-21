import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { schema, useDrizzle } from './db'
import { FREE_QUOTA_BYTES } from '../../shared/constants/upload'

export function extensionFromName(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  if (idx < 0) return ''
  return fileName.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function storageKeyForFile(fileName: string): string {
  const ext = extensionFromName(fileName)
  return ext ? `${nanoid()}.${ext}` : nanoid()
}

export async function ensureQuotaRow(
  db: ReturnType<typeof useDrizzle>,
  profileId: string,
) {
  const existing = await db
    .select()
    .from(schema.usageQuotas)
    .where(eq(schema.usageQuotas.profileId, profileId))
    .get()

  if (existing) return existing

  await db.insert(schema.usageQuotas).values({
    profileId,
    consumption: 0,
    quotaLimit: FREE_QUOTA_BYTES,
  })

  return await db
    .select()
    .from(schema.usageQuotas)
    .where(eq(schema.usageQuotas.profileId, profileId))
    .get()
}

export async function recalculateOwnerConsumption(
  db: ReturnType<typeof useDrizzle>,
  ownerId: string,
) {
  const total = await db
    .select({
      bytes: sql<number>`coalesce(sum(${schema.uploads.fileSize}), 0)`,
    })
    .from(schema.uploads)
    .innerJoin(schema.boards, eq(schema.uploads.boardId, schema.boards.id))
    .where(eq(schema.boards.ownerId, ownerId))
    .get()

  const quota = await ensureQuotaRow(db, ownerId)
  await db.update(schema.usageQuotas)
    .set({
      consumption: Number(total?.bytes ?? 0),
      quotaLimit: quota?.quotaLimit ?? FREE_QUOTA_BYTES,
      updatedAt: sql`(datetime('now'))`,
    })
    .where(eq(schema.usageQuotas.profileId, ownerId))
}

export async function resolveBoardOwner(
  db: ReturnType<typeof useDrizzle>,
  boardId: string,
): Promise<string | null> {
  const board = await db
    .select({ ownerId: schema.boards.ownerId })
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId))
    .get()

  return board?.ownerId ?? null
}

export async function findUploadInBoard(
  db: ReturnType<typeof useDrizzle>,
  uploadId: string,
  boardId: string,
) {
  return await db
    .select()
    .from(schema.uploads)
    .where(and(
      eq(schema.uploads.id, uploadId),
      eq(schema.uploads.boardId, boardId),
    ))
    .get()
}
