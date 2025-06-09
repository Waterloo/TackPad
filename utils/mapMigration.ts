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

// NEW: Convert Map to Object for direct storage
export function mapToObject(items: Map<string, BoardItem>): Record<string, BoardItem> {
  const obj: Record<string, BoardItem> = {};
  items.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

// NEW: Convert Object to Map
export function objectToMap(items: Record<string, BoardItem>): Map<string, BoardItem> {
  const map = new Map<string, BoardItem>();
  Object.entries(items).forEach(([key, value]) => {
    map.set(key, value);
  });
  return map;
}

// NEW: Universal deserializer that handles both array (legacy) and object (new) formats
export function deserializeBoardUniversal(boardData: any): Board {
  if (!boardData?.data?.items) {
    throw new Error('Invalid board data: missing items');
  }

  // Check if items is an array (existing format) or object (new format)
  if (Array.isArray(boardData.data.items)) {
    // Existing format: convert array to Map
    return {
      ...boardData,
      data: {
        ...boardData.data,
        items: arrayToItemsMap(boardData.data.items)
      }
    };
  } else if (typeof boardData.data.items === 'object') {
    // New format: convert object to Map
    return {
      ...boardData,
      data: {
        ...boardData.data,
        items: objectToMap(boardData.data.items)
      }
    };
  } else {
    throw new Error('Invalid board data: items must be array or object');
  }
}

// Legacy functions (keeping for backward compatibility)
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
