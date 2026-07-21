import { eq, and } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDrizzle, schema } from './db'

export function sqlNow(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

/**
 * Fetches a board + the caller's access record.
 * Throws 404 if the board doesn't exist.
 *
 * Access model:
 *   public    — canEdit for everyone; canView for everyone
 *   view_only — canView for everyone; canEdit only for owner/editor
 *   private   — canView/canEdit only for members in board_access
 */
export async function getBoardWithAccess(event: H3Event, boardId: string) {
  const { profileId } = event.context.session
  const db = useDrizzle(event)

  const board = await db
    .select()
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId))
    .get()

  if (!board) throw createError({ statusCode: 404, message: 'Board not found' })

  const access = await db
    .select()
    .from(schema.boardAccess)
    .where(and(
      eq(schema.boardAccess.boardId, boardId),
      eq(schema.boardAccess.profileId, profileId),
    ))
    .get()

  const role = access?.role ?? 'none'
  const isOwner = role === 'owner'
  const isMember = role !== 'none'

  const isVault = board.boardType === 'vault'
  const canView = isVault ? isOwner : board.accessLevel !== 'private' || isMember
  const canEdit = isVault ? isOwner : role === 'owner' || role === 'editor' || board.accessLevel === 'public'

  return { board, access, role, isOwner, isMember, canView, canEdit, profileId, db }
}
