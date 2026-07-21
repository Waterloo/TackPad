import { eq, and, desc } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!
  const { canView, db } = await getBoardWithAccess(event, boardId)

  if (!canView) throw createError({ statusCode: 403, message: 'Cannot view this board' })

  const query = getQuery(event)
  const itemId = query.itemId as string | undefined
  if (!itemId) throw createError({ statusCode: 400, message: 'itemId query param is required' })

  const rows = await db
    .select({
      id: schema.checkpoints.id,
      boardId: schema.checkpoints.boardId,
      itemId: schema.checkpoints.itemId,
      content: schema.checkpoints.content,
      createdBy: schema.checkpoints.createdBy,
      createdByUsername: schema.profiles.username,
      createdAt: schema.checkpoints.createdAt,
    })
    .from(schema.checkpoints)
    .leftJoin(schema.profiles, eq(schema.checkpoints.createdBy, schema.profiles.id))
    .where(and(
      eq(schema.checkpoints.boardId, boardId),
      eq(schema.checkpoints.itemId, itemId),
    ))
    .orderBy(desc(schema.checkpoints.createdAt))

  return rows.map(r => ({
    ...r,
    content: JSON.parse(r.content),
  }))
})
