import { ref, onMounted, onUnmounted } from 'vue';

export function useResizable(minWidth = 100, minHeight = 100) {
  const width = ref(300);
  const height = ref(300);
  const isResizing = ref(false);
  const resizeDirection = ref('');

  const startResize = (e: MouseEvent, direction: string) => {
    e.stopPropagation();
    isResizing.value = true;
    resizeDirection.value = direction;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width.value;
    const startHeight = height.value;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.value) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (resizeDirection.value.includes('e')) {
        width.value = Math.max(minWidth, startWidth + deltaX);
      }
      if (resizeDirection.value.includes('s')) {
        height.value = Math.max(minHeight, startHeight + deltaY);
      }
    };

    const handleMouseUp = () => {
      isResizing.value = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return {
    width,
    height,
    startResize,
    isResizing
  };
}