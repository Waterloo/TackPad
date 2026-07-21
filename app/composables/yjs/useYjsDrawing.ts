import * as Y from 'yjs'
import type { DrawingItem } from '~/shared/types/drawing'
import { useYjsMap } from './useYjsMap'

/**
 * Wraps a Y.Doc's 'drawings' map with typed operations.
 * Kept in a separate map so drawing undo/redo is fully isolated from widget undo/redo.
 * captureTimeout groups rapid pointer-move transactions into a single undo step.
 *
 * Data flow:
 *   Write → Y.Map → observe() → drawingStore._syncFromYjs() → Vue re-renders
 */
export function useYjsDrawing(doc: Y.Doc) {
  const { yMap: yDrawings, seed, addItem: addDrawing, updateItem: updateDrawing, removeItem: removeDrawing, undo, redo, canUndo, canRedo }
    = useYjsMap<DrawingItem>(doc, 'drawings', { captureTimeout: 500 })

  return { yDrawings, seed, addDrawing, updateDrawing, removeDrawing, undo, redo, canUndo, canRedo }
}
