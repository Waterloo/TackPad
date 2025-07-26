// composables/useYjsConnection.ts
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { ref, onUnmounted } from 'vue'
import { cleanupBoard } from './useYjsBoard'

// We'll cache one Y.Doc per boardId
const docs = new Map<string, {
  ydoc: Y.Doc,
  provider: WebsocketProvider,
  persistence: IndexeddbPersistence,
  ready: ReturnType<typeof ref>,
  wsReady: ReturnType<typeof ref>,
  connectionStatus: ReturnType<typeof ref>
}>()

export function useYjsConnection(boardId: string) {
  if (docs.has(boardId)) {
    return docs.get(boardId)!
  }

  // 1) Create the Y.Doc + providers once
  const ydoc = new Y.Doc()
  const provider = new WebsocketProvider(`ws://localhost:1234`, boardId, ydoc)
  const persistence = new IndexeddbPersistence(boardId, ydoc)
  const ready = ref(false)
  const wsReady = ref(false)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')

  // 2) When IndexedDB has loaded
  persistence.on('synced', () => {
    ready.value = true
    console.log('IndexedDB synced for board:', boardId)
  })

  // 3) WebSocket connection events
  provider.on('synced', () => {
    wsReady.value = true
    connectionStatus.value = 'connected'
    console.log('WebSocket synced for board:', boardId)
  })

  provider.on('connection-close', () => {
    wsReady.value = false
    connectionStatus.value = 'disconnected'
    console.log('WebSocket disconnected for board:', boardId)
  })

  provider.on('connection-error', (error: any) => {
    connectionStatus.value = 'error'
    console.error('Yjs connection error for board:', boardId, error)
  })

  // 4) Cleanup
  onUnmounted(() => {
    provider.destroy()
    persistence.destroy()
    ydoc.destroy()
    docs.delete(boardId)
    cleanupBoard(boardId) // Clean up board instance too
  })

  const entry = { ydoc, provider, persistence, ready, wsReady, connectionStatus }
  docs.set(boardId, entry)
  return entry
}
