// stores/textWidgetStore.ts
import { defineStore } from 'pinia'
import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
import type { TextWidget, Position } from '~/types/board'

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export const useTextWidgetStore = defineStore('textWidgets', () => {
  // Get reference to the board store
  const boardStore = useBoardStore()
  
  // Add a text widget
  const addTextWidget = (position: Position) => {
    return new Promise<TextWidget>((resolve, reject) => {
      if (!boardStore.board) {
        reject(new Error('Board not found'));
        return;
      }
  
      const textWidget: TextWidget = {
        id: nanoid(),
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

    const widget = boardStore.board.data.items.find(
      item => item.id === widgetId && item.kind === 'text'
    ) as TextWidget | undefined
    
    if (widget) {
      widget.content.text = text
      boardStore.debouncedSaveBoard()
    }
  }
  
  return {
    addTextWidget,
    updateTextWidgetContent
  }
})