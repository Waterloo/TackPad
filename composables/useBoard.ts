import { ref } from 'vue';
import { useBoardStore } from '~/stores/board';
import { useRoute } from 'vue-router';

export function useBoard() {
  const boardStore = useBoardStore();
  const route = useRoute();
  const editTitle = ref(false);
  const isBoardListOpen = ref(false);

  // Board initialization
  const initializeCurrentBoard = async () => {
    const boardId = route.params.id as string;
    await boardStore.initializeBoard(boardId);
  };

  // Title editing
  const startEditingTitle = () => {
    editTitle.value = true;
  };

  const saveTitle = (newTitle: string) => {
    boardStore.setBoardTitle(newTitle);
    editTitle.value = false;
  };

  // Board list toggle
  const toggleBoardList = () => {
    isBoardListOpen.value = !isBoardListOpen.value;
  };

  return {
    boardStore,
    editTitle,
    isBoardListOpen,
    initializeCurrentBoard,
    startEditingTitle,
    saveTitle,
    toggleBoardList
  };
}