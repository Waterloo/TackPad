import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getBoardWithAccess } from '../../utils/board'
import { schema } from '../../utils/db'
import { requireOAuth } from '../../utils/auth'
import {
  ensureQuotaRow,
  recalculateOwnerConsumption,
  resolveBoardOwner,
  storageKeyForFile,
} from '../../utils/upload'
import {
  MAX_UPLOAD_BYTES,
} from '../../../shared/constants/upload'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')
  if (!boardId) throw createError({ statusCode: 400, statusMessage: 'Missing board id' })

  requireOAuth(event)
  const { canEdit, db, profileId } = await getBoardWithAccess(event, boardId)
  if (!canEdit) {
    throw createError({ statusCode: 403, statusMessage: 'No edit permission' })
  }

  const ownerId = await resolveBoardOwner(db, boardId)
  if (!ownerId) {
    throw createError({ statusCode: 400, statusMessage: 'Board owner is missing' })
  }

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'file')
  if (!filePart || !filePart.filename || !filePart.type) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file in multipart body' })
  }

  const fileSize = filePart.data.byteLength
  if (fileSize <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Empty file' })
  }
  if (fileSize > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'File exceeds 15MB limit' })
  }

  const ownerQuota = await ensureQuotaRow(db, ownerId)
  if (!ownerQuota) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to resolve owner quota' })
  }

  if (ownerQuota.consumption + fileSize > ownerQuota.quotaLimit) {
    throw createError({ statusCode: 413, statusMessage: 'Owner quota exceeded' })
  }

  const storageKey = storageKeyForFile(filePart.filename)
  const uploadId = `upl_${nanoid()}`
  const bucket = event.context.cloudflare.env.TACKPAD_ASSETS
  if (!bucket || typeof bucket.put !== 'function') {
    throw createError({
      statusCode: 500,
      statusMessage: 'R2 binding TACKPAD_ASSETS is missing in this runtime',
    })
  }

  const bodyBytes = filePart.data instanceof Uint8Array
    ? filePart.data
    : new Uint8Array(filePart.data)
  const bodyBuffer = bodyBytes.buffer.slice(
    bodyBytes.byteOffset,
    bodyBytes.byteOffset + bodyBytes.byteLength,
  )

  try {
    await bucket.put(storageKey, bodyBuffer)
  }
  catch (err: any) {
    const reason = err?.message || 'Unknown R2 put error'
    throw createError({ statusCode: 500, statusMessage: `Failed to upload file (${reason})` })
  }

  const fileUrl = storageKey
  try {
    await db.insert(schema.uploads).values({
      id: uploadId,
      fileUrl,
      objectKey: storageKey,
      profileId,
      boardId,
      fileName: filePart.filename,
      fileType: filePart.type,
      fileSize,
    })

    await recalculateOwnerConsumption(db, ownerId)
  }
  catch {
    try { await bucket.delete(storageKey) } catch {}
    throw createError({ statusCode: 500, statusMessage: 'Failed to save upload metadata' })
  }

  const quota = await db
    .select()
    .from(schema.usageQuotas)
    .where(eq(schema.usageQuotas.profileId, ownerId))
    .get()

  return {
    uploadId,
    url: fileUrl,
    fileName: filePart.filename,
    fileType: filePart.type,
    fileSize,
    billedToOwnerId: ownerId,
    usage: {
      consumption: quota?.consumption ?? 0,
      limit: quota?.quotaLimit ?? 0,
    },
  }
})
