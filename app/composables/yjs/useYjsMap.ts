import * as Y from 'yjs'

/**
 * Generic wrapper around a Y.Doc map with undo support.
 *
 * All writes to a shared Y.Map must go through these methods so that
 * the UndoManager can track and revert them.
 *
 * Data flow:
 *   Write → Y.Map → observe() → store._syncFromYjs() → Vue re-renders
 */
export function useYjsMap<T extends object>(
  doc: Y.Doc,
  mapName: string,
  undoOptions?: ConstructorParameters<typeof Y.UndoManager>[1],
) {
  const yMap = doc.getMap<T>(mapName)
  const undoManager = new Y.UndoManager(yMap, undoOptions)

  /**
   * Seeds the map from server data without overwriting items already present
   * (e.g. from IndexedDB or a collaborating peer).
   */
  function seed(serverItems: Record<string, T>) {
    doc.transact(() => {
      for (const [id, item] of Object.entries(serverItems)) {
        if (!yMap.has(id)) {
          yMap.set(id, item)
        }
      }
    })
  }

  function addItem(item: T & { id: string }) {
    yMap.set(item.id, item)
  }

  function updateItem(id: string, changes: Partial<T>) {
    const existing = yMap.get(id)
    if (!existing) return
    yMap.set(id, { ...existing, ...changes } as T)
  }

  function removeItem(id: string) {
    yMap.delete(id)
  }

  function undo() { undoManager.undo() }
  function redo() { undoManager.redo() }

  // undoManager.undoStack / redoStack are plain JS arrays — Vue cannot track them.
  // Subscribe to UndoManager events and mirror into refs so consumers stay reactive.
  const canUndo = ref(false)
  const canRedo = ref(false)

  function _syncStacks() {
    canUndo.value = undoManager.undoStack.length > 0
    canRedo.value = undoManager.redoStack.length > 0
  }

  undoManager.on('stack-item-added', _syncStacks)
  undoManager.on('stack-item-popped', _syncStacks)
  undoManager.on('stack-cleared', _syncStacks)

  return {
    yMap,
    seed,
    addItem,
    updateItem,
    removeItem,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
