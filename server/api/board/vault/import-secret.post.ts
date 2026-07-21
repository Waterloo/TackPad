import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'
import type { EncryptedContentBlob, SecretKeyValueWidget, SecretNoteWidget } from '../../../../shared/types/board'
import { useDrizzle, schema } from '../../../utils/db'
import { getOrCreateVaultBoard, parseBoardData } from '../../../utils/secrets'
import { sqlNow } from '../../../utils/board'

type SecretImportBody = {
  kind: 'secret_note' | 'secret_kv'
  content: EncryptedContentBlob
  displayName?: string
}

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const body = await readBody<SecretImportBody>(event)

  if (!body || (body.kind !== 'secret_note' && body.kind !== 'secret_kv')) {
    throw createError({ statusCode: 400, message: 'Invalid secret kind.' })
  }

  if (!body.content?.ciphertext || !body.content?.iv || !Array.isArray(body.content.recipients)) {
    throw createError({ statusCode: 400, message: 'Invalid encrypted content payload.' })
  }

  if (!body.content.recipients.some(r => r.profileId === profileId)) {
    throw createError({ statusCode: 400, message: 'Encrypted content must include the current user as recipient.' })
  }

  const db = useDrizzle(event)
  const vault = await getOrCreateVaultBoard({
    db,
    profileId,
    now: sqlNow(),
  })

  const board = await db
    .select({ data: schema.boards.data })
    .from(schema.boards)
    .where(eq(schema.boards.id, vault.id))
    .get()

  const parsed = parseBoardData(board?.data ?? null)
  const existingItems = parsed.items
  const existingSecrets = Object.values(existingItems).filter(
    item => item.kind === 'secret_note' || item.kind === 'secret_kv',
  ).length

  const nowIso = new Date().toISOString()
  const offset = (existingSecrets % 10) * 26
  const baseItem = {
    x_position: 80 + offset,
    y_position: 80 + offset,
    lock: true,
    createdAt: nowIso,
    createdBy: profileId,
    lastUpdatedAt: nowIso,
    lastUpdatedBy: profileId,
  }

  const importedItem: SecretNoteWidget | SecretKeyValueWidget = body.kind === 'secret_note'
    ? {
        id: `SECRET_NOTE-${nanoid(10)}`,
        kind: 'secret_note',
        width: 280,
        height: 220,
        displayName: body.displayName?.trim() || `Imported Secret ${existingSecrets + 1}`,
        content: body.content,
        ...baseItem,
      }
    : {
        id: `SECRET_KV-${nanoid(10)}`,
        kind: 'secret_kv',
        width: 320,
        height: 240,
        displayName: body.displayName?.trim() || `Imported Keys ${existingSecrets + 1}`,
        content: body.content,
        ...baseItem,
      }

  const nextItems = {
    ...existingItems,
    [importedItem.id]: importedItem,
  }

  await db
    .update(schema.boards)
    .set({
      data: JSON.stringify({
        items: nextItems,
        drawings: parsed.drawings,
      }),
      updatedAt: sqlNow(),
    })
    .where(eq(schema.boards.id, vault.id))

  return {
    ok: true,
    boardId: vault.id,
    itemId: importedItem.id,
  }
})
