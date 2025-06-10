import type { Board, BoardItem } from "~/types/board";

/**
 * Represents the dimensions of an item on the board
 * Contains width and height properties
 */
interface ItemDimensions {
  width: number;
  height: number;
}

/**
 * Represents the position of an item on the board
 * Contains x and y coordinates
 */
interface Position {
  x: number;
  y: number;
}

/**
 * Represents the bounding box of items on the board
 * Contains minimum and maximum coordinates, and overall dimensions
 */
interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Represents the dimensions of the viewport
 * Used for calculating optimal zoom level
 */
interface ViewportDimensions {
  width: number;
  height: number;
}

const GRID_SIZE = 20; // Snap to grid size
const MARGIN = 10; // Margin between items
const INITIAL_OFFSET = 48; // Initial offset from top-left
const MIN_ZOOM = 0.1; // Minimum zoom level
const MAX_ZOOM = 1.0; // Maximum zoom level
const DEFAULT_PADDING = 0.1; // Default padding around items (10%)

function doesItemOverlap(
  position: Position,
  dimensions: ItemDimensions,
  existingItem: BoardItem
): boolean {
  return !(
    position.x + dimensions.width + MARGIN < existingItem.x_position ||
    position.x > existingItem.x_position + existingItem.width + MARGIN ||
    position.y + dimensions.height + MARGIN < existingItem.y_position ||
    position.y > existingItem.y_position + existingItem.height + MARGIN
  );
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * Calculates the bounding box for all items on the board
 *  @param boardData Board data containing items as a Map/Object
 * @returns Bounds object containing the min/max coordinates and dimensions
 */
 export function calculateBoardBounds(boardData: Board["data"]): Bounds {
   const items = boardData.items ? Object.values(boardData.items) : [];
  if (!items.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  const bounds = items.reduce(
    (acc, item) => {
      const itemRight = item.x_position + item.width;
      const itemBottom = item.y_position + item.height;

      return {
        minX: Math.min(acc.minX, item.x_position),
        minY: Math.min(acc.minY, item.y_position),
        maxX: Math.max(acc.maxX, itemRight),
        maxY: Math.max(acc.maxY, itemBottom),
      };
    },
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
  );

  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}

/**
 * Calculates the optimal zoom level to fit all items in the viewport
 * @param bounds Bounding box of all items
 * @param viewport Viewport dimensions
 * @param padding Padding percentage around items (0-1)
 * @returns Optimal scale factor between MIN_ZOOM and MAX_ZOOM
 */
export function calculateOptimalZoom(
  bounds: Bounds,
  viewport: ViewportDimensions,
  padding: number = DEFAULT_PADDING
): number {
  if (bounds.width === 0 || bounds.height === 0) {
    return 1;
  }

  // Validate and clamp padding
  const validPadding = Math.max(0, Math.min(1, padding));

  // Add padding to the content
  const paddedWidth = bounds.width * (1 + validPadding * 2);
  const paddedHeight = bounds.height * (1 + validPadding * 2);

  // Calculate scale factors for both dimensions
  const scaleX = viewport.width / paddedWidth;
  const scaleY = viewport.height / paddedHeight;

  // Use the smaller scale to ensure all content fits
  const scale = Math.min(scaleX, scaleY);

  // Clamp the scale between reasonable limits
  return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
}

/**
 * Calculates the center position for the board items
 * @param bounds Bounding box of all items
 * @returns Center coordinates {x, y}
 */
export function calculateBoardCenter(bounds: Bounds): { x: number; y: number } {
  return {
    x: bounds.minX + bounds.width / 2,
    y: bounds.minY + bounds.height / 2,
  };
}

export function findAvailablePosition(
  boardData: Board["data"],
  dimensions: ItemDimensions
): Position {
  // If board is empty, start from initial offset
  if (!boardData.items || Object.keys(boardData.items).length === 0) {
    return {
      x: snapToGrid(INITIAL_OFFSET),
      y: snapToGrid(INITIAL_OFFSET),
    };
  }

  // Find the bounds of existing items
  const existingItems = Object.values(boardData.items);
  let maxY = Math.max(
    ...existingItems.map((item) => item.y_position + item.height)
  );

  // Start searching from the top
  let currentY = INITIAL_OFFSET;
  const maxAttempts = 1000; // Prevent infinite loops
  let attempts = 0;

  while (currentY <= maxY + MARGIN && attempts < maxAttempts) {
    let currentX = INITIAL_OFFSET;

    while (currentX < 3000 && attempts < maxAttempts) {
      // Arbitrary max width of 3000px
      attempts++;

      const position = {
        x: snapToGrid(currentX),
        y: snapToGrid(currentY),
      };

      // Check if this position overlaps with any existing item
      let hasOverlap = false;
      for (const item of existingItems) {
        if (doesItemOverlap(position, dimensions, item)) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        return position;
      }

      currentX += GRID_SIZE;
    }

    currentY += GRID_SIZE;
  }

  // If no space found in existing bounds, place below all items
  return {
    x: snapToGrid(INITIAL_OFFSET),
    y: snapToGrid(maxY + MARGIN * 2),
  };
}

export function hashToBucket(input: any, bucketCount: number) {
  const text = String(input);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % bucketCount);
}

export function getSSEServer(id: string) {
  const servers = [
    "https://tackpad-sse.onrender.com",
    "https://tackpad-sse-2.onrender.com/",
  ];
  return new URL(servers[hashToBucket(id, servers.length)]);
}
