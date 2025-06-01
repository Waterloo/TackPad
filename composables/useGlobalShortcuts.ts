
import { onMounted, onUnmounted } from 'vue';
import { useBoardStore } from '~/stores/board';
import { useItemStore } from '~/stores/itemStore';
export function useGlobalShortcuts(handlers: {
  handleDelete?: (e: KeyboardEvent) => void;
  handlePaste?: (e: ClipboardEvent) => void;
}) {
  const boardStore = useBoardStore();
  const itemStore = useItemStore()
  // Handler for delete key
  const onKeyDown = (e: KeyboardEvent) => {
    // Skip if user is typing in an input field
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (e.key === 'Delete' && handlers.handleDelete) {
      // handlers.handleDelete(e);
      itemStore.deleteItemConfirm = true
    }
  };

  // Handler for paste
  const onPaste = (e: ClipboardEvent) => {
    // Skip if user is typing in an input field
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (handlers.handlePaste) {
      handlers.handlePaste(e);
    }
  };

  // Setup and cleanup
  onMounted(() => {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPaste);
  });

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('paste', onPaste);
  });
}
