import { nanoid } from 'nanoid'
import { eq, and } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'
import { requireUsername } from '../../../utils/auth'
import { isSecretWidget } from '../../../../shared/utils/secrets'

interface CommentBody {
  itemId: string
  checkpointId: string | null
  content: string
}

const MENTION_RE = /@\[([^\]]+)\]\(user:([^)]+)\)/g

export default defineEventHandler(async (event) => {
  requireUsername(event)
  const boardId = getRouterParam(event, 'id')!
  const { board, canView, profileId, db } = await getBoardWithAccess(event, boardId)

  if (!canView) throw createError({ statusCode: 403, message: 'Cannot access this board' })

  const body = await readBody<CommentBody>(event)
  if (!body.itemId || !body.content?.trim()) {
    throw createError({ statusCode: 400, message: 'itemId and content are required' })
  }

  const data = board.data ? JSON.parse(board.data) : null
  const item = data?.items?.[body.itemId]
  if (item && isSecretWidget(item)) {
    throw createError({ statusCode: 400, message: 'Encrypted items do not support comments.' })
  }

  const commentId = `cmt_${nanoid(12)}`

  await db.insert(schema.comments).values({
    id: commentId,
    boardId,
    itemId: body.itemId,
    checkpointId: body.checkpointId || null,
    authorId: profileId,
    content: body.content.trim(),
  })

  // Parse @[label](user:id) mentions and create notifications

  // Get sender info
  const sender = await db
    .select({ username: schema.profiles.username, firstName: schema.profiles.firstName })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .get()

  const senderName = sender?.username || sender?.firstName || 'Someone'

  let match: RegExpExecArray | null
  MENTION_RE.lastIndex = 0
  while ((match = MENTION_RE.exec(body.content)) !== null) {
    const recipientId = match[2]
    if (recipientId === profileId) continue // skip self-mentions

    // Verify recipient has board access
    const recipientAccess = await db
      .select({ role: schema.boardAccess.role })
      .from(schema.boardAccess)
      .where(and(
        eq(schema.boardAccess.boardId, boardId),
        eq(schema.boardAccess.profileId, recipientId),
      ))
      .get()

    if (!recipientAccess) continue

    const notifId = `notif_${nanoid(12)}`
    await db.insert(schema.notifications).values({
      id: notifId,
      recipientId,
      type: 'mention_user',
      data: JSON.stringify({
        mentionedBy: profileId,
        mentionedByUsername: senderName,
        boardId,
        boardTitle: board.title || 'Untitled Board',
        itemId: body.itemId,
        itemKind: item?.kind || 'unknown',
        itemDisplayName: item?.displayName || 'an item',
        context: body.content.slice(0, 120),
        isComment: true,
        commentId,
      }),
      boardId,
      read: false,
    })
  }

  return { id: commentId }
})
