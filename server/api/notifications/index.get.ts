import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'
import type { Notification, NotificationData } from '~~/shared/types/notification'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 20, 50)
  const offset = Number(query.offset) || 0

  const db = useDrizzle(event)

  const rows = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.recipientId, profileId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit)
    .offset(offset)
    .all()

  return rows.map((row): Notification => ({
    id: row.id,
    recipientId: row.recipientId,
    type: row.type as Notification['type'],
    data: JSON.parse(row.data) as NotificationData,
    boardId: row.boardId,
    read: row.read,
    createdAt: row.createdAt,
  }))
})
