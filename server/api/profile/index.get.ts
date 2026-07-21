import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'
import { FREE_QUOTA_BYTES, PAID_QUOTA_BYTES } from '../../../shared/constants/upload'

function planFromLimit(limit: number): 'free' | 'paid' {
  return limit >= PAID_QUOTA_BYTES ? 'paid' : 'free'
}

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session

  const db = useDrizzle(event)

  const profile = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .get()

  if (!profile) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const quota = await db
    .select()
    .from(schema.usageQuotas)
    .where(eq(schema.usageQuotas.profileId, profileId))
    .get()

  const profileKey = await db
    .select({ profileId: schema.profileKeys.profileId })
    .from(schema.profileKeys)
    .where(eq(schema.profileKeys.profileId, profileId))
    .get()

  const consumption = quota?.consumption ?? 0
  const limit = quota?.quotaLimit ?? FREE_QUOTA_BYTES

  return {
    id: profile.id,
    firstName: profile.firstName,
    username: profile.username,
    email: profile.email,
    createdAt: profile.createdAt,
    isAnonymous: event.context.session.isAnonymous,
    hasEncryptionKey: !!profileKey,
    usage: {
      consumption,
      limit,
      remaining: Math.max(0, limit - consumption),
      plan: planFromLimit(limit),
    },
  }
})
