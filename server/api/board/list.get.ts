import { eq, desc } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'
import type { BoardItem, WidgetKind } from '~~/shared/types/board'

interface ItemPreview {
  kind: WidgetKind
  snippet: string
  x: number
  y: number
  w: number
  h: number
  color?: string
}

function extractPreviews(dataJson: string | null): { previews: ItemPreview[]; itemCount: number } {
  if (!dataJson) return { previews: [], itemCount: 0 }
  try {
    const parsed = JSON.parse(dataJson) as { items?: Record<string, BoardItem> }
    if (!parsed?.items) return { previews: [], itemCount: 0 }
    const allItems = Object.values(parsed.items).filter(i => i.kind !== 'group')
    const itemCount = allItems.length
    // Take up to 12 items for visual preview (more than 5 to fill the mini canvas)
    const items = allItems
      .sort((a, b) => (b.lastUpdatedAt ?? '').localeCompare(a.lastUpdatedAt ?? ''))
      .slice(0, 5)
    const previews = items.map((item) => {
      let snippet = ''
      let color: string | undefined
      switch (item.kind) {
        case 'note':
          snippet = item.content.text.replace(/<[^>]*>/g, '')
          color = item.content.color
          break
        case 'todo':  snippet = item.content.title || item.content.tasks.map(t => t.content).join(', '); break
        case 'link':  snippet = item.content.title || item.content.url; break
        case 'text':  snippet = item.content.text.replace(/<[^>]*>/g, ''); break
        case 'secret_note': snippet = 'Encrypted note'; color = '#E0E7FF'; break
        case 'secret_kv': snippet = 'Encrypted keys'; color = '#FDE68A'; break
        case 'image': snippet = item.content.alt || 'Image'; break
        case 'audio': snippet = item.content.fileName || 'Audio'; break
        case 'file':  snippet = item.content.fileName; break
        case 'timer': snippet = item.content.timerType; break
        case 'tacklet': snippet = 'Tacklet'; break
      }
      return {
        kind: item.kind,
        snippet: snippet.slice(0, 60),
        x: item.x_position,
        y: item.y_position,
        w: item.width,
        h: item.height,
        ...(color ? { color } : {}),
      }
    })
    return { previews, itemCount }
  }
  catch { return { previews: [], itemCount: 0 } }
}

export default defineEventHandler(async (event) => {
  const { profileId } = event.context.session
  const db = useDrizzle(event)

  // All boards the user has a board_access record for, newest first
  const rows = await db
    .select({
      boardId:      schema.boardAccess.boardId,
      role:         schema.boardAccess.role,
      lastAccessed: schema.boardAccess.lastAccessed,
      title:        schema.boards.title,
      boardType:    schema.boards.boardType,
      accessLevel:  schema.boards.accessLevel,
      ownerId:      schema.boards.ownerId,
      updatedAt:    schema.boards.updatedAt,
      data:         schema.boards.data,
    })
    .from(schema.boardAccess)
    .innerJoin(schema.boards, eq(schema.boardAccess.boardId, schema.boards.id))
    .where(eq(schema.boardAccess.profileId, profileId))
    .orderBy(desc(schema.boardAccess.lastAccessed))
    .all()

  return rows.map(({ data, ...rest }) => {
    const { previews, itemCount } = extractPreviews(data)
    return { ...rest, preview: previews, itemCount }
  })
})
