// composables/useYjsBoard.ts
import * as Y from 'yjs'
import { useYjsConnection } from './useYjsConnection'
import { useBoardStore } from '@/stores/board'
import { watchEffect, ref } from 'vue'

// Cache board instances like we do with connections
const boards = new Map<string, {
  updateItem: (id: string, patch: Partial<BoardItem>) => void,
  addItem: (item: BoardItem) => void,
  removeItem: (id: string) => void,
  isInitialized: ReturnType<typeof ref>,
  undoManager: Y.UndoManager,
  undo: () => void,
  redo: () => void,
  canUndo: () => boolean,
  canRedo: () => boolean
}>()

export function useYjsBoard(boardId: string) {
  // Return existing instance if available
  if (boards.has(boardId)) {
    console.log('Reusing existing board instance for:', boardId)
    return boards.get(boardId)!
  }

  console.log('Creating new board instance for:', boardId)
  const { ydoc, ready, wsReady } = useYjsConnection(boardId)
  const yItemsMap = ydoc.getMap<BoardItem>('items')
  const boardStore = useBoardStore()
  const isInitialized = ref(false)

  // Initialize UndoManager for the items map
  const undoManager = new Y.UndoManager(yItemsMap)

  // Set up scope for undo operations (optional: can include other user's operations)
  undoManager.addToScope([yItemsMap])

  // 1) Wait for both IndexedDB and WebSocket to be ready (only once)
  watchEffect(() => {
    if (!ready.value || !wsReady.value || isInitialized.value) return

    try {
      if (yItemsMap.size === 0) {
        console.log('Seeding Y.Map from local store')
        boardStore.board?.data.items.forEach(item => {
          yItemsMap.set(item.id, item)
        })
      } else {
        console.log('Hydrating local store from Y.Map')
        const yMapItems = Array.from(yItemsMap.values())
        boardStore.updateBoardItems(arrayToItemsMap(yMapItems))
      }
      isInitialized.value = true
    } catch (error) {
      console.error('Error during initial Y.Map sync:', error)
    }
  })

  // 2) Observe remote changes → Pinia (only set up once)
  yItemsMap.observe(() => {
    if (!isInitialized.value) return

    try {

      const yMapItems = Array.from(yItemsMap.values())
      console.log('Y.Map changed, updating store', yMapItems)
      boardStore.updateBoardItems(arrayToItemsMap(yMapItems))
    } catch (error) {
      console.error('Error handling Y.Map changes:', error)
    }
  })

  // 3) Action functions
  function updateItem(id: string, patch: Partial<BoardItem>) {
    try {
      console.log('updateItem', id, patch)
      const current = yItemsMap.get(id)
      if (!current) {
        console.warn(`Item with id ${id} not found in Y.Map`)
        return
      }
      yItemsMap.set(id, { ...current, ...patch })
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  function addItem(item: BoardItem) {
    try {
      console.log('addItem', item)
      yItemsMap.set(item.id, item)
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  function removeItem(id: string) {
    try {
      console.log('removeItem', id)
      yItemsMap.delete(id)
    } catch (error) {
      console.error('Error removing item:', error)
    }
  }
  // Undo/Redo functions
  function undo() {
    try {
      undoManager.undo()
      console.log('Undo operation performed')
    } catch (error) {
      console.error('Error performing undo:', error)
    }
  }

  function redo() {
    try {
      undoManager.redo()
      console.log('Redo operation performed')
    } catch (error) {
      console.error('Error performing redo:', error)
    }
  }

  function canUndo(): boolean {
    return undoManager.undoStack.length > 0
  }

  function canRedo(): boolean {
    return undoManager.redoStack.length > 0
  }

  const boardInstance = {
    updateItem,
    addItem,
    removeItem,
    isInitialized,
    undoManager,
    undo,
    redo,
    canUndo,
    canRedo
  }
  boards.set(boardId, boardInstance)

  return boardInstance
}

// Clean up when connection is destroyed
export function cleanupBoard(boardId: string) {
  console.log('Cleaning up board instance for:', boardId)
  boards.delete(boardId)
}
