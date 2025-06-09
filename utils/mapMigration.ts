import type { Board, BoardItem, SerializedBoard } from "~/types/board";

// Utility functions for Map conversion
export function arrayToItemsMap(items: BoardItem[]): Map<string, BoardItem> {
  const map = new Map<string, BoardItem>();
  items.forEach(item => map.set(item.id, item));
  return map;
}

export function itemsMapToArray(items: Map<string, BoardItem>): BoardItem[] {
  return Array.from(items.values());
}

export function serializeBoard(board: Board): SerializedBoard {
  return {
    ...board,
    data: {
      ...board.data,
      items: itemsMapToArray(board.data.items)
    }
  };
}

export function deserializeBoard(serializedBoard: SerializedBoard): Board {
  return {
    ...serializedBoard,
    data: {
      ...serializedBoard.data,
      items: arrayToItemsMap(serializedBoard.data.items)
    }
  };
}
