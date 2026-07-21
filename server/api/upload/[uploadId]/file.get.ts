import { eq } from 'drizzle-orm'
import { getBoardWithAccess } from '../../../utils/board'
import { useDrizzle, schema } from '../../../utils/db'
import { parseObjectKeyFromUrl } from '../../../utils/r2'
import { verifyUploadAccessToken } from '../../../utils/uploadToken'

export default defineEventHandler(async (event) => {
  const uploadId = getRouterParam(event, 'uploadId')
  const query = getQuery(event)
  const boardId = typeof query.boardId === 'string' ? query.boardId : ''
  const expRaw = typeof query.exp === 'string' ? query.exp : ''
  const sig = typeof query.sig === 'string' ? query.sig : ''

  if (!uploadId || !boardId || !expRaw || !sig) {
    throw createError({ statusCode: 400, statusMessage: 'Missing signed file params' })
  }

  const exp = Number(expRaw)
  if (!Number.isFinite(exp)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid exp value' })
  }
  if (Math.floor(Date.now() / 1000) > exp) {
    throw createError({ statusCode: 401, statusMessage: 'File URL expired' })
  }

  const config = useRuntimeConfig(event)
  const validSig = await verifyUploadAccessToken({ uploadId, boardId, exp, sig }, config.sessionPassword)
  if (!validSig) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid file signature' })
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

  const objectKey = upload.objectKey || parseObjectKeyFromUrl(upload.fileUrl, config.bucket)
  if (!objectKey) {
    throw createError({ statusCode: 400, statusMessage: 'Upload key is missing' })
  }

  if (!upload.objectKey) {
    await db.update(schema.uploads)
      .set({ objectKey })
      .where(eq(schema.uploads.id, upload.id))
  }

  const bucket = event.context.cloudflare.env.TACKPAD_ASSETS
  if (!bucket || typeof bucket.get !== 'function') {
    throw createError({
      statusCode: 500,
      statusMessage: 'R2 binding TACKPAD_ASSETS is missing in this runtime',
    })
  }

  const object = await bucket.get(objectKey)
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: 'Stored file not found' })
  }

  const headers = new Headers()
  if (upload.fileType) {
    headers.set('Content-Type', upload.fileType)
  }
  if (typeof upload.fileSize === 'number' && Number.isFinite(upload.fileSize)) {
    headers.set('Content-Length', String(upload.fileSize))
  }
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'private, max-age=0, no-store')
  if (upload.fileName) {
    const safeAsciiName = upload.fileName
      .replace(/[^\x20-\x7E]/g, '_')
      .replace(/["\\]/g, '')
      .trim() || 'file'
    const encodedName = encodeURIComponent(upload.fileName)
    headers.set('Content-Disposition', `inline; filename="${safeAsciiName}"; filename*=UTF-8''${encodedName}`)
  }

  return new Response(object.body, { headers })
})
