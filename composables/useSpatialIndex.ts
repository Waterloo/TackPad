import type { BoardItem } from "~/types/board";

export class SpatialIndex {
  private gridSize: number;
  private index: Map<string, Set<string>>;
  private items: Map<string, BoardItem>;

  constructor(gridSize = 500) {
    this.gridSize = gridSize;
    this.index = new Map();
    this.items = new Map();
  }

  private getBucketKey(x: number, y: number): string {
    return `${Math.floor(x / this.gridSize)},${Math.floor(y / this.gridSize)}`;
  }

  bulkLoad(items: BoardItem[]) {
    items.forEach((item) => this.addItem(item));
  }

  addItem(item: BoardItem) {
    const centerX = item.x_position + item.width / 2;
    const centerY = item.y_position + item.height / 2;

    this.items.set(item.id, item);

    const key = this.getBucketKey(centerX, centerY);

    if (!this.index.has(key)) {
      this.index.set(key, new Set());
    }
    this.index.get(key)!.add(item.id);
  }

  removeItem(itemId: string) {
    const item = this.items.get(itemId);

    if (!item) return;

    const centerX = item.x_position + item.width / 2;
    const centerY = item.y_position + item.height / 2;

    const key = this.getBucketKey(centerX, centerY);

    if (this.index.has(key)) {
      this.index.get(key)!.delete(itemId);
    }
    this.items.delete(itemId);
  }

  updateItemPosition(
    itemId: string,
    newX: number,
    newY: number,
    newWidth: number,
    newHeight: number,
  ) {
    const item = this.items.get(itemId);
    if (!item) return;

    // Remove from old bucket
    const oldCenterX = item.x_position + item.width / 2;
    const oldCenterY = item.y_position + item.height / 2;
    const oldKey = this.getBucketKey(oldCenterX, oldCenterY);
    if (this.index.has(oldKey)) {
      this.index.get(oldKey)!.delete(itemId);
    }

    // Update item coordinates
    item.x_position = newX;
    item.y_position = newY;
    item.width = newWidth;
    item.height = newHeight;

    // Add to new bucket
    const newCenterX = newX + newWidth / 2;
    const newCenterY = newY + newHeight / 2;
    const newKey = this.getBucketKey(newCenterX, newCenterY);
    if (!this.index.has(newKey)) {
      this.index.set(newKey, new Set());
    }
    this.index.get(newKey)!.add(itemId);
  }

  findNearbyItems(item: BoardItem, radius = 200): BoardItem[] {
    const centerX = item.x_position + item.width / 2;
    const centerY = item.y_position + item.height / 2;

    const neighborKeys = [
      this.getBucketKey(centerX, centerY),
      this.getBucketKey(centerX - this.gridSize, centerY),
      this.getBucketKey(centerX + this.gridSize, centerY),
      this.getBucketKey(centerX, centerY - this.gridSize),
      this.getBucketKey(centerX, centerY + this.gridSize),
    ];

    const candidateIds = new Set<string>();
    neighborKeys.forEach((key) => {
      const bucket = this.index.get(key);
      if (bucket) {
        bucket.forEach((id) => candidateIds.add(id));
      }
    });

    return Array.from(candidateIds)
      .map((id) => this.items.get(id)!)
      .filter((nearbyItem) => {
        return (
          this.calculateDistance(item, nearbyItem) <= radius &&
          nearbyItem.id !== item.id
        );
      });
  }
  findItemsInBox(box: { x: number, y: number, width: number, height: number }): BoardItem[] {
    // Calculate the grid cells that intersect with the box
    const startGridX = Math.floor(box.x / this.gridSize);
    const endGridX = Math.floor((box.x + box.width) / this.gridSize);
    const startGridY = Math.floor(box.y / this.gridSize);
    const endGridY = Math.floor((box.y + box.height) / this.gridSize);

    const candidateIds = new Set<string>();

    // Collect all items from grid cells that potentially intersect with the box
    for (let gridX = startGridX; gridX <= endGridX; gridX++) {
      for (let gridY = startGridY; gridY <= endGridY; gridY++) {
        const key = `${gridX},${gridY}`;
        const bucket = this.index.get(key);
        if (bucket) {
          bucket.forEach((id) => candidateIds.add(id));
        }
      }
    }

    // Filter items that actually intersect with the box
    return Array.from(candidateIds)
      .map((id) => this.items.get(id)!)
      .filter((item) => this.isItemInBox(item, box));
  }

  private isItemInBox(item: BoardItem, box: { x: number, y: number, width: number, height: number }): boolean {
    // Check if the item intersects with the box using axis-aligned bounding box intersection
    return !(
      item.x_position > box.x + box.width ||
      item.x_position + item.width < box.x ||
      item.y_position > box.y + box.height ||
      item.y_position + item.height < box.y
    );
  }

  private calculateDistance(item1: BoardItem, item2: BoardItem): number {
    const centerX1 = item1.x_position + item1.width / 2;
    const centerY1 = item1.y_position + item1.height / 2;
    const centerX2 = item2.x_position + item2.width / 2;
    const centerY2 = item2.y_position + item2.height / 2;

    return Math.sqrt(
      Math.pow(centerX1 - centerX2, 2) + Math.pow(centerY1 - centerY2, 2),
    );
  }
}

export const spatialIndex = new SpatialIndex();
