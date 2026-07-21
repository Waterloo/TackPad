import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../utils/db'
import { assertCustomBoardUrl } from '../../utils/boardCustomUrl'

export default defineEventHandler(async (event) => {
  const customUrl = getRouterParam(event, 'customUrl')

  if (!customUrl) {
    throw createError({ statusCode: 400, message: 'Missing custom URL' })
  }

  const normalized = assertCustomBoardUrl(customUrl)
  const db = useDrizzle(event)

  const row = await db
    .select({ boardId: schema.boardCustomUrls.boardId })
    .from(schema.boardCustomUrls)
    .where(eq(schema.boardCustomUrls.customUrl, normalized))
    .get()

  if (!row) {
    throw createError({ statusCode: 404, message: 'Board link not found' })
  }

  return sendRedirect(event, `/board/${row.boardId}`, 302)
})
