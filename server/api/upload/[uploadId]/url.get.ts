import { eq } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { useDrizzle, schema } from '../../../utils/db'
import { parseObjectKeyFromUrl } from '../../../utils/r2'
import { createUploadAccessToken } from '../../../utils/uploadToken'

const URL_TTL_SECONDS = 4 * 60 * 60

export default defineEventHandler(async (event) => {
  const uploadId = getRouterParam(event, 'uploadId')
  const boardId = getQuery(event).boardId as string | undefined
  if (!uploadId || !boardId) {
    throw createError({ statusCode: 400, statusMessage: 'uploadId and boardId are required' })
  }

  const { canView } = await getBoardWithAccess(event, boardId)
  if (!canView) {
    throw createError({ statusCode: 403, statusMessage: 'No view permission for this board' })
  }

  const db = useDrizzle(event)
  const upload = await db
    .select()
    .from(schema.uploads)
    .where(eq(schema.uploads.id, uploadId))
    .get()

  if (!upload || upload.boardId !== boardId) {
    throw createError({ statusCode: 404, statusMessage: 'Upload not found for board' })
  }

  const config = useRuntimeConfig(event)
  const objectKey = upload.objectKey || parseObjectKeyFromUrl(upload.fileUrl, config.bucket)
  if (!objectKey) {
    throw createError({ statusCode: 400, statusMessage: 'Upload key is missing' })
  }

  // Backfill legacy rows with derived object_key.
  if (!upload.objectKey) {
    await db.update(schema.uploads)
      .set({ objectKey })
      .where(eq(schema.uploads.id, upload.id))
  }

  const exp = Math.floor(Date.now() / 1000) + URL_TTL_SECONDS
  const sig = await createUploadAccessToken({
    uploadId: upload.id,
    boardId,
    exp,
  }, config.sessionPassword)

  const signedUrl = `/api/upload/${upload.id}/file?boardId=${encodeURIComponent(boardId)}&exp=${exp}&sig=${encodeURIComponent(sig)}`

  return {
    uploadId: upload.id,
    url: signedUrl,
    expiresAt: exp * 1000,
    fileName: upload.fileName,
    fileType: upload.fileType,
    fileSize: upload.fileSize,
  }
})
