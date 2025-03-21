import { ref, computed } from 'vue';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface Options {
  minWidth?: number;
  minHeight?: number;
  grid?: number;
}

export function useInteractions(
  initialPosition: Position,
  initialSize: Size,
  options: Options = {}
) {
  const {
    minWidth = 160,
    minHeight = 120,
    grid = 1,
  } = options;

  const position = ref(initialPosition);
  const size = ref(initialSize);
  const isMoving = ref(false);
  const isResizing = ref(false);
  const moveStart = ref({ x: 0, y: 0 });
  const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const resizeHandle = ref('');

  const style = computed(() => ({
    transform: `translate(${position.value.x}px, ${position.value.y}px)`,
    width: `${size.value.width}px`,
    height: `${size.value.height}px`,
  }));

  const startMove = (e: MouseEvent) => {
    if (isResizing.value) return;
    isMoving.value = true;
    moveStart.value = {
      x: e.clientX - position.value.x,
      y: e.clientY - position.value.y,
    };
  };

  const move = (e: MouseEvent) => {
    if (!isMoving.value && !isResizing.value) return;

    if (isMoving.value) {
      position.value = {
        x: Math.round((e.clientX - moveStart.value.x) / grid) * grid,
        y: Math.round((e.clientY - moveStart.value.y) / grid) * grid,
      };
    } else if (isResizing.value) {
      resize(e);
    }
  };

  const startResize = (e: MouseEvent, handle: string) => {
    e.stopPropagation();
    isResizing.value = true;
    resizeHandle.value = handle;
    resizeStart.value = {
      x: e.clientX,
      y: e.clientY,
      width: size.value.width,
      height: size.value.height,
      posX: position.value.x,
      posY: position.value.y,
    };
  };

  const resize = (e: MouseEvent) => {
    if (!isResizing.value) return;

    const deltaX = Math.round((e.clientX - resizeStart.value.x) / grid) * grid;
    const deltaY = Math.round((e.clientY - resizeStart.value.y) / grid) * grid;

    const newSize = { ...size.value };
    const newPosition = { ...position.value };

    if (resizeHandle.value.includes('e')) {
      newSize.width = Math.max(minWidth, resizeStart.value.width + deltaX);
    }
    if (resizeHandle.value.includes('w')) {
      const newWidth = Math.max(minWidth, resizeStart.value.width - deltaX);
      if (newWidth !== size.value.width) {
        newSize.width = newWidth;
        newPosition.x = resizeStart.value.posX + deltaX;
      }
    }
    if (resizeHandle.value.includes('s')) {
      newSize.height = Math.max(minHeight, resizeStart.value.height + deltaY);
    }
    if (resizeHandle.value.includes('n')) {
      const newHeight = Math.max(minHeight, resizeStart.value.height - deltaY);
      if (newHeight !== size.value.height) {
        newSize.height = newHeight;
        newPosition.y = resizeStart.value.posY + deltaY;
      }
    }

    size.value = newSize;
    position.value = newPosition;
  };

  const stopInteraction = () => {
    isMoving.value = false;
    isResizing.value = false;
  };

  return {
    position,
    size,
    style,
    isMoving,
    isResizing,
    startMove,
    move,
    startResize,
    stopInteraction,
  };
}