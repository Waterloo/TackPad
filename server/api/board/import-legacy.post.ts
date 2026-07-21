import { nanoid } from 'nanoid'
import { useDrizzle, schema } from '../../utils/db'
import { sqlNow } from '../../utils/board'
import { reserveDefaultCustomBoardUrl } from '../../utils/boardCustomUrl'
import { convertLegacyBoard } from '../../utils/legacyBoardImport'

interface ImportLegacyRequestBody {
  legacyBoard?: unknown
  sourceFileName?: string
}

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const db = useDrizzle(event)
  const body = await readBody<ImportLegacyRequestBody>(event)

  if (!body || !('legacyBoard' in body)) {
    throw createError({ statusCode: 400, message: 'Missing legacyBoard payload' })
  }

  let converted
  try {
    converted = convertLegacyBoard(body.legacyBoard, profileId, new Date().toISOString())
  }
  catch (err: any) {
    throw createError({
      statusCode: 400,
      message: err instanceof Error ? err.message : 'Invalid legacy board payload',
    })
  }

  const boardId = `BOARD-${nanoid(10)}`
  const now = sqlNow()

  try {
    await db.insert(schema.boards).values({
      id: boardId,
      ownerId: profileId,
      title: converted.title,
      data: JSON.stringify({ items: converted.items }),
      accessLevel: 'public',
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(schema.boardAccess).values({
      boardId,
      profileId,
      role: 'owner',
    })
  }
  catch {
    throw createError({ statusCode: 500, message: 'Failed to create imported board' })
  }

  const customUrl = await reserveDefaultCustomBoardUrl(db, boardId, converted.title)

  return {
    id: boardId,
    customUrl,
    stats: converted.stats,
    skipped: converted.skipped,
    title: converted.title,
  }
})
