import { eq } from 'drizzle-orm'
import { getBoardWithAccess, sqlNow } from '../../../utils/board'
import { schema } from '../../../utils/db'
import { requireUsername } from '../../../utils/auth'
import type { BoardAccessLevel } from '../../../../shared/types/access'
import { upsertBoardCustomUrl } from '../../../utils/boardCustomUrl'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!
  const body = await readBody<{ title?: string; accessLevel?: BoardAccessLevel; customUrl?: string }>(event)

  const { board, isOwner, canEdit, db } = await getBoardWithAccess(event, boardId)

  if (!canEdit) throw createError({ statusCode: 403, message: 'No edit permission' })

  if (board.boardType === 'vault' && (body.accessLevel !== undefined || body.customUrl !== undefined)) {
    throw createError({ statusCode: 400, message: 'Vault boards do not support sharing settings.' })
  }

  // accessLevel change requires owner + username
  if (body.accessLevel !== undefined) {
    requireUsername(event)
    if (!isOwner) {
      throw createError({ statusCode: 403, message: 'Only the owner can change access level' })
    }
  }
  if (body.customUrl !== undefined) {
    requireUsername(event)
    if (!isOwner) {
      throw createError({ statusCode: 403, message: 'Only the owner can change custom URL' })
    }
  }

  const updates: Record<string, unknown> = { updatedAt: sqlNow() }
  if (body.title !== undefined)       updates.title       = body.title.trim() || board.title
  if (body.accessLevel !== undefined) updates.accessLevel = body.accessLevel

  await db.update(schema.boards).set(updates).where(eq(schema.boards.id, boardId))

  let customUrl: string | null = null
  if (body.customUrl !== undefined) {
    customUrl = await upsertBoardCustomUrl(db, boardId, body.customUrl)
  }

  return { ok: true, ...(customUrl !== null ? { customUrl } : {}) }
})
