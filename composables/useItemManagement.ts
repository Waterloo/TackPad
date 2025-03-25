import { useBoardStore } from '~/stores/board';
import {useNoteStore} from '~/stores/noteStore'
import {useTodoStore} from '~/stores/todoStore'
import {useTimerStore} from '~/stores/timerStore'
import {useTextWidgetStore} from '~/stores/textWidgetStore'
import { useItemStore } from '~/stores/itemStore';
import { usePanZoom } from '~/composables/usePanZoom';

export function useItemManagement() {
  const boardStore = useBoardStore();
    const noteStore = useNoteStore();
    const todoStore = useTodoStore();
    const timerStore = useTimerStore();
    const textWidgetStore=useTextWidgetStore()
    const itemStore = useItemStore()
    const { scale, translateX, translateY } = usePanZoom();
    
  const addNote = () => {
    const position = calculateCenterPosition(200, 200, 'note');
    return noteStore.addNote('New note...', {
      x: position.x,
      y: position.y,
      color: '#FFD700',
      width: 216,
      height: 216,
      lock: false,
    });
  };

  const addTodoList = () => {
    const position = calculateCenterPosition(300, 300, 'todo');
    return todoStore.addTodoList({
      x: position.x,
      y: position.y,
      width: 300,
      height: 400,
      lock: false,
    });
  };

  const addTimer = () => {
    const position = calculateCenterPosition(300, 150, 'timer');
    return timerStore.addTimer({
      x: position.x,
      y: position.y,
      width: 300,
      height: 150,
      lock: false,
    });
  };

  const addTextWidget = () => {
    const position = calculateCenterPosition(300, 100, 'text');
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
  const calculateCenterPosition = (width: number, height: number, itemType: string = '') => {
    // Get the current viewport center in board coordinates
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Convert screen coordinates to board coordinates 
    // (taking into account current pan and zoom)
    const screenCenterX = viewportWidth / 2;
    const screenCenterY = viewportHeight / 2;
    
    // Calculate the board coordinates for the center of the screen
    const boardCenterX = (screenCenterX - translateX.value) / scale.value;
    const boardCenterY = (screenCenterY - translateY.value) / scale.value;
    
    // Check for existing items of the same type to avoid stacking
    let offsetX = 0;
    let offsetY = 0;
    
    if (boardStore.board?.data.items && itemType) {
      const sameTypeItems = boardStore.board.data.items.filter(item => item.kind === itemType);
      
      // Apply a subtle offset if there are items of the same type
      if (sameTypeItems.length > 0) {
        // Calculate offset based on the number of existing items
        // This creates a cascading effect for items of the same type
        offsetX = 25 * (sameTypeItems.length % 4); // Modulo to limit horizontal spread
        offsetY = 25 * Math.floor(sameTypeItems.length / 4); // Divide to create rows
      }
    }
    
    return {
      x: boardCenterX - width / 2 + offsetX,
      y: boardCenterY - height / 2 + offsetY,
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