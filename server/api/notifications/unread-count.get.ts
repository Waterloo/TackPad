import { eq, and, count } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session

  const db = useDrizzle(event)

  const [result] = await db
    .select({ count: count() })
    .from(schema.notifications)
    .where(and(
      eq(schema.notifications.recipientId, profileId),
      eq(schema.notifications.read, false),
    ))

  return { count: result?.count ?? 0 }
})
