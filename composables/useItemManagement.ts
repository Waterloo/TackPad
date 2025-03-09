
import { useBoardStore } from '~/stores/board';
import {useNoteStore} from '~/stores/noteStore'
import {useTodoStore} from '~/stores/todoStore'
import {useTimerStore} from '~/stores/timerStore'
import {useTextWidgetStore} from '~/stores/textWidgetStore'
import { useItemStore } from '~/stores/itemStore';
import { nanoid } from 'nanoid';

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
      color: 'yellow',
      width: 300,
      height: 200,
    });
  };

  const addTodoList = () => {
    const position = calculateCenterPosition(300, 300);
    return todoStore.addTodoList({
      x: position.x,
      y: position.y,
      width: 300,
      height: 300,
    });
  };

  const addTimer = () => {
    const position = calculateCenterPosition(300, 150);
    return timerStore.addTimer({
      x: position.x,
      y: position.y,
      width: 300,
      height: 150,
    });
  };

  const addTextWidget = () => {
    const position = calculateCenterPosition(300, 100);
    return textWidgetStore.addTextWidget({
      x: position.x,
      y: position.y,
      width: 300,
      height: 100,
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
    itemStore.updateItem(itemId, updates);
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
    updateItemPosition
  };
}