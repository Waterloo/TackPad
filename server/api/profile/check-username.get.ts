import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const username = (query.username as string || '').toLowerCase().trim()

  if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
    return { available: false }
  }

  const db = useDrizzle(event)

  const existing = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.username, username))
    .get()

  return { available: !existing }
})
