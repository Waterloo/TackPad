import { useRefHistory, useDebouncedRefHistory } from '@vueuse/core';
import type { Board } from '~/types/board';

export function useBoardHistory(board: Ref<Board | null>) {
  // Default values when board is null
  const defaultHistory = ref([]);
  const defaultCanUndo = ref(false);
  const defaultCanRedo = ref(false);
  
  // Only track history when board is not null
  const historyTracker = computed(() => {
    if (!board.value) return null;
    
    return useDebouncedRefHistory(toRef(board.value), {
      deep: true,
      capacity: 50,
      debounce: 500,
    });
  });
  
  // Safe functions
  const safeUndo = () => historyTracker.value?.undo();
  const safeRedo = () => historyTracker.value?.redo();
  
  return {
    history: computed(() => historyTracker.value?.history || defaultHistory.value),
    undo: safeUndo,
    redo: safeRedo,
    canUndo: computed(() => historyTracker.value?.canUndo.value || defaultCanUndo.value),
    canRedo: computed(() => historyTracker.value?.canRedo.value || defaultCanRedo.value),
    pause: () => historyTracker.value?.pause(),
    resume: () => historyTracker.value?.resume(),
  };
}