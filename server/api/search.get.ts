import { eq, sql, inArray } from 'drizzle-orm'
import { useDrizzle, schema } from '../utils/db'
import type { BoardItem } from '../../shared/types/board'

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const query = getQuery(event)
  const q = String(query.q ?? '').trim()
  const boardId = query.boardId ? String(query.boardId).trim() : null
  const include = query.include ? String(query.include) : null

  if (!q || q.length < 2) throw createError({ statusCode: 400, message: 'q must be at least 2 characters' })

  const db = useDrizzle(event)

  // Get IDs of boards the user has access to (cap at 500 for safety)
  const accessible = await db
    .select({ boardId: schema.boardAccess.boardId })
    .from(schema.boardAccess)
    .where(eq(schema.boardAccess.profileId, profileId))
    .limit(500)
    .all()

  if (accessible.length === 0) return { results: [] }

  const boardIds = accessible.map(r => r.boardId)

  // Build the FTS5 query — keep only alphanumeric + spaces, then prefix-match.
  // FTS5 has many operator tokens (AND, OR, NOT, -, :, (, ), ^, *, ") that
  // can produce unexpected results or 500 errors if passed verbatim.
  // Allowlist approach is safer than a denylist.
  const ftsQuery = q.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, ' ').trim().replace(/\s+/g, ' ') + '*'

  // When include=full, cap at 5 results (heavier payload with full item data)
  const resultLimit = include === 'full' ? 5 : 20

  // Scope to a specific board if provided, otherwise search all accessible boards
  let results: Array<{
    boardId: string
    itemId: string
    kind: string
    text: string
  }>

  if (boardId && boardIds.includes(boardId)) {
    results = await db.all<{ boardId: string; itemId: string; kind: string; text: string }>(
      sql`SELECT board_id as boardId, item_id as itemId, kind, text
          FROM board_items_fts
          WHERE board_items_fts MATCH ${ftsQuery}
            AND board_id = ${boardId}
          ORDER BY rank
          LIMIT ${resultLimit}`,
    )
  }
  else {
    // SQLite doesn't support IN with FTS5 directly — filter in JS after fetching
    const raw = await db.all<{ boardId: string; itemId: string; kind: string; text: string }>(
      sql`SELECT board_id as boardId, item_id as itemId, kind, text
          FROM board_items_fts
          WHERE board_items_fts MATCH ${ftsQuery}
          ORDER BY rank
          LIMIT 100`,
    )
    const boardIdSet = new Set(boardIds)
    results = raw.filter(r => boardIdSet.has(r.boardId)).slice(0, resultLimit)
  }

  // When include=full, enrich results with full item data + board title
  if (include === 'full' && results.length > 0) {
    const uniqueBoardIds = [...new Set(results.map(r => r.boardId))]
    const boardRows = await db
      .select({ id: schema.boards.id, title: schema.boards.title, data: schema.boards.data })
      .from(schema.boards)
      .where(inArray(schema.boards.id, uniqueBoardIds))
      .all()

    const boardMap = new Map<string, { title: string; items: Record<string, BoardItem> }>()
    for (const row of boardRows) {
      let items: Record<string, BoardItem> = {}
      if (row.data) {
        try {
          const parsed = JSON.parse(row.data)
          items = parsed.items ?? {}
        }
        catch { /* ignore malformed data */ }
      }
      boardMap.set(row.id, { title: row.title, items })
    }

    const fullResults = results.map(r => {
      const board = boardMap.get(r.boardId)
      return {
        boardId: r.boardId,
        boardTitle: board?.title ?? 'Untitled Board',
        itemId: r.itemId,
        kind: r.kind,
        text: r.text,
        item: board?.items[r.itemId] ?? null,
      }
    })

    return { results: fullResults }
  }

  return { results }
})
