import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'

interface ProfilePatchBody {
  firstName?: string
  username?: string
  email?: string
}

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const body = await readBody<ProfilePatchBody>(event)

  const db = useDrizzle(event)

  const profile = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .get()

  if (!profile) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const updates: Partial<typeof schema.profiles.$inferInsert> = {}

  if (body.firstName !== undefined) {
    updates.firstName = body.firstName
  }

  // username is set-once
  if (body.username !== undefined) {
    if (profile.username) {
      throw createError({ statusCode: 400, message: 'Username has already been set and cannot be changed' })
    }
    // Check uniqueness
    const existing = await db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.username, body.username))
      .get()
    if (existing) {
      throw createError({ statusCode: 409, message: 'Username is already taken' })
    }
    updates.username = body.username
  }

  // email is set-once
  if (body.email !== undefined) {
    if (profile.email) {
      throw createError({ statusCode: 400, message: 'Email has already been set and cannot be changed' })
    }
    updates.email = body.email
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update' })
  }

  const [updated] = await db
    .update(schema.profiles)
    .set(updates)
    .where(eq(schema.profiles.id, profileId))
    .returning()

  return {
    id: updated.id,
    firstName: updated.firstName,
    username: updated.username,
    email: updated.email,
  }
})
