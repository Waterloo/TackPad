import { eq } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!

  const { isOwner, db } = await getBoardWithAccess(event, boardId)

  if (!isOwner) throw createError({ statusCode: 403, message: 'Only the owner can delete this board' })

  // Cascade: board_access, uploads foreign keys handle themselves (onDelete: cascade/set null)
  await db.delete(schema.boards).where(eq(schema.boards.id, boardId))

  return { ok: true }
})
