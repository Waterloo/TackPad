import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { nanoid } from 'nanoid'
import type { WebsocketProvider } from 'y-websocket'
import { useYjsDocument } from '~/composables/yjs/useYjsDocument'
import { useYjsBoard } from '~/composables/yjs/useYjsBoard'
import { useAuthStore } from '~/stores/auth'
import { useDrawingStore } from '~/stores/drawing'
import type { BoardItem, BoardType, GroupItem, ConnectionStatus } from '~/shared/types/board'
import type { BoardAccessLevel } from '~/shared/types/access'
import type { DrawingItem } from '~/shared/types/drawing'

// localStorage key for caching board metadata for offline use
const metaCacheKey = (id: string) => `tackpad-meta-${id}`

export const useBoardStore = defineStore('board', () => {
  // ---------------------------------------------------------------------------
  // Canvas state — owned here, written directly by usePanZoom
  // ---------------------------------------------------------------------------
  const scale = ref(1)
  const translateX = ref(0)
  const translateY = ref(0)

  // ---------------------------------------------------------------------------
  // Known boards — persisted to localStorage for the header dropdown
  // { [boardId]: { board_id, title } }
  // ---------------------------------------------------------------------------
  const knownBoards = useLocalStorage<Record<string, { board_id: string; title: string }>>(
    'tp-boards', {},
  )

  function _trackBoard(id: string, boardTitle: string) {
    knownBoards.value = { ...knownBoards.value, [id]: { board_id: id, title: boardTitle } }
  }

  function forgetBoard(id: string) {
    const next = { ...knownBoards.value }
    delete next[id]
    knownBoards.value = next
  }

  /**
   * Sync knownBoards with the server's board_access list.
   * Removes only *private* boards the user no longer has access to.
   * Public and view_only boards are kept — anyone can still view them
   * even after logout/re-login as a new anonymous user.
   */
  async function syncKnownBoards() {
    try {
      const serverBoards = await $fetch<{ boardId: string; title: string; accessLevel: string }[]>('/api/board/list')
      const serverIds = new Set(serverBoards.map(b => b.boardId))

      // Update titles for boards the server knows about
      const next = { ...knownBoards.value }
      for (const b of serverBoards) {
        next[b.boardId] = { board_id: b.boardId, title: b.title }
      }

      // Remove boards the user no longer has access to,
      // but only if they're private (cached accessLevel check).
      // Public / view_only boards remain accessible to anyone.
      for (const id of Object.keys(knownBoards.value)) {
        if (serverIds.has(id)) continue
        const cachedMeta = localStorage.getItem(metaCacheKey(id))
        let cachedAccessLevel: string | null = null
        if (cachedMeta) {
          try { cachedAccessLevel = JSON.parse(cachedMeta).accessLevel } catch {}
        }
        // If the board is private (or we have no cached info to know), prune it
        if (!cachedAccessLevel || cachedAccessLevel === 'private') {
          delete next[id]
          localStorage.removeItem(metaCacheKey(id))
        }
      }

      knownBoards.value = next
    }
    catch {
      // Offline — skip cleanup, keep local data
    }
  }

  // ---------------------------------------------------------------------------
  // Board metadata
  // ---------------------------------------------------------------------------
  const boardId = ref('')
  const title = ref('Untitled Board')
  const boardType = ref<BoardType>('standard')
  const accessLevel = ref<BoardAccessLevel>('public')
  const customUrl = ref<string | null>(null)
  const ownerId = ref<string | null>(null)

  /**
   * Three-state edit permission:
   *   'authorized' — server confirmed the user can edit this board
   *   'unauthorized' — server explicitly denied edit access (block saves)
   *   'offline' — could not reach server; allow saves optimistically,
   *               they will fail gracefully until connectivity returns
   */
  const canEdit = ref<'authorized' | 'unauthorized' | 'offline'>('offline')

  // ---------------------------------------------------------------------------
  // Items — reactive view of the Yjs Y.Map, never written directly
  // ---------------------------------------------------------------------------
  const items = ref(new Map<string, BoardItem>())
  const boardItemsArray = computed(() => [...items.value.values()])

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const isSaving = ref(false)

  /**
   * true while a board switch is in progress (destroy old → init new).
   * Used by the page to show a transition overlay.
   */
  const isSwitching = ref(false)

  /**
   * Non-null when the board failed to load (e.g. 403, 404).
   * Cleared on next initializeBoard call.
   */
  const loadError = ref<{ status: number; message: string } | null>(null)

  /**
   * true once IndexedDB has synced — the board is usable from this point,
   * even if the server API or WebSocket is unavailable.
   */
  const isLoaded = ref(false)

  /**
   * true once the server API has responded and metadata is fresh.
   * false when offline (stale metadata from localStorage may be shown).
   */
  const isServerSynced = ref(false)

  // ---------------------------------------------------------------------------
  // Internal Yjs references
  // ---------------------------------------------------------------------------
  let _yjsBoard: ReturnType<typeof useYjsBoard> | null = null
  let _destroyDoc: (() => void) | null = null
  let _stopUndoWatcher: (() => void) | null = null
  let _stopConnectionWatcher: (() => void) | null = null

  /**
   * Exposed for useYjsPresence — set once IDB has loaded, cleared on destroy.
   * shallowRef so Vue doesn't try to deep-proxy the provider object.
   */
  const wsProvider = shallowRef<WebsocketProvider | null>(null)

  function _syncFromYjs(raw: Record<string, unknown>) {
    items.value = new Map(Object.entries(raw as Record<string, BoardItem>))
  }

  // ---------------------------------------------------------------------------
  // Debounced save to server (only when online and editable)
  // ---------------------------------------------------------------------------
  let _saveTimer: ReturnType<typeof setTimeout> | null = null

  async function _doSave() {
    if (!boardId.value || canEdit.value === 'unauthorized' || !isServerSynced.value) return
    isSaving.value = true
    try {
      const drawingStore = useDrawingStore()
      await $fetch(`/api/save/${boardId.value}`, {
        method: 'POST',
        body: {
          data: {
            items: Object.fromEntries(items.value),
            drawings: Object.fromEntries(drawingStore.drawings),
          },
        },
      })
    }
    catch (err) {
      console.warn('[board] Save failed (possibly offline):', err)
    }
    finally {
      isSaving.value = false
    }
  }

  function debouncedSave() {
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveTimer = setTimeout(() => { _saveTimer = null; _doSave() }, 3000)
  }

  function cancelPendingSave() {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null }
  }

  /** Called externally (e.g. by the drawing store after a Yjs change) to queue a save. */
  function scheduleSave() {
    if (canEdit.value !== 'unauthorized' && isServerSynced.value) debouncedSave()
  }

  // ---------------------------------------------------------------------------
  // initializeBoard
  //
  // Local-first sequence:
  //   1. Set up Yjs + wire observer (synchronous)
  //   2. Wait for IndexedDB to load → board is USABLE (isLoaded = true)
  //   3. Sync with server in background → seeds API data, refreshes metadata
  //      This step is skipped silently if offline.
  // ---------------------------------------------------------------------------
  async function initializeBoard(id: string) {
    if (_destroyDoc) {
      _destroyDoc()
      _destroyDoc = null
      _yjsBoard = null
    }

    boardId.value = id
    isLoaded.value = false
    isServerSynced.value = false
    loadError.value = null

    // Apply any cached metadata immediately so the UI isn't blank while loading
    _loadCachedMeta(id)

    // 1. Create Y.Doc + providers
    const { doc, wsProvider: wp, idbProvider, connectionStatus: cs, destroy } = useYjsDocument(id)
    _destroyDoc = destroy
    wsProvider.value = wp
    _stopConnectionWatcher?.()
    _stopConnectionWatcher = watch(cs, val => (connectionStatus.value = val), { immediate: true })

    _yjsBoard = useYjsBoard(doc)

    // Mirror undo/redo availability into reactive refs.
    // The getter functions read the refs inside _yjsBoard, registering Vue deps,
    // so the watcher fires whenever the UndoManager stacks change.
    _stopUndoWatcher?.()
    _stopUndoWatcher = watch(
      [() => _yjsBoard!.canUndo.value, () => _yjsBoard!.canRedo.value],
      ([u, r]) => { canUndo.value = u; canRedo.value = r },
      { immediate: true },
    )

    // 2. Wire Yjs observer before IDB loads so we never miss a change
    _yjsBoard.yItems.observe(() => {
      _syncFromYjs(_yjsBoard!.yItems.toJSON())
      if (canEdit.value !== 'unauthorized' && isServerSynced.value) debouncedSave()
    })

    // 2b. Initialize the drawing store with the same Y.Doc
    const drawingStore = useDrawingStore()
    drawingStore.initialize(doc)

    // 3. Wait for IndexedDB — this is the only blocking step
    await idbProvider.whenSynced
    _syncFromYjs(_yjsBoard.yItems.toJSON())
    isLoaded.value = true // Board is usable from local data now

    // 4. Background: sync with server (non-blocking, silent on failure)
    _syncWithServer(id)
  }

  // ---------------------------------------------------------------------------
  // Background server sync — called after IDB load, never awaited by the page
  // ---------------------------------------------------------------------------
  async function _syncWithServer(id: string) {
    try {
      const boardData = await $fetch<{
        id: string
        title: string
        boardType: BoardType
        accessLevel: BoardAccessLevel
        customUrl: string | null
        ownerId: string | null
        canEdit: boolean
        data: { items: Record<string, BoardItem>; drawings?: Record<string, DrawingItem> } | null
      }>(`/api/board/${id}`)

      title.value = boardData.title
      boardType.value = boardData.boardType
      accessLevel.value = boardData.accessLevel
      customUrl.value = boardData.customUrl
      ownerId.value = boardData.ownerId
      canEdit.value = boardData.canEdit ? 'authorized' : 'unauthorized'

      // Cache metadata for the next offline load
      localStorage.setItem(metaCacheKey(id), JSON.stringify({
        title: boardData.title,
        boardType: boardData.boardType,
        accessLevel: boardData.accessLevel,
        customUrl: boardData.customUrl,
        ownerId: boardData.ownerId,
      }))

      // Track in the known-boards list for the header dropdown
      _trackBoard(id, boardData.title)

      // Seed Yjs with server data — only adds items not already present.
      // isServerSynced is set AFTER seeding so the seed's Yjs observer
      // does not trigger a redundant save echoing data back to the server.
      if (boardData.data?.items) {
        _yjsBoard?.seed(boardData.data.items)
      }
      const drawingStore = useDrawingStore()
      drawingStore.seedFromServer(boardData.data?.drawings)
      isServerSynced.value = true
    }
    catch (err: any) {
      const status = err?.response?.status ?? err?.statusCode ?? 0
      if (status === 403 || status === 401) {
        loadError.value = { status: 403, message: 'You don\u2019t have permission to access this board.' }
        canEdit.value = 'unauthorized'
        isLoaded.value = false
        items.value = new Map()
        forgetBoard(id)
      }
      else if (status === 404) {
        loadError.value = { status: 404, message: 'This board doesn\u2019t exist or has been deleted.' }
        isLoaded.value = false
        items.value = new Map()
        forgetBoard(id)
      }
      else {
        // Offline or server unavailable — keep using local IDB data.
        canEdit.value = 'offline'
        console.info('[board] Offline — using local data from IndexedDB')
      }
    }
  }

  function _loadCachedMeta(id: string) {
    try {
      const raw = localStorage.getItem(metaCacheKey(id))
      if (!raw) return
      const meta = JSON.parse(raw)
      if (meta.title) title.value = meta.title
      if (meta.boardType) boardType.value = meta.boardType
      if (meta.accessLevel) accessLevel.value = meta.accessLevel
      if (meta.customUrl !== undefined) customUrl.value = meta.customUrl
      if (meta.ownerId) ownerId.value = meta.ownerId
    }
    catch { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Teardown
  // ---------------------------------------------------------------------------
  function destroyBoard() {
    cancelPendingSave()
    const drawingStore = useDrawingStore()
    drawingStore.destroy()
    _stopUndoWatcher?.()
    _stopUndoWatcher = null
    _stopConnectionWatcher?.()
    _stopConnectionWatcher = null
    _destroyDoc?.()
    _destroyDoc = null
    _yjsBoard = null
    boardId.value = ''
    customUrl.value = null
    canUndo.value = false
    canRedo.value = false
    wsProvider.value = null
    isLoaded.value = false
    isServerSynced.value = false
    connectionStatus.value = 'disconnected'
  }

  // ---------------------------------------------------------------------------
  // switchBoard — robust board-to-board transition
  //
  // Sequence:
  //   1. Cancel any pending debounced save
  //   2. Flush an immediate save if there are dirty changes
  //   3. Tear down the current board (Yjs, WS, IDB, drawing store)
  //   4. Reset all UI state (selection, drawing mode, etc.)
  //   5. Initialize the new board
  // ---------------------------------------------------------------------------
  async function switchBoard(newId: string) {
    if (newId === boardId.value) return
    isSwitching.value = true
    loadError.value = null

    // Cancel pending debounced save
    cancelPendingSave()

    // Tear down current board (also destroys drawing store)
    destroyBoard()

    // Reset items immediately so stale widgets don't flash
    items.value = new Map()
    title.value = 'Untitled Board'
    boardType.value = 'standard'

    // Reset UI state — dynamic import avoids circular dependency
    const uiStore = (await import('~/stores/ui')).useUiStore()
    uiStore.deselectAll()
    uiStore.exitDrawingMode()
    uiStore.exitBoardSelectMode()

    // Reset canvas view
    scale.value = 1
    translateX.value = 0
    translateY.value = 0

    // Initialize the new board (sets isLoaded = true when IDB syncs)
    await initializeBoard(newId)

    isSwitching.value = false
  }

  // ---------------------------------------------------------------------------
  // Write API — all mutations go through Yjs, never directly to `items`
  // ---------------------------------------------------------------------------
  function addItem(item: BoardItem) {
    _yjsBoard?.addItem(item)
    // Auto-create initial checkpoint for the new item (fire-and-forget)
    if (boardId.value && isServerSynced.value) {
      $fetch(`/api/board/${boardId.value}/checkpoints`, {
        method: 'POST',
        body: { itemId: item.id, itemSnapshot: item },
      }).catch(() => { /* silent — checkpoint is best-effort */ })
    }
  }

  function updateItem(id: string, changes: Partial<BoardItem>) {
    const authStore = useAuthStore()
    const stamp = {
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: authStore.profile?.id ?? 'anonymous',
    }
    _yjsBoard?.updateItem(id, { ...changes, ...stamp })
  }

  /**
   * Update only the reactions map for an item.
   * Deliberately bypasses the lastUpdatedAt/lastUpdatedBy stamp —
   * a reaction vote is not a content edit.
   */
  function updateReactions(id: string, reactions: Record<string, string[]>) {
    _yjsBoard?.updateItem(id, { reactions } as Partial<BoardItem>)
  }

  function removeItem(id: string) { _yjsBoard?.removeItem(id) }

  /**
   * Create a GroupItem from the given child IDs.
   * Calculates bounding box, creates the group widget, tags all children with parentGroupId.
   * Returns the new group ID.
   */
  function createGroup(childIds: string[]): string | null {
    if (childIds.length < 2) return null
    const authStore = useAuthStore()
    const profileId = authStore.profile?.id ?? 'anonymous'
    const now = new Date().toISOString()

    // Compute bounding box of all children
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const id of childIds) {
      const it = items.value.get(id)
      if (!it) continue
      minX = Math.min(minX, it.x_position)
      minY = Math.min(minY, it.y_position)
      maxX = Math.max(maxX, it.x_position + it.width)
      maxY = Math.max(maxY, it.y_position + it.height)
    }
    const PAD = 16
    const groupId = `GROUP-${nanoid(10)}`
    const group: GroupItem = {
      id: groupId,
      kind: 'group',
      x_position: minX - PAD,
      y_position: minY - PAD,
      width: (maxX - minX) + PAD * 2,
      height: (maxY - minY) + PAD * 2,
      lock: false,
      displayName: '',
      createdAt: now,
      createdBy: profileId,
      lastUpdatedAt: now,
      lastUpdatedBy: profileId,
      childIds: [...childIds],
    }
    _yjsBoard?.addItem(group)
    for (const id of childIds) {
      _yjsBoard?.updateItem(id, { parentGroupId: groupId } as Partial<BoardItem>)
    }
    return groupId
  }

  /**
   * Dissolve a group: clear parentGroupId from all children, remove the GroupItem.
   * Returns the former childIds.
   */
  function dissolveGroup(groupId: string): string[] {
    const group = items.value.get(groupId) as GroupItem | undefined
    if (!group || group.kind !== 'group') return []
    const childIds = [...group.childIds]
    for (const id of childIds) {
      _yjsBoard?.updateItem(id, { parentGroupId: undefined } as Partial<BoardItem>)
    }
    _yjsBoard?.removeItem(groupId)
    return childIds
  }

  function undo() { _yjsBoard?.undo() }
  function redo() { _yjsBoard?.redo() }

  // Undo/redo availability — refs rather than computed because _yjsBoard is a
  // plain (non-reactive) variable. A computed reading _yjsBoard?.canUndo.value
  // would register no dependency when _yjsBoard is null on first render and
  // would stay permanently stale. The watcher set up in initializeBoard keeps
  // these in sync once _yjsBoard is available.
  const canUndo = ref(false)
  const canRedo = ref(false)

  // ---------------------------------------------------------------------------
  // Zoom helpers — center-anchored, no need for cursor coords
  // ---------------------------------------------------------------------------
  const SCALE_MIN = 0.1
  const SCALE_MAX = 2.0

  function zoomTo(newScale: number) {
    const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, newScale))
    const ratio = clamped / scale.value
    translateX.value *= ratio
    translateY.value *= ratio
    scale.value = clamped
  }

  function zoomBy(factor: number) { zoomTo(scale.value * factor) }

  function zoomReset() {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
  }

  /** Fit all items inside the viewport with 40px padding on each side. */
  function zoomFit() {
    const allItems = [...items.value.values()]
    if (allItems.length === 0) { zoomReset(); return }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const item of allItems) {
      minX = Math.min(minX, item.x_position)
      minY = Math.min(minY, item.y_position)
      maxX = Math.max(maxX, item.x_position + item.width)
      maxY = Math.max(maxY, item.y_position + item.height)
    }

    const PAD = 64
    const vw = window.innerWidth
    const vh = window.innerHeight - 48 // subtract header

    const boundsW = maxX - minX + PAD * 2
    const boundsH = maxY - minY + PAD * 2
    const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.min(vw / boundsW, vh / boundsH)))

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    scale.value = newScale
    translateX.value = -centerX * newScale
    translateY.value = -centerY * newScale
  }

  /** Pan the viewport to center on a specific item and select it. */
  async function panToItem(itemId: string) {
    const item = items.value.get(itemId)
    if (!item) return
    const centerX = item.x_position + item.width / 2
    const centerY = item.y_position + item.height / 2
    translateX.value = -centerX * scale.value
    translateY.value = -centerY * scale.value
    const { useUiStore } = await import('~/stores/ui')
    useUiStore().selectItem(itemId)
  }

  async function updateTitle(newTitle: string) {
    title.value = newTitle
    _trackBoard(boardId.value, newTitle)
    // Update cache immediately
    const cached = localStorage.getItem(metaCacheKey(boardId.value))
    if (cached) {
      try {
        localStorage.setItem(metaCacheKey(boardId.value), JSON.stringify({ ...JSON.parse(cached), title: newTitle }))
      }
      catch { /* ignore */ }
    }
    if (isServerSynced.value) {
      await $fetch(`/api/board/${boardId.value}`, { method: 'PATCH', body: { title: newTitle } })
    }
  }

  return {
    scale, translateX, translateY,
    boardId, title, boardType, accessLevel, ownerId, canEdit,
    customUrl,
    items, boardItemsArray,
    connectionStatus, isSaving, isSwitching, isLoaded, isServerSynced, loadError,
    canUndo, canRedo,
    wsProvider,
    knownBoards,
    initializeBoard, destroyBoard, switchBoard, scheduleSave, syncKnownBoards,
    addItem, updateItem, updateReactions, removeItem, createGroup, dissolveGroup,
    undo, redo, updateTitle, forgetBoard, panToItem,
    zoomTo, zoomBy, zoomReset, zoomFit,
  }
})
