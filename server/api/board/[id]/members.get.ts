import { eq } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!

  const { canView, db } = await getBoardWithAccess(event, boardId)

  if (!canView) throw createError({ statusCode: 403, message: 'No access' })

  const rows = await db
    .select({
      id: schema.profiles.id,
      username: schema.profiles.username,
      firstName: schema.profiles.firstName,
      publicKey: schema.profileKeys.publicKey,
    })
    .from(schema.boardAccess)
    .innerJoin(schema.profiles, eq(schema.boardAccess.profileId, schema.profiles.id))
    .leftJoin(schema.profileKeys, eq(schema.boardAccess.profileId, schema.profileKeys.profileId))
    .where(eq(schema.boardAccess.boardId, boardId))
    .all()

  return rows
})
