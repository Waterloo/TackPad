import { getBoardWithAccess } from '../../utils/board'
import { requireOAuth } from '../../utils/auth'
import { eq } from 'drizzle-orm'
import { schema } from '../../utils/db'
import { parseObjectKeyFromUrl } from '../../utils/r2'
import {
  findUploadInBoard,
  recalculateOwnerConsumption,
  resolveBoardOwner,
} from '../../utils/upload'

interface DeleteUploadBody {
  uploadId?: string
  boardId?: string
}

export default defineEventHandler(async (event) => {
  requireOAuth(event)
  const body = await readBody<DeleteUploadBody>(event)
  if (!body.uploadId || !body.boardId) {
    throw createError({ statusCode: 400, statusMessage: 'uploadId and boardId are required' })
  }

  const { canEdit, db } = await getBoardWithAccess(event, body.boardId)
  if (!canEdit) {
    throw createError({ statusCode: 403, statusMessage: 'No edit permission' })
  }

  const ownerId = await resolveBoardOwner(db, body.boardId)
  if (!ownerId) {
    throw createError({ statusCode: 400, statusMessage: 'Board owner is missing' })
  }

  const upload = await findUploadInBoard(db, body.uploadId, body.boardId)
  if (!upload) {
    throw createError({ statusCode: 404, statusMessage: 'Upload not found for board' })
  }

  const config = useRuntimeConfig(event)
  const storageKey = upload.objectKey || parseObjectKeyFromUrl(upload.fileUrl, config.bucket)
  if (!storageKey) {
    throw createError({ statusCode: 400, statusMessage: 'Unable to resolve storage key' })
  }
  const bucket = event.context.cloudflare.env.TACKPAD_ASSETS
  if (!bucket || typeof bucket.delete !== 'function') {
    throw createError({
      statusCode: 500,
      statusMessage: 'R2 binding TACKPAD_ASSETS is missing in this runtime',
    })
  }

  try {
    await bucket.delete(storageKey)
  }
  catch (err: any) {
    const reason = err?.message || 'Unknown R2 delete error'
    throw createError({ statusCode: 500, statusMessage: `Failed to delete storage object (${reason})` })
  }

  await db.delete(schema.uploads).where(eq(schema.uploads.id, body.uploadId))
  await recalculateOwnerConsumption(db, ownerId)

  return { ok: true }
})
