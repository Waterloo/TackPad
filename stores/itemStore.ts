// stores/itemStore.ts
import { defineStore } from "pinia";
import { useBoardStore } from "./board";
import type { BoardItem, Position } from "~/types/board";
import { update } from "lodash";

export const useItemStore = defineStore("items", () => {
  // Get reference to the board store
  const boardStore = useBoardStore();
  const snapLines = ref([]);

  const getItemById = (itemIds: string[]) => {
    if (!boardStore.board) return null;
    return boardStore.board.data.items.filter((item) => itemIds.includes(item.id));
  };

  // Generic update item function
  const updateItem = (itemId: string, updates: Partial<BoardItem>) => {
    if (!boardStore.board) return;

    const item = boardStore.board.data.items.find((item) => item.id === itemId);
    if (item) {
      const newX = updates.x_position
      const newY = updates.y_position
      const tempItem = {
             ...item,
             x_position: newX,
             y_position: newY
           };

      spatialIndex.updateItemPosition(itemId, updates.x_position, updates.y_position, updates.width, updates.height)
      const nearbyItems= spatialIndex.findNearbyItems(item, 500);
      const { snapLines:newSnapLines, snappedPosition } = calculateAlignmentGuides(
              tempItem,
              nearbyItems,
             10
            );
      snapLines.value=newSnapLines

      Object.assign(item, updates);
      boardStore.debouncedSaveBoard();
    }
  };

  // Update item position
  const updateItemPosition = (
    itemId: string,
    position: { x?: number; y?: number; width?: number; height?: number },
  ) => {
    if (!boardStore.board) return;

    const item = boardStore.board.data.items.find((item) => item.id === itemId);
    if (item) {
      console.log('oldItemPosition',item)
      if (position.x !== undefined) item.x_position = position.x;
      if (position.y !== undefined) item.y_position = position.y;
      if (position.width !== undefined) item.width = position.width;
      if (position.height !== undefined) item.height = position.height;

      boardStore.debouncedSaveBoard();
    }
  };
  const getSelectedItems = ()=>{
    if (!boardStore.board) return;
    if (boardStore.selectedId?.length < 1) return;

    const selectedItemIds = boardStore.selectedId.filter((id)=> id!=='SELECTION-BOX')
    const items = getItemById(selectedItemIds)
    return items ?? [];

  }

  const updateAlignItem = (
    itemId: string,
    position: { x_position?: number; y_position?: number; width?: number; height?: number },
  ) => {
    if (!boardStore.board) return;

    const item = boardStore.board.data.items.find((item) => item.id === itemId);
    if (item) {
      console.log('oldItemPosition',item)
      if (position.x_position !== undefined) item.x_position = position.x_position;
      if (position.y_position !== undefined) item.y_position = position.y_position;
      if (position.width !== undefined) item.width = position.width;
      if (position.height !== undefined) item.height = position.height;

      boardStore.debouncedSaveBoard();
    }
  };
  const updateItemsPosition= (updates)=>{
    if (!boardStore.board) return;
    if(updates && updates.length>0){
      updates.forEach((item)=>{
        console.log(item)
        updateAlignItem(item.id,item)
      })
    }

  }

  return {
    updateItem,
    updateItemPosition,
    getItemById,
    snapLines,
    getSelectedItems,
    updateItemsPosition
  };
});
