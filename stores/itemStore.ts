
// stores/itemStore.ts
import { defineStore } from 'pinia'
import { useBoardStore } from './board'
import type { BoardItem, Position } from '~/types/board'

export const useItemStore = defineStore('items', () => {
  // Get reference to the board store
  const boardStore = useBoardStore()


  const getItemById = (itemId: string) => {
    if (!boardStore.board) return null
    // Use Map.get() for O(1) lookup instead of array.find()
    return boardStore.board.data.items.get(itemId) || null
  }

  // Generic update item function
  const updateItem = (itemId: string, updates: Partial<BoardItem>) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const item = boardStore.board.data.items.get(itemId)
    if (item) {
      // Create updated item and set it back to the Map
      const updatedItem = Object.assign({}, item, updates)
      boardStore.updateBoardItem(itemId, updatedItem)
      boardStore.debouncedSaveBoard()
    }
  }

  // Update item position
  const updateItemPosition = (
    itemId: string,
    position: { x?: number; y?: number; width?: number; height?: number }
  ) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const item = boardStore.board.data.items.get(itemId)
    if (item) {
      // Create a copy of the item with updated position
      const updatedItem = { ...item }
      if (position.x !== undefined) updatedItem.x_position = position.x
      if (position.y !== undefined) updatedItem.y_position = position.y
      if (position.width !== undefined) updatedItem.width = position.width
      if (position.height !== undefined) updatedItem.height = position.height

      // Set the updated item back to the Map
      boardStore.updateBoardItem(itemId, updatedItem)
      boardStore.debouncedSaveBoard()
    }
  }

  const hasItem = (itemId: string) => {
    if (!boardStore.board) return false
    return boardStore.board.data.items.has(itemId)
  }

  const getAllItems = () => {
    if (!boardStore.board) return []
    return Array.from(boardStore.board.data.items.values())
  }

  const getItemsByKind = (kind: string) => {
    if (!boardStore.board) return []
    return Array.from(boardStore.board.data.items.values()).filter(item => item.kind === kind)
  }

  return {
    // Core functions
    getItemById,
    updateItem,
    updateItemPosition,
    // Utility functions
    hasItem,
    getAllItems,
    getItemsByKind
  }
})
