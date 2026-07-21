import { eq, and, gt } from 'drizzle-orm'
import { getBoardWithAccess, sqlNow } from '../../../../utils/board'
import { schema } from '../../../../utils/db'
import { requireUsername } from '../../../../utils/auth'
import { isSecretWidget } from '../../../../../shared/utils/secrets'

interface RestoreBody {
  checkpointId: string
}

export default defineEventHandler(async (event) => {
  requireUsername(event)
  const boardId = getRouterParam(event, 'id')!
  const { board, canEdit, profileId, db } = await getBoardWithAccess(event, boardId)

  if (!canEdit) throw createError({ statusCode: 403, message: 'Cannot edit this board' })

  const body = await readBody<RestoreBody>(event)
  if (!body.checkpointId) throw createError({ statusCode: 400, message: 'checkpointId is required' })

  // Fetch the checkpoint to restore
  const checkpoint = await db
    .select()
    .from(schema.checkpoints)
    .where(and(
      eq(schema.checkpoints.id, body.checkpointId),
      eq(schema.checkpoints.boardId, boardId),
    ))
    .get()

  if (!checkpoint) throw createError({ statusCode: 404, message: 'Checkpoint not found' })

  // Parse board data and verify item creator
  const data = board.data ? JSON.parse(board.data) : { items: {} }
  if (!data.items) data.items = {}

  const currentItem = data.items[checkpoint.itemId]
  if (currentItem?.createdBy !== profileId) {
    throw createError({ statusCode: 403, message: 'Only the item creator can restore checkpoints' })
  }
  if (currentItem && isSecretWidget(currentItem)) {
    throw createError({ statusCode: 400, message: 'Encrypted items do not support checkpoints.' })
  }

  // Patch the item back with the checkpoint content
  const restoredItem = JSON.parse(checkpoint.content)
  if (isSecretWidget(restoredItem)) {
    throw createError({ statusCode: 400, message: 'Encrypted items do not support checkpoints.' })
  }
  data.items[checkpoint.itemId] = restoredItem

  // Save updated board data
  await db
    .update(schema.boards)
    .set({ data: JSON.stringify(data), updatedAt: sqlNow() })
    .where(eq(schema.boards.id, boardId))

  // Delete all checkpoints newer than the restored one + their comments
  const newerCheckpoints = await db
    .select({ id: schema.checkpoints.id })
    .from(schema.checkpoints)
    .where(and(
      eq(schema.checkpoints.boardId, boardId),
      eq(schema.checkpoints.itemId, checkpoint.itemId),
      gt(schema.checkpoints.createdAt, checkpoint.createdAt),
    ))

  if (newerCheckpoints.length > 0) {
    const newerIds = newerCheckpoints.map(c => c.id)
    // Delete comments on newer checkpoints, then delete the checkpoints
    for (const cpId of newerIds) {
      await db.delete(schema.comments).where(eq(schema.comments.checkpointId, cpId))
      await db.delete(schema.checkpoints).where(eq(schema.checkpoints.id, cpId))
    }
  }

  return {
    restoredItem,
    itemId: checkpoint.itemId,
  }
})
