import { useBoardStore } from '~/stores/board';
import {useNoteStore} from '~/stores/noteStore'
import {useTodoStore} from '~/stores/todoStore'
import {useTimerStore} from '~/stores/timerStore'
import {useTextWidgetStore} from '~/stores/textWidgetStore'
import { useItemStore } from '~/stores/itemStore';

export function useItemManagement() {
  const boardStore = useBoardStore();
    const noteStore = useNoteStore();
    const todoStore = useTodoStore();
    const timerStore = useTimerStore();
    const textWidgetStore=useTextWidgetStore()
    const itemStore = useItemStore()
  const addNote = () => {
    const position = calculateCenterPosition(300, 200);
    return noteStore.addNote('New note...', {
      x: position.x,
      y: position.y,
      color: '#FFD700',
      width: 300,
      height: 200,
      lock: false,
    });
  };

  const addTodoList = () => {
    const position = calculateCenterPosition(300, 300);
    return todoStore.addTodoList({
      x: position.x,
      y: position.y,
      width: 300,
      height: 300,
      lock: false,
    });
  };

  const addTimer = () => {
    const position = calculateCenterPosition(300, 150);
    return timerStore.addTimer({
      x: position.x,
      y: position.y,
      width: 300,
      height: 150,
      lock: false,
    });
  };

  const addTextWidget = () => {
    const position = calculateCenterPosition(300, 100);
    return textWidgetStore.addTextWidget({
      x: position.x,
      y: position.y,
      width: 300,
      height: 100,
      lock: false,
    });
  };

  const handleDelete = (e: KeyboardEvent) => {
    if (document.activeElement instanceof HTMLInputElement || 
        document.activeElement instanceof HTMLTextAreaElement) {
      return;
    }
    boardStore.deleteSelected();
  };

  const updateItemPosition = (
    itemId: string,
    updates: { x?: number; y?: number; width?: number; height?: number }
  ) => {
    // Map the position properties to their corresponding item properties
    const itemUpdates: any = {};
    if (updates.x !== undefined) itemUpdates.x_position = updates.x;
    if (updates.y !== undefined) itemUpdates.y_position = updates.y;
    if (updates.width !== undefined) itemUpdates.width = updates.width;
    if (updates.height !== undefined) itemUpdates.height = updates.height;
    
    // Use the generic updateItem function to ensure all properties are updated correctly
    itemStore.updateItem(itemId, itemUpdates);
  };

  const toggleLock = (itemId: string, locked: boolean) => {
    itemStore.updateItem(itemId, { lock: locked });
  };

  // Helper function to calculate center position
  const calculateCenterPosition = (width: number, height: number) => {
    // This should be adjusted based on the current view position and scale
    return {
      x: -width / 2,
      y: -height / 2,
    };
  };

  return {
    addNote,
    addTodoList,
    addTimer,
    addTextWidget,
    handleDelete,
    updateItemPosition,
    toggleLock
  };
}