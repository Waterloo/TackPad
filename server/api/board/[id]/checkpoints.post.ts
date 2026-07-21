import { nanoid } from 'nanoid'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'
import { requireUsername } from '../../../utils/auth'
import { isSecretWidget } from '../../../../shared/utils/secrets'

interface CheckpointBody {
  itemId: string
  itemSnapshot?: any
}

export default defineEventHandler(async (event) => {
  requireUsername(event)
  const boardId = getRouterParam(event, 'id')!
  const { board, canEdit, profileId, db } = await getBoardWithAccess(event, boardId)

  if (!canEdit) throw createError({ statusCode: 403, message: 'Cannot edit this board' })

  const body = await readBody<CheckpointBody>(event)
  if (!body.itemId) throw createError({ statusCode: 400, message: 'itemId is required' })

  // Read current item from board data
  const data = board.data ? JSON.parse(board.data) : null
  const item = data?.items?.[body.itemId] ?? body.itemSnapshot
  if (!item) throw createError({ statusCode: 404, message: 'Item not found in board data' })
  if (isSecretWidget(item)) {
    throw createError({ statusCode: 400, message: 'Encrypted items do not support checkpoints.' })
  }

  // Only the item creator can save checkpoints
  if (item.createdBy !== profileId) {
    throw createError({ statusCode: 403, message: 'Only the item creator can save checkpoints' })
  }

  const id = `cp_${nanoid(12)}`

  await db.insert(schema.checkpoints).values({
    id,
    boardId,
    itemId: body.itemId,
    content: JSON.stringify(item),
    createdBy: profileId,
  })

  return { id, itemId: body.itemId, createdAt: new Date().toISOString() }
})
