import { eq, and } from 'drizzle-orm'
import { getBoardWithAccess, sqlNow } from '../../../utils/board'
import { schema } from '../../../utils/db'
import { requireUsername } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  requireUsername(event)
  const boardId = getRouterParam(event, 'id')!
  const body = await readBody<{ username: string; role?: 'editor' | 'viewer' }>(event)

  if (!body?.username) throw createError({ statusCode: 400, message: 'username required' })

  const role = body.role ?? 'editor'
  if (!['editor', 'viewer'].includes(role)) {
    throw createError({ statusCode: 400, message: 'role must be editor or viewer' })
  }

  const { board, isOwner, canEdit, profileId: callerId, db } = await getBoardWithAccess(event, boardId)
  if (!canEdit) throw createError({ statusCode: 403, message: 'No permission to invite' })
  if (board.boardType === 'vault') {
    throw createError({ statusCode: 400, message: 'Vault boards cannot be shared.' })
  }
  // Only owner can invite to private/view_only boards as editors
  if (!isOwner && role === 'editor') {
    throw createError({ statusCode: 403, message: 'Only the owner can grant editor access' })
  }

  // Find the invitee by username
  const invitee = await db
    .select({ id: schema.profiles.id, username: schema.profiles.username, firstName: schema.profiles.firstName })
    .from(schema.profiles)
    .where(eq(schema.profiles.username, body.username.trim().toLowerCase()))
    .get()

  if (!invitee) throw createError({ statusCode: 404, message: 'User not found' })
  if (invitee.id === callerId) throw createError({ statusCode: 400, message: 'Cannot invite yourself' })

  // Upsert access record (don't downgrade an existing owner)
  const existing = await db
    .select({ role: schema.boardAccess.role })
    .from(schema.boardAccess)
    .where(and(eq(schema.boardAccess.boardId, boardId), eq(schema.boardAccess.profileId, invitee.id)))
    .get()

  if (existing?.role === 'owner') {
    throw createError({ statusCode: 400, message: 'Cannot change the owner\'s role via invite' })
  }

  if (existing) {
    await db
      .update(schema.boardAccess)
      .set({ role })
      .where(and(eq(schema.boardAccess.boardId, boardId), eq(schema.boardAccess.profileId, invitee.id)))
  }
  else {
    await db.insert(schema.boardAccess).values({
      boardId,
      profileId: invitee.id,
      role,
      lastAccessed: sqlNow(),
    })
  }

  return { ok: true, invitee: { id: invitee.id, username: invitee.username, firstName: invitee.firstName } }
})
