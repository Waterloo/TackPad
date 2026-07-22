import { DurableObject } from 'cloudflare:workers'

/**
 * BoardRelay — one Durable Object per board, relaying Yjs messages between
 * connected clients. Uses the WebSocket Hibernation API so idle boards evict
 * from memory (no duration billing) while sockets stay connected.
 *
 * It is a PURE RELAY: no persistence, no server-side Y.Doc. Initial board state
 * is loaded by clients over REST (/api/board/[id]) and saves go over REST
 * (/api/save/[id] -> D1). The socket only carries live updates + awareness.
 *
 * Auth is done upstream in server/api/collab/[id].get.ts, which forwards the
 * caller's role via a `?role=` query param. Viewers may read/present (awareness,
 * state requests) but their doc-mutation messages are dropped here.
 */
export class BoardRelay extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const role = new URL(request.url).searchParams.get('role') === 'editor' ? 'editor' : 'viewer'

    const { 0: client, 1: server } = new WebSocketPair()

    // acceptWebSocket (not server.accept) is what makes this DO hibernatable.
    this.ctx.acceptWebSocket(server)
    // Attachment survives hibernation, so we still know the role after eviction.
    server.serializeAttachment({ role })

    return new Response(null, { status: 101, webSocket: client })
  }

  webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): void {
    const att = ws.deserializeAttachment() as { role?: string } | null
    if (att?.role !== 'editor' && isYjsMutation(message)) return // read-only: drop writes

    // Fan out to every other peer. getWebSockets() is hibernation-safe — it
    // returns all connected sockets even if this DO was just re-instantiated.
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === ws) continue
      try { peer.send(message) }
      catch { /* peer gone; its close handler will clean up */ }
    }
  }

  webSocketClose(ws: WebSocket, code: number): void {
    // 1000 (normal) / 1001 (going away) close cleanly; otherwise use 1011.
    try { ws.close(code >= 1000 && code < 5000 ? code : 1011) }
    catch { /* already closed */ }
  }

  webSocketError(ws: WebSocket): void {
    try { ws.close(1011) }
    catch { /* already closed */ }
  }
}

/**
 * Reads the y-protocol message header to decide if it mutates the shared doc.
 * Encoding: messageType (varuint), and for sync messages a sync-step (varuint).
 *   messageType 0 = sync, 1 = awareness, 2 = auth, 3 = queryAwareness
 *   sync step   0 = syncStep1 (state request), 1 = syncStep2, 2 = update
 * Only sync + (syncStep2 | update) carries doc changes → a mutation.
 */
function isYjsMutation(data: ArrayBuffer | string): boolean {
  if (typeof data === 'string') return true // unexpected framing — treat as a write
  const bytes = new Uint8Array(data)
  if (bytes.length === 0) return false

  const [messageType, next] = readVarUint(bytes, 0)
  if (messageType !== 0) return false // awareness / auth / query — not a doc write

  const [syncStep] = readVarUint(bytes, next)
  return syncStep === 1 || syncStep === 2
}

/** Reads a lib0-style variable-length uint. Returns [value, nextOffset]. */
function readVarUint(bytes: Uint8Array, start: number): [number, number] {
  let num = 0
  let mult = 1
  let i = start
  let byte: number
  do {
    byte = bytes[i++]!
    num += (byte & 0x7f) * mult // multiply, not shift — avoids 32-bit overflow
    mult *= 128
  } while (byte >= 0x80 && i < bytes.length)
  return [num, i]
}
