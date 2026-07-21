import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const db = useDrizzle(event)

  const row = await db
    .select({
      publicKey: schema.profileKeys.publicKey,
      backupVersion: schema.profileKeys.backupVersion,
      updatedAt: schema.profileKeys.updatedAt,
    })
    .from(schema.profileKeys)
    .where(eq(schema.profileKeys.profileId, profileId))
    .get()

  return {
    hasKey: !!row,
    publicKey: row?.publicKey ?? null,
    backupVersion: row?.backupVersion ?? null,
    updatedAt: row?.updatedAt ?? null,
  }
})

