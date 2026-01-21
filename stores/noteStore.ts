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
      width: position.width || 216,
      height: position.height || 216,
    }

    boardStore.addBoardItem(newNote)
    boardStore.debouncedSaveBoard()
    return newNote
  }

  // Update note content

  const updateNoteContent = (
    noteId: string,
    updates: { text?: string; color?: string }
  ) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const note = boardStore.board.data.items.get(noteId);

    if (note && note.kind === 'note') {
      // Create updated note with new content
      const updatedNote = {
        ...note,
        content: {
          ...note.content,
          ...(updates.text !== undefined && { text: updates.text }),
          ...(updates.color !== undefined && { color: updates.color })
        }
      };

      // boardStore.board.data.items.set(noteId, updatedNote);
      boardStore.updateBoardItem(noteId, updatedNote);
      boardStore.debouncedSaveBoard();
    }
  }


  return {
    addNote,
    updateNoteContent
  }
})
