import { defineStore } from 'pinia'
import * as Y from 'yjs'
import { nanoid } from 'nanoid'
import { useYjsDrawing } from '~/composables/yjs/useYjsDrawing'
import { useAuthStore } from '~/stores/auth'
import { useBoardStore } from '~/stores/board'
import type { DrawingItem, ShapeItem, DrawingStyle } from '~/shared/types/drawing'

export const DEFAULT_DRAWING_STYLE: DrawingStyle = {
  stroke: '#374151',
  fill: 'none',
  strokeWidth: 2,
  opacity: 1,
}



/**
 * Pinia store for the drawing layer.
 *
 * Lifecycle:
 *   boardStore.initializeBoard() → drawingStore.initialize(doc)
 *   boardStore.destroyBoard()    → drawingStore.destroy()
 *
 * The Y.Doc is owned by useYjsDocument (via board store). Drawing store never
 * creates or destroys the doc — it only attaches to the shared 'drawings' map.
 *
 * Save coordination:
 *   Yjs observer calls boardStore.scheduleSave() directly on every change.
 *   boardStore.debouncedSave() reads drawingStore.drawings at flush time.
 */
export const useDrawingStore = defineStore('drawing', () => {
  // ── State ──────────────────────────────────────────────────────────────────

  const drawings = ref(new Map<string, DrawingItem>())
  const selectedDrawingIds = ref(new Set<string>())

  /** Active style applied to all newly created items. */
  const activeStyle = ref<DrawingStyle>({ ...DEFAULT_DRAWING_STYLE })

  // ── Internal ───────────────────────────────────────────────────────────────

  let _yjsDrawing: ReturnType<typeof useYjsDrawing> | null = null
  let _pendingServerSeed: Record<string, DrawingItem> | null = null
  let _stopUndoWatcher: (() => void) | null = null

  function _syncFromYjs(raw: Record<string, DrawingItem>) {
    drawings.value = new Map(Object.entries(raw))
    // Trigger debounced board save directly — avoids the indirect revision-watcher
    // pattern that was coupling the page to internal store state changes.
    useBoardStore().scheduleSave()
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  function initialize(doc: Y.Doc) {
    _yjsDrawing = useYjsDrawing(doc)

    _stopUndoWatcher?.()
    _stopUndoWatcher = watch(
      [() => _yjsDrawing!.canUndo.value, () => _yjsDrawing!.canRedo.value],
      ([u, r]) => { canUndo.value = u; canRedo.value = r },
      { immediate: true },
    )

    _yjsDrawing.yDrawings.observe(() => {
      _syncFromYjs(_yjsDrawing!.yDrawings.toJSON() as Record<string, DrawingItem>)
    })

    // Sync current state (may already have data from IDB if it synced before this call)
    _syncFromYjs(_yjsDrawing.yDrawings.toJSON() as Record<string, DrawingItem>)

    // Apply any server seed that arrived before initialize() was called
    if (_pendingServerSeed) {
      _yjsDrawing.seed(_pendingServerSeed)
      _pendingServerSeed = null
    }
  }

  function destroy() {
    _stopUndoWatcher?.()
    _stopUndoWatcher = null
    _yjsDrawing = null
    drawings.value = new Map()
    selectedDrawingIds.value = new Set()
    canUndo.value = false
    canRedo.value = false
    _pendingServerSeed = null
  }

  /**
   * Called by board store's _syncWithServer to load server-side drawings into Yjs.
   * Safe to call before or after initialize().
   */
  function seedFromServer(data: Record<string, DrawingItem> | null | undefined) {
    if (!data || Object.keys(data).length === 0) return
    if (_yjsDrawing) {
      _yjsDrawing.seed(data)
    } else {
      // Merge rather than overwrite so a second call before initialize()
      // doesn't silently discard the first seed.
      _pendingServerSeed = { ..._pendingServerSeed, ...data }
    }
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  function addDrawing(item: DrawingItem) {
    _yjsDrawing?.addDrawing(item)
  }

  function updateDrawing(id: string, changes: Partial<DrawingItem>) {
    const authStore = useAuthStore()
    const stamp = {
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: authStore.profile?.id ?? 'anonymous',
    }
    _yjsDrawing?.updateDrawing(id, { ...changes, ...stamp })
  }

  /**
   * Position/resize update during a live drag — stamps only if not already in
   * a rapid-move sequence (UndoManager groups these via captureTimeout).
   */
  function updateDrawingGeometry(id: string, changes: Partial<DrawingItem>) {
    _yjsDrawing?.updateDrawing(id, changes)
  }

  function removeDrawing(id: string) {
    _yjsDrawing?.removeDrawing(id)
    selectedDrawingIds.value.delete(id)
    // Trigger reactivity since Set mutation isn't tracked
    selectedDrawingIds.value = new Set(selectedDrawingIds.value)
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  /** Select a single item (clears previous selection). Also syncs activeStyle. */
  function selectDrawing(id: string | null) {
    if (id === null) {
      selectedDrawingIds.value = new Set()
      return
    }
    selectedDrawingIds.value = new Set([id])
    const item = drawings.value.get(id)
    if (item) activeStyle.value = { ...item.style }
  }

  /** Toggle a single item in/out of the selection (for shift+click). */
  function toggleSelection(id: string) {
    const next = new Set(selectedDrawingIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      const item = drawings.value.get(id)
      if (item) activeStyle.value = { ...item.style }
    }
    selectedDrawingIds.value = next
  }

  /** Clear the entire selection. */
  function clearSelection() {
    selectedDrawingIds.value = new Set()
  }

  /** Backward-compat computed alias: defined only when exactly one item is selected. */
  const selectedDrawingId = computed<string | null>(() => {
    if (selectedDrawingIds.value.size === 1) return [...selectedDrawingIds.value][0]!
    return null
  })

  /**
   * Apply activeStyle changes to the currently selected item (if any).
   */
  function applyStyleToSelected(patch: Partial<DrawingStyle>) {
    Object.assign(activeStyle.value, patch)
    for (const id of selectedDrawingIds.value) {
      const item = drawings.value.get(id)
      if (item) {
        updateDrawing(id, {
          style: { ...item.style, ...patch },
        } as Partial<DrawingItem>)
      }
    }
  }

  // ── Grouping ───────────────────────────────────────────────────────────────

  function groupSelected() {
    if (selectedDrawingIds.value.size < 2) return
    const id = nanoid(10)
    for (const drawingId of selectedDrawingIds.value) {
      updateDrawing(drawingId, { groupId: id } as Partial<DrawingItem>)
    }
  }

  function ungroupSelected() {
    for (const drawingId of selectedDrawingIds.value) {
      updateDrawing(drawingId, { groupId: undefined } as Partial<DrawingItem>)
    }
  }

  // ── Undo / redo ────────────────────────────────────────────────────────────

  function undo() { _yjsDrawing?.undo() }
  function redo() { _yjsDrawing?.redo() }

  // Refs rather than computed — same reasoning as board store's canUndo/canRedo.
  const canUndo = ref(false)
  const canRedo = ref(false)

  // ── Derived ────────────────────────────────────────────────────────────────

  const drawingsArray = computed(() => [...drawings.value.values()])

  const selectedItem = computed(() => {
    const id = selectedDrawingId.value
    return id ? drawings.value.get(id) ?? null : null
  })

  const selectedShapeItem = computed(() => {
    const item = selectedItem.value
    return item?.kind === 'shape' ? (item as ShapeItem) : null
  })

  return {
    // State
    drawings,
    drawingsArray,
    selectedDrawingIds,
    selectedDrawingId,
    selectedItem,
    selectedShapeItem,
    activeStyle,
    // Lifecycle
    initialize,
    destroy,
    seedFromServer,
    // Writes
    addDrawing,
    updateDrawing,
    updateDrawingGeometry,
    removeDrawing,
    // Selection
    selectDrawing,
    toggleSelection,
    clearSelection,
    applyStyleToSelected,
    // Grouping
    groupSelected,
    ungroupSelected,
    // Undo / redo
    undo,
    redo,
    canUndo,
    canRedo,
  }
})
