import * as Y from 'yjs'
import type { BoardItem } from '~/shared/types/board'
import { useYjsMap } from './useYjsMap'

/**
 * Wraps a Y.Doc's 'items' map with typed operations.
 * All writes to board items must go through these methods — never write
 * directly to the Pinia store.
 *
 * Data flow:
 *   Write → Y.Map → observe() → boardStore._syncFromYjs() → Vue re-renders
 */
export function useYjsBoard(doc: Y.Doc) {
  const { yMap: yItems, seed, addItem, updateItem, removeItem, undo, redo, canUndo, canRedo }
    = useYjsMap<BoardItem>(doc, 'items')

  return { yItems, seed, addItem, updateItem, removeItem, undo, redo, canUndo, canRedo }
}
