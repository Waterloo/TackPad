import { nanoid } from 'nanoid'
import { eq, and } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'
import { requireUsername } from '../../utils/auth'

interface MentionBody {
  recipientId: string
  boardId: string
  boardTitle: string
  itemId: string
  itemKind: string
  itemDisplayName: string
  context: string
}

export default defineEventHandler(async (event) => {
  requireUsername(event)
  const { profileId } = event.context.session
  const body = await readBody<MentionBody>(event)

  // Skip self-mentions
  if (body.recipientId === profileId) {
    return { skipped: true }
  }

  const db = useDrizzle(event)

  // Verify the sender has access to the board
  const access = await db
    .select({ role: schema.boardAccess.role })
    .from(schema.boardAccess)
    .where(and(
      eq(schema.boardAccess.boardId, body.boardId),
      eq(schema.boardAccess.profileId, profileId),
    ))
    .get()

  if (!access) throw createError({ statusCode: 403, message: 'No board access' })

  // Get sender's username
  const sender = await db
    .select({ username: schema.profiles.username, firstName: schema.profiles.firstName })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .get()

  const id = `notif_${nanoid(12)}`

  await db.insert(schema.notifications).values({
    id,
    recipientId: body.recipientId,
    type: 'mention_user',
    data: JSON.stringify({
      mentionedBy: profileId,
      mentionedByUsername: sender?.username || sender?.firstName || 'Someone',
      boardId: body.boardId,
      boardTitle: body.boardTitle,
      itemId: body.itemId,
      itemKind: body.itemKind,
      itemDisplayName: body.itemDisplayName,
      context: body.context,
    }),
    boardId: body.boardId,
    read: false,
  })

  return { id }
})
