import { getBoardWithAccess } from '../../utils/board'

/**
 * Authenticated WebSocket upgrade for real-time collaboration.
 *
 * The session middleware (server/middleware/auth.ts) has already resolved
 * event.context.session for this /api/ request. We authorize against the board,
 * then hand the upgrade to the per-board BoardRelay Durable Object, passing the
 * caller's role so the DO can enforce read-only for viewers.
 */
export default defineEventHandler(async (event) => {
  const req = event.context.cloudflare.request
  if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    throw createError({ statusCode: 426, message: 'Expected WebSocket upgrade' })
  }

  const boardId = getRouterParam(event, 'id')!
  const { canView, canEdit } = await getBoardWithAccess(event, boardId)
  if (!canView) throw createError({ statusCode: 403, message: 'No access to this board' })

  const stub = event.context.cloudflare.env.BOARD_RELAY.getByName(boardId)

  // Forward the upgrade to the DO, tagging the caller's role via the URL.
  // We pass the original request as the init source so the WebSocket handshake
  // headers (Sec-WebSocket-*, Upgrade, Connection) are preserved verbatim —
  // rebuilding a Headers object would drop those forbidden-header names.
  const url = new URL(req.url)
  url.searchParams.set('role', canEdit ? 'editor' : 'viewer')

  return stub.fetch(new Request(url, req))
})
