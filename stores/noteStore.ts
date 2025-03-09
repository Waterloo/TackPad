// stores/noteStore.ts
import { defineStore } from 'pinia'
import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
import type { StickyNote, Position } from '~/types/board'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export const useNoteStore = defineStore('notes', () => {
  // Get reference to the board store
  const boardStore = useBoardStore()
  
  // Add a sticky note
  const addNote = (
    content: string,
    position: Position & { color: string }
  ) => {
    if (!boardStore.board) return null

    const newNote: StickyNote = {
      id: `STICKY-${nanoid(10)}`,
      kind: 'note',
      content: {
        text: content,
        color: position.color
      },
      x_position: position.x,
      y_position: position.y,
      width: position.width || 200,
      height: position.height || 200,
    }

    boardStore.board.data.items.push(newNote)
    boardStore.debouncedSaveBoard()
    return newNote
  }
  
  // Update note content
  const updateNoteContent = (
    noteId: string, 
    updates: { text?: string; color?: string }
  ) => {
    if (!boardStore.board) return

    const note = boardStore.board.data.items.find(
      item => item.id === noteId && item.kind === 'note'
    ) as StickyNote | undefined
    
    if (note) {
      if (updates.text !== undefined) note.content.text = updates.text
      if (updates.color !== undefined) note.content.color = updates.color
      
      boardStore.debouncedSaveBoard()
    }
  }
  
  return {
    addNote,
    updateNoteContent
  }
})