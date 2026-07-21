import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const notifId = getRouterParam(event, 'id')!

  const db = useDrizzle(event)

  const result = await db
    .update(schema.notifications)
    .set({ read: true })
    .where(and(
      eq(schema.notifications.id, notifId),
      eq(schema.notifications.recipientId, profileId),
    ))
    .returning({ id: schema.notifications.id })

  if (!result.length) {
    throw createError({ statusCode: 404, message: 'Notification not found' })
  }

  return { success: true }
})
