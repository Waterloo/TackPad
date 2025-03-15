
import { useBoardStore } from '~/stores/board';
import { useItemManagement } from './useItemManagement';
import { useNoteStore } from '~/stores/noteStore';
import { useTextWidgetStore } from '~/stores/textWidgetStore';
import { useLinkStore } from '~/stores/linkStore';

export function useClipboard() {
    const boardStore = useBoardStore();
    const noteStore = useNoteStore();
    const textWidgetStore = useTextWidgetStore();
    const linkStore = useLinkStore();
    const { updateItemPosition } = useItemManagement();

  const handlePaste = async (e: ClipboardEvent) => {
    
    // Ignore if user is typing in an input field
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement ||
      !(document.activeElement?.classList.contains('board'))
    ) {
      return;
    }

    e.preventDefault();
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for text
    const text = clipboardData.getData('text');
    if (text) {
      // Check if it's a URL
      try {
        const url = new URL(text);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          const position = calculateCenterPosition(400, 200);
          await linkStore.addLinkItem(text, {
            x: position.x,
            y: position.y,
            width: 400,
            height: 200,
          });
          return;
        }
      } catch (e) {
        // Not a valid URL, continue to treat as text
      }

      // If it's not a URL, add as a text widget or note
      if (text.length > 100) {
        const position = calculateCenterPosition(300, 200);
        noteStore.addNote(text, {
          x: position.x,
          y: position.y,
          color: 'yellow',
          width: 300,
          height: 200,
        });
      } else {
        const position = calculateCenterPosition(300, 100);
        textWidgetStore.addTextWidget({
          x: position.x,
          y: position.y,
          width: 300,
          height: 100,
        }).then(textWidget => {
          if (textWidget) {
            textWidgetStore.updateTextWidgetContent(textWidget.id, text);
          }
        });
      }
    }

    // Check for images
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          // Handle image paste (this would need to be implemented)
          console.log('Image pasted, handling not implemented yet');
        }
      }
    }
  };

  // Helper function to calculate center position
  const calculateCenterPosition = (width: number, height: number) => {
    return {
      x: -width / 2,
      y: -height / 2,
    };
  };

  return {
    handlePaste
  };
}