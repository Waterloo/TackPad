import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const db = useDrizzle(event)

  const row = await db
    .select({
      publicKey: schema.profileKeys.publicKey,
      encryptedPrivateKey: schema.profileKeys.encryptedPrivateKey,
      backupSalt: schema.profileKeys.backupSalt,
      backupIv: schema.profileKeys.backupIv,
      backupVersion: schema.profileKeys.backupVersion,
    })
    .from(schema.profileKeys)
    .where(eq(schema.profileKeys.profileId, profileId))
    .get()

  if (!row) {
    throw createError({ statusCode: 404, message: 'No encrypted key backup found' })
  }

  return row
})
