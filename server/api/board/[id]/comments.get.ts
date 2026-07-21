import { eq, and, desc } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!
  const { canView, db } = await getBoardWithAccess(event, boardId)

  if (!canView) throw createError({ statusCode: 403, message: 'Cannot view this board' })

  const query = getQuery(event)
  const itemId = query.itemId as string | undefined
  const checkpointId = query.checkpointId as string | undefined

  if (!itemId) throw createError({ statusCode: 400, message: 'itemId query param is required' })

  const conditions = [
    eq(schema.comments.boardId, boardId),
    eq(schema.comments.itemId, itemId),
  ]

  if (checkpointId) {
    conditions.push(eq(schema.comments.checkpointId, checkpointId))
  }

  const rows = await db
    .select({
      id: schema.comments.id,
      boardId: schema.comments.boardId,
      itemId: schema.comments.itemId,
      checkpointId: schema.comments.checkpointId,
      authorId: schema.comments.authorId,
      authorUsername: schema.profiles.username,
      content: schema.comments.content,
      createdAt: schema.comments.createdAt,
    })
    .from(schema.comments)
    .leftJoin(schema.profiles, eq(schema.comments.authorId, schema.profiles.id))
    .where(and(...conditions))
    .orderBy(desc(schema.comments.createdAt))

  return rows
})
