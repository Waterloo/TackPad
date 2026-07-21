import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/db'
import { sqlNow } from '../../../utils/board'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const body = await readBody<{
    publicKey: string
    encryptedPrivateKey: string
    backupSalt: string
    backupIv: string
    backupVersion?: number
  }>(event)

  if (!body?.publicKey || !body.encryptedPrivateKey || !body.backupSalt || !body.backupIv) {
    throw createError({ statusCode: 400, message: 'Missing key bootstrap fields' })
  }

  const db = useDrizzle(event)
  const now = sqlNow()
  const existing = await db
    .select({ publicKey: schema.profileKeys.publicKey })
    .from(schema.profileKeys)
    .where(eq(schema.profileKeys.profileId, profileId))
    .get()

  if (existing && existing.publicKey !== body.publicKey) {
    throw createError({ statusCode: 409, message: 'Encryption keys already exist for this profile' })
  }

  if (existing) {
    await db
      .update(schema.profileKeys)
      .set({
        encryptedPrivateKey: body.encryptedPrivateKey,
        backupSalt: body.backupSalt,
        backupIv: body.backupIv,
        backupVersion: body.backupVersion ?? 1,
        updatedAt: now,
      })
      .where(eq(schema.profileKeys.profileId, profileId))
  }
  else {
    await db.insert(schema.profileKeys).values({
      profileId,
      publicKey: body.publicKey,
      encryptedPrivateKey: body.encryptedPrivateKey,
      backupSalt: body.backupSalt,
      backupIv: body.backupIv,
      backupVersion: body.backupVersion ?? 1,
      createdAt: now,
      updatedAt: now,
    })
  }

  return { ok: true }
})

