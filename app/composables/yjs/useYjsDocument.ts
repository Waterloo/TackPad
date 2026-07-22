import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { ConnectionStatus } from '~/shared/types/board'

interface YjsDocumentEntry {
  doc: Y.Doc
  wsProvider: WebsocketProvider
  idbProvider: IndexeddbPersistence
  connectionStatus: Ref<ConnectionStatus>
  refCount: number
}

/**
 * Module-level cache: one Y.Doc per boardId for the lifetime of the tab.
 */
const docCache = new Map<string, YjsDocumentEntry>()

/**
 * Returns a Y.Doc for the given boardId, creating it if needed.
 *
 * Architecture:
 *  - IndexeddbPersistence is the PRIMARY offline store. The board is usable
 *    as soon as idbProvider.whenSynced resolves, even without internet.
 *  - WebsocketProvider is for COLLABORATION only. Connection failures are
 *    silent — they set connectionStatus but never break the app.
 *
 * Call destroy() when the board page unmounts to release resources.
 */
export function useYjsDocument(boardId: string) {
  const config = useRuntimeConfig()
  // Default: same-origin in-house DO relay. WebsocketProvider appends `/${boardId}`,
  // so this becomes wss://<host>/api/collab/<boardId>, authenticated by the session cookie.
  const override = config.public.websocketUrl as string
  const wsUrl = override
    || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/collab`

  if (!docCache.has(boardId)) {
    const doc = new Y.Doc()
    const connectionStatus = ref<ConnectionStatus>('disconnected')

    // IndexedDB — primary offline persistence
    const idbProvider = new IndexeddbPersistence(`tackpad-board-${boardId}`, doc)

    // WebSocket — collaboration only; connect: false until we're ready
    const wsProvider = new WebsocketProvider(wsUrl, boardId, doc, {
      connect: false, // we connect manually after IDB has loaded
      maxBackoffTime: 30000, // cap retry delay at 30s to avoid hammering server
    })

    wsProvider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') connectionStatus.value = 'connected'
      else if (status === 'disconnected') connectionStatus.value = 'disconnected'
      else connectionStatus.value = 'connecting'
    })

    // Treat WS errors as a soft disconnection — app keeps working from IDB
    wsProvider.on('connection-error', () => {
      connectionStatus.value = 'disconnected'
    })

    // Store entry before registering the .then() so the guard below can compare
    // the pointer and detect if destroy() was called before IDB finished loading.
    const entry: YjsDocumentEntry = { doc, wsProvider, idbProvider, connectionStatus, refCount: 0 }
    docCache.set(boardId, entry)

    // Connect WS only after IDB has fully loaded so IDB always wins on first load.
    // Guard: if destroy() ran before IDB finished, the entry is removed from the
    // cache. Without this check, connect() would be called on a destroyed provider
    // (with a destroyed Y.Doc), which causes an infinite reconnect loop.
    idbProvider.whenSynced.then(() => {
      if (docCache.get(boardId) === entry) wsProvider.connect()
    })
  }

  const entry = docCache.get(boardId)!
  entry.refCount++

  function destroy() {
    entry.refCount--
    if (entry.refCount <= 0) {
      entry.wsProvider.disconnect()
      entry.wsProvider.destroy()
      entry.idbProvider.destroy()
      entry.doc.destroy()
      docCache.delete(boardId)
    }
  }

  return {
    doc: entry.doc,
    wsProvider: entry.wsProvider,
    idbProvider: entry.idbProvider,
    connectionStatus: entry.connectionStatus,
    destroy,
  }
}
