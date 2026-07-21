import { eq, and } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'
import { requireUsername } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!
  const body = await readBody<{ profileId: string }>(event)

  if (!body?.profileId) throw createError({ statusCode: 400, message: 'profileId required' })

  const { board, isOwner, profileId: callerId, db } = await getBoardWithAccess(event, boardId)
  if (board.boardType === 'vault') {
    throw createError({ statusCode: 400, message: 'Vault boards cannot be shared.' })
  }

  // Owner can remove anyone; users can remove themselves
  if (!isOwner && body.profileId !== callerId) {
    throw createError({ statusCode: 403, message: 'Not allowed' })
  }

  // Removing someone else requires a username
  if (body.profileId !== callerId) {
    requireUsername(event)
  }

  // Cannot remove the owner
  const target = await db
    .select({ role: schema.boardAccess.role })
    .from(schema.boardAccess)
    .where(and(
      eq(schema.boardAccess.boardId, boardId),
      eq(schema.boardAccess.profileId, body.profileId),
    ))
    .get()

  if (target?.role === 'owner') {
    throw createError({ statusCode: 400, message: 'Cannot remove the board owner' })
  }

  await db
    .delete(schema.boardAccess)
    .where(and(
      eq(schema.boardAccess.boardId, boardId),
      eq(schema.boardAccess.profileId, body.profileId),
    ))

  return { ok: true }
})
