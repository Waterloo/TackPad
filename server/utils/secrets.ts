import { nanoid } from 'nanoid'
import { and, eq, inArray } from 'drizzle-orm'
import type { BoardItem, BoardType } from '../../shared/types/board'
import { isSecretWidget, isVaultAllowedItem } from '../../shared/utils/secrets'
import { schema } from './db'

export function parseBoardData(dataJson: string | null): {
  items: Record<string, BoardItem>
  drawings: Record<string, unknown>
} {
  if (!dataJson) return { items: {}, drawings: {} }

  try {
    const parsed = JSON.parse(dataJson) as {
      items?: Record<string, BoardItem>
      drawings?: Record<string, unknown>
    }
    return {
      items: parsed.items ?? {},
      drawings: parsed.drawings ?? {},
    }
  }
  catch {
    return { items: {}, drawings: {} }
  }
}

export function assertVaultBoardPayload(
  boardType: BoardType,
  items: Record<string, BoardItem>,
  drawings?: Record<string, unknown>,
): void {
  if (boardType !== 'vault') return

  for (const item of Object.values(items)) {
    if (!isVaultAllowedItem(item)) {
      throw createError({
        statusCode: 400,
        message: `Vault boards only allow encrypted items and text labels. "${item.kind}" is not supported.`,
      })
    }
  }

  if (drawings && Object.keys(drawings).length > 0) {
    throw createError({
      statusCode: 400,
      message: 'Vault boards do not support drawings.',
    })
  }
}

export async function assertSecretItemIntegrity(options: {
  db: ReturnType<typeof import('./db').useDrizzle>
  boardId: string
  profileId: string
  existingItems: Record<string, BoardItem>
  incomingItems: Record<string, BoardItem>
}): Promise<void> {
  const { db, boardId, profileId, existingItems, incomingItems } = options

  const memberRows = await db
    .select({
      profileId: schema.boardAccess.profileId,
      username: schema.profiles.username,
      hasKey: schema.profileKeys.profileId,
    })
    .from(schema.boardAccess)
    .innerJoin(schema.profiles, eq(schema.boardAccess.profileId, schema.profiles.id))
    .leftJoin(schema.profileKeys, eq(schema.boardAccess.profileId, schema.profileKeys.profileId))
    .where(eq(schema.boardAccess.boardId, boardId))
    .all()

  const members = new Map(memberRows.map(row => [row.profileId, row]))

  for (const [itemId, existingItem] of Object.entries(existingItems)) {
    if (!isSecretWidget(existingItem)) continue
    if (existingItem.createdBy === profileId) continue
    const incoming = incomingItems[itemId]
    if (!incoming || JSON.stringify(existingItem) !== JSON.stringify(incoming)) {
      throw createError({
        statusCode: 403,
        message: 'Only the secret owner can change encrypted items.',
      })
    }
  }

  for (const [itemId, item] of Object.entries(incomingItems)) {
    if (!isSecretWidget(item)) continue

    if (item.createdBy !== profileId) {
      const existing = existingItems[itemId]
      if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
        throw createError({
          statusCode: 403,
          message: 'Only the secret owner can update encrypted items.',
        })
      }
      continue
    }

    const recipientIds = item.content.recipients.map(r => r.profileId)
    if (!recipientIds.includes(profileId)) {
      throw createError({
        statusCode: 400,
        message: 'Encrypted items must always include the owner as a recipient.',
      })
    }

    const uniqueRecipientIds = [...new Set(recipientIds)]
    if (uniqueRecipientIds.length !== recipientIds.length) {
      throw createError({
        statusCode: 400,
        message: 'Encrypted item recipients must be unique.',
      })
    }

    const invalidRecipient = uniqueRecipientIds.find((recipientId) => {
      if (recipientId === profileId) return false
      const member = members.get(recipientId)
      return !member || !member.username || !member.hasKey
    })

    if (invalidRecipient) {
      throw createError({
        statusCode: 400,
        message: 'Encrypted item recipients must already be board members with a username and encryption key.',
      })
    }
  }
}

export async function getOrCreateVaultBoard(options: {
  db: ReturnType<typeof import('./db').useDrizzle>
  profileId: string
  now: string
}): Promise<{ id: string; title: string }> {
  const { db, profileId, now } = options

  const existing = await db
    .select({ id: schema.boards.id, title: schema.boards.title })
    .from(schema.boards)
    .where(and(
      eq(schema.boards.ownerId, profileId),
      eq(schema.boards.boardType, 'vault'),
    ))
    .get()

  if (existing) return existing

  const id = `BOARD-${nanoid(10)}`
  const title = 'Vault'

  await db.insert(schema.boards).values({
    id,
    ownerId: profileId,
    title,
    boardType: 'vault',
    data: JSON.stringify({ items: {}, drawings: {} }),
    accessLevel: 'private',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(schema.boardAccess).values({
    boardId: id,
    profileId,
    role: 'owner',
  })

  return { id, title }
}

export async function lookupProfilesWithKeys(
  db: ReturnType<typeof import('./db').useDrizzle>,
  profileIds: string[],
) {
  if (profileIds.length === 0) return []

  return await db
    .select({
      profileId: schema.profiles.id,
      username: schema.profiles.username,
      publicKey: schema.profileKeys.publicKey,
    })
    .from(schema.profiles)
    .leftJoin(schema.profileKeys, eq(schema.profiles.id, schema.profileKeys.profileId))
    .where(inArray(schema.profiles.id, profileIds))
    .all()
}
