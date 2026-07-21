import { eq, and } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'
import { requireUsername } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireUsername(event)
  const boardId = getRouterParam(event, 'id')!
  const body = await readBody<{ profileId: string; role: 'editor' | 'viewer' }>(event)

  if (!body?.profileId || !body?.role) {
    throw createError({ statusCode: 400, message: 'profileId and role required' })
  }
  if (!['editor', 'viewer'].includes(body.role)) {
    throw createError({ statusCode: 400, message: 'role must be editor or viewer' })
  }

  const { board, isOwner, db } = await getBoardWithAccess(event, boardId)
  if (!isOwner) throw createError({ statusCode: 403, message: 'Only the owner can change roles' })
  if (board.boardType === 'vault') {
    throw createError({ statusCode: 400, message: 'Vault boards cannot be shared.' })
  }

  await db
    .update(schema.boardAccess)
    .set({ role: body.role })
    .where(and(
      eq(schema.boardAccess.boardId, boardId),
      eq(schema.boardAccess.profileId, body.profileId),
    ))

  return { ok: true }
})
