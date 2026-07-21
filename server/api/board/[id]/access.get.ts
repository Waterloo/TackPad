import { eq } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!

  const { canView, isOwner, db } = await getBoardWithAccess(event, boardId)

  if (!canView) throw createError({ statusCode: 403, message: 'No access' })

  // Return access list with profile data — full list only visible to owner
  const rows = await db
    .select({
      profileId:    schema.boardAccess.profileId,
      role:         schema.boardAccess.role,
      lastAccessed: schema.boardAccess.lastAccessed,
      createdAt:    schema.boardAccess.createdAt,
      firstName:    schema.profiles.firstName,
      username:     schema.profiles.username,
    })
    .from(schema.boardAccess)
    .innerJoin(schema.profiles, eq(schema.boardAccess.profileId, schema.profiles.id))
    .where(eq(schema.boardAccess.boardId, boardId))
    .all()

  // Non-owners see only their own record
  if (!isOwner) {
    const { profileId } = event.context.session
    return rows.filter(r => r.profileId === profileId)
  }

  return rows
})
