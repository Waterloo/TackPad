import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../utils/db'
import { sqlNow } from '../../utils/board'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const body = await readBody<{
    kind: 'secret_note' | 'secret_kv'
    payload: {
      version: 1
      algorithm: 'aes-gcm'
      ciphertext: string
      iv: string
    }
  }>(event)

  if (!body?.kind || !body.payload?.ciphertext || !body.payload?.iv) {
    throw createError({ statusCode: 400, message: 'Missing secret-link payload' })
  }

  const db = useDrizzle(event)
  const id = `sec_${nanoid(18)}`

  await db.insert(schema.oneOffSecretLinks).values({
    id,
    createdBy: profileId,
    kind: body.kind,
    payload: JSON.stringify(body.payload),
    createdAt: sqlNow(),
  })

  return { id }
})

