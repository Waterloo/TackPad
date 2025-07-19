
import { onMounted, onUnmounted } from 'vue';
import { useBoardStore } from '~/stores/board';

export function useGlobalShortcuts(handlers: {
  handleDelete?: (e: KeyboardEvent) => void;
  handlePaste?: (e: ClipboardEvent) => void;
}) {
  const boardStore = useBoardStore();
  
  // Handler for delete key
  const onKeyDown = (e: KeyboardEvent) => {
    // Skip if user is typing in an input field, textarea, or contenteditable element
    if (
      document.activeElement instanceof HTMLInputElement || 
      document.activeElement instanceof HTMLTextAreaElement ||
      document.activeElement?.getAttribute('contenteditable') === 'true' ||
      document.activeElement?.closest('[contenteditable="true"]')
    ) {
      return;
    }
    
    // Handle both Delete and Backspace keys for cross-platform compatibility
    // On Mac, the primary delete key is Backspace, on PC it's Delete
    if ((e.key === 'Delete' || e.key === 'Backspace') && handlers.handleDelete) {
      handlers.handleDelete(e);
    }
  };
  
  // Handler for paste
  const onPaste = (e: ClipboardEvent) => {
    // Skip if user is typing in an input field, textarea, or contenteditable element
    if (
      document.activeElement instanceof HTMLInputElement || 
      document.activeElement instanceof HTMLTextAreaElement ||
      document.activeElement?.getAttribute('contenteditable') === 'true' ||
      document.activeElement?.closest('[contenteditable="true"]')
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