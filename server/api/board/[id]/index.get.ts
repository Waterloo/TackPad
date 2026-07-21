import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/db'
import { sqlNow } from '../../../utils/board'
import { reserveDefaultCustomBoardUrl } from '../../../utils/boardCustomUrl'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!
  const { profileId } = event.context.session

  const db = useDrizzle(event)

  const board = await db
    .select()
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId))
    .get()

  if (!board) {
    throw createError({ statusCode: 404, message: 'Board not found' })
  }

  // Upsert board_access record (updates last_accessed)
  const existing = await db
    .select()
    .from(schema.boardAccess)
    .where(and(
      eq(schema.boardAccess.boardId, board.id),
      eq(schema.boardAccess.profileId, profileId),
    ))
    .get()

  if (existing) {
    await db
      .update(schema.boardAccess)
      .set({ lastAccessed: sqlNow() })
      .where(and(
        eq(schema.boardAccess.boardId, board.id),
        eq(schema.boardAccess.profileId, profileId),
      ))
  }
  else {
    // First visit — grant access based on board access level
    if (board.accessLevel === 'private') {
      throw createError({ statusCode: 403, message: 'This board is private. Ask the owner for an invite.' })
    }
    const role = board.accessLevel === 'public' ? 'editor' : 'viewer'
    await db.insert(schema.boardAccess).values({
      boardId: board.id,
      profileId,
      role,
    })
  }

  // Determine effective role
  const access = await db
    .select()
    .from(schema.boardAccess)
    .where(and(
      eq(schema.boardAccess.boardId, board.id),
      eq(schema.boardAccess.profileId, profileId),
    ))
    .get()

  const role = access?.role ?? 'viewer'
  const canEdit = role === 'owner' || role === 'editor'

  // Parse board data
  let data = null
  if (board.data) {
    try { data = JSON.parse(board.data) }
    catch { data = null }
  }

  const customUrlRow = await db
    .select({ customUrl: schema.boardCustomUrls.customUrl })
    .from(schema.boardCustomUrls)
    .where(eq(schema.boardCustomUrls.boardId, board.id))
    .get()
  const customUrl = customUrlRow?.customUrl ?? await reserveDefaultCustomBoardUrl(db, board.id, board.title)

  return {
    id: board.id,
    title: board.title,
    boardType: board.boardType,
    accessLevel: board.accessLevel,
    customUrl,
    ownerId: board.ownerId,
    canEdit,
    role,
    data,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  }
})
