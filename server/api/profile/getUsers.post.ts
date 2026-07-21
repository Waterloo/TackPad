import { inArray } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids: string[] }>(event)

  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, message: 'ids must be a non-empty array' })
  }

  if (body.ids.length > 50) {
    throw createError({ statusCode: 400, message: 'Cannot look up more than 50 users at once' })
  }

  const db = useDrizzle(event)

  const profiles = await db
    .select({
      id: schema.profiles.id,
      username: schema.profiles.username,
      firstName: schema.profiles.firstName,
      email: schema.profiles.email,
    })
    .from(schema.profiles)
    .where(inArray(schema.profiles.id, body.ids))

  return profiles
})
