// stores/textWidgetStore.ts
import { defineStore } from 'pinia'
import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
import type { TextWidget, Position } from '~/types/board'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export const useTextWidgetStore = defineStore('textWidgets', () => {
  // Get reference to the board store
  const boardStore = useBoardStore()

  const addTextWidget = (position: Position) => {
    return new Promise<TextWidget>((resolve, reject) => {
      if (!boardStore.board) {
        reject(new Error('Board not found'));
        return;
      }

      const textWidget: TextWidget = {
        id: `TEXT-${nanoid(10)}`, // Use proper prefix for consistency
        kind: 'text',
        x_position: position.x,
        y_position: position.y,
        width: position.width || 200,
        height: position.height || 64,
        lock: false,
        content: {
          text: 'Double click to edit text',
        },
      };

      boardStore.addBoardItem(textWidget);
      boardStore.debouncedSaveBoard();

      resolve(textWidget);  // Resolve the promise with the created textWidget
    });
  };


  // Update text widget content

  const updateTextWidgetContent = (widgetId: string, text: string) => {
    if (!boardStore.board) return

    // Use Map.get() for O(1) lookup
    const widget = boardStore.board.data.items.get(widgetId);

    if (widget && widget.kind === 'text') {
      // Create updated widget with new text
      const updatedWidget = {
        ...widget,
        content: {
          ...widget.content,
          text
        }
      };

      boardStore.updateBoardItem(widgetId, updatedWidget);
      boardStore.debouncedSaveBoard();
    }
  }


  return {
    addTextWidget,
    updateTextWidgetContent
  }
})
