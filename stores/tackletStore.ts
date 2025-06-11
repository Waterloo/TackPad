import { customAlphabet } from 'nanoid'
import { useBoardStore } from './board'
import type { BoardItem } from '~/types/board'
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10)

export interface Tacklet {
  id:          string;
  name:        string;
  version:     string;
  url:         string;
  description: string;
  icon:        string;
  author:      Author;
  repository:  Repository;
  tags:        string[];
  dimensions:  Dimensions;
  config:      Config;
  permissions: string[];
}

export interface Author {
  name:  string;
  email: string;
  url:   string;
}

export interface Config {
  allowResize:      boolean;
  allowInteraction: boolean;
}

export interface Dimensions {
  minWidth:      number;
  minHeight:     number;
  defaultWidth:  number;
  defaultHeight: number;
}

export interface Repository {
  type: string;
  url:  string;
}

export const useTackletStore = defineStore('tacklets', () => {
  const boardStore = useBoardStore()

  const updateTackletContent = (itemId: string, content: any) => {
    if (!boardStore.board) return;


    const item = boardStore.board.data.items.get(itemId);

    if (item && item.kind === 'tacklet') {
      // Create updated tacklet with new content
      const updatedItem = {
        ...item,
        content: {
          ...item.content,
          data: content
        }
      };

      boardStore.board.data.items.set(itemId, updatedItem);
      boardStore.debouncedSaveBoard();
    }
  }



  const addTacklet = (tacklet: Tacklet) => {
    if (!boardStore.board) return;

    // find a x,y position in view port
    const item: BoardItem = {
      id: `TACKLET-${nanoid(10)}`, // Use proper prefix for consistency
      kind: 'tacklet',
      content: {
        url: tacklet.url,
        tackletId: tacklet.id,
        version: tacklet.version,
        data: tacklet.data || {},
        permissions: tacklet.permissions || []
      },
      x_position: 0,
      y_position: 0,
      width: tacklet.dimensions.defaultWidth || 300,
      height: tacklet.dimensions.defaultHeight || 300,
      lock: false
    };

    // Use boardStore.addBoardItem() which handles Map.set() internally
    boardStore.addBoardItem(item);
  }


  return {
    updateTackletContent,
    addTacklet
  }
})
