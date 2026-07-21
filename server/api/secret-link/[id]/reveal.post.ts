import { sql } from 'drizzle-orm'
import { useDrizzle, schema } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const db = useDrizzle(event)

  const rows = await db.all<{ id: string; kind: string; payload: string }>(
    sql`UPDATE one_off_secret_links
        SET consumed_at = datetime('now')
        WHERE id = ${id}
          AND consumed_at IS NULL
        RETURNING id, kind, payload`,
  )

  const row = rows[0]
  if (!row) {
    throw createError({ statusCode: 410, message: 'This secret link has already been opened or no longer exists.' })
  }

  return {
    id: row.id,
    kind: row.kind,
    payload: JSON.parse(row.payload),
  }
})
