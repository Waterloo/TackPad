// stores/itemStore.ts
import { defineStore } from 'pinia'
import { useBoardStore } from './board'
import type { BoardItem, Position } from '~/types/board'

export const useItemStore = defineStore('items', () => {
  // Get reference to the board store
  const boardStore = useBoardStore()
  

  const getItemById = (itemId: string) => {
    if (!boardStore.board) return null
    return boardStore.board.data.items.find(item => item.id === itemId)
  }

  // Generic update item function
  const updateItem = (itemId: string, updates: Partial<BoardItem>) => {
    if (!boardStore.board) return

    const item = boardStore.board.data.items.find(item => item.id === itemId)
    if (item) {
      Object.assign(item, updates)
      boardStore.debouncedSaveBoard()
    }
  }
  
  // Update item position
  const updateItemPosition = (
    itemId: string, 
    position: { x?: number; y?: number; width?: number; height?: number }
  ) => {
    if (!boardStore.board) return

    const item = boardStore.board.data.items.find(item => item.id === itemId)
    if (item) {
      if (position.x !== undefined) item.x_position = position.x
      if (position.y !== undefined) item.y_position = position.y
      if (position.width !== undefined) item.width = position.width
      if (position.height !== undefined) item.height = position.height
      
      boardStore.debouncedSaveBoard()
    }
  }
  
  return {
    updateItem,
    updateItemPosition,
    getItemById
  }
})