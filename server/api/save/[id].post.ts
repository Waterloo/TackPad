import { eq, and } from 'drizzle-orm'
import { getD1Database, useDrizzle, schema } from '../../utils/db'
import { extractItemText } from '../../../shared/utils/search'
import { isSecretWidget } from '../../../shared/utils/secrets'
import type { BoardItem } from '../../../shared/types/board'
import type { DrawingItem } from '../../../shared/types/drawing'
import { assertSecretItemIntegrity, assertVaultBoardPayload, parseBoardData } from '../../utils/secrets'

export default defineEventHandler(async (event) => {
  const boardId = getRouterParam(event, 'id')!
  const { profileId } = event.context.session
  const body = await readBody<{
    data: {
      items: Record<string, BoardItem>
      drawings?: Record<string, DrawingItem>
    }
  }>(event)

  if (!body?.data?.items) {
    throw createError({ statusCode: 400, message: 'Missing data.items' })
  }

  const db = useDrizzle(event)

  // Verify board exists and user has edit permission
  const board = await db
    .select({ id: schema.boards.id, ownerId: schema.boards.ownerId })
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId))
    .get()

  if (!board) throw createError({ statusCode: 404, message: 'Board not found' })

  const access = await db
    .select({ role: schema.boardAccess.role })
    .from(schema.boardAccess)
    .where(and(
      eq(schema.boardAccess.boardId, boardId),
      eq(schema.boardAccess.profileId, profileId),
    ))
    .get()

  if (!access || !['owner', 'editor'].includes(access.role)) {
    throw createError({ statusCode: 403, message: 'No edit permission' })
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const boardMeta = await db
    .select({ boardType: schema.boards.boardType, data: schema.boards.data })
    .from(schema.boards)
    .where(eq(schema.boards.id, boardId))
    .get()

  const existingData = parseBoardData(boardMeta?.data ?? null)
  const boardType = (boardMeta?.boardType ?? 'standard') as 'standard' | 'vault'

  assertVaultBoardPayload(boardType, body.data.items, body.data.drawings)
  await assertSecretItemIntegrity({
    db,
    boardId,
    profileId,
    existingItems: existingData.items,
    incomingItems: body.data.items,
  })

  // Save board data
  await db
    .update(schema.boards)
    .set({
      data: JSON.stringify(body.data),
      updatedAt: now,
    })
    .where(eq(schema.boards.id, boardId))

  // Rebuild FTS5 index for this board atomically.
  // D1's native batch API executes all prepared statements in a single round-trip
  // and rolls back on failure, preventing partial FTS state.
  // Note: Drizzle's db.batch() does not support db.run(sql`...`) — it requires
  // query-builder objects with internal .stmt/.params structure. Raw FTS5 virtual
  // table operations must use the D1 binding directly.
  const ownerId = board.ownerId ?? profileId
  const ftsRows = Object.entries(body.data.items)
    .map(([itemId, item]) => ({ itemId, item, text: extractItemText(item) }))
    .filter((r): r is typeof r & { text: string } => !!r.text && !isSecretWidget(r.item))

  const d1 = getD1Database(event)
  await d1.batch([
    d1.prepare('DELETE FROM board_items_fts WHERE board_id = ?').bind(boardId),
    ...ftsRows.map(({ itemId, item, text }) =>
      d1.prepare(
        'INSERT INTO board_items_fts (board_id, item_id, kind, owner_id, text) VALUES (?, ?, ?, ?, ?)',
      ).bind(boardId, itemId, item.kind, ownerId, text),
    ),
  ])

  return { ok: true, savedAt: now }
})
