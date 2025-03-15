import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useGesture } from './useGesture';
import { useBoardStore } from '~/stores/board';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1;

export function usePanZoom() {
  const boardStore = useBoardStore();
  
  // Use the scale from the board store instead of a local ref
  const scale = computed({
    get: () => boardStore.scale,
    set: (value) => boardStore.setScale(value)
  });
  
  const translateX = ref(0);
  const translateY = ref(0);
  const isPanning = ref(false);
  const lastScale = ref(1);
  const initialDistance = ref(0);
  const spacePressed = ref(false);
  const lastX = ref(0);
  const lastY = ref(0);
  const isTouchDevice = ref(false);
  
  // Use gesture for better touch handling
  const gesture = useGesture();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !spacePressed.value && !e.repeat && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !(e.target?.classList.contains('tiptap'))) {
      spacePressed.value = true;
      e.preventDefault();
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      spacePressed.value = false;
      isPanning.value = false;
    }
  };

  const handleZoom = (e: WheelEvent) => {
    if (!e.ctrlKey && e.deltaY % 1 === 0) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    updateZoom(delta, e.clientX, e.clientY);
  };

  const updateZoom = (delta: number, centerX: number, centerY: number) => {
    const newScale = Math.min(Math.max(MIN_ZOOM, scale.value * delta), MAX_ZOOM);
    if (newScale === scale.value) return;
    
    const zoomPoint = {
      x: (centerX - translateX.value) / scale.value,
      y: (centerY - translateY.value) / scale.value
    };

    scale.value = newScale;
    translateX.value = centerX - zoomPoint.x * newScale;
    translateY.value = centerY - zoomPoint.y * newScale;
  };

  const startPan = (e: MouseEvent | TouchEvent) => {
    if (e instanceof TouchEvent) {
      isTouchDevice.value = true;
      
      if (e.touches.length === 2) {
        initialDistance.value = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        lastScale.value = 1;
        isPanning.value = true;
        const pos = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
        lastX.value = pos.x;
        lastY.value = pos.y;
      } else if (e.touches.length === 1) {
        // Start gesture tracking for single touch
        gesture.start(e);
        isPanning.value = true;
      }
      return;
    }

    // Mouse interaction - require space key
    if (e.button !== 0 || !spacePressed.value) return;
    isPanning.value = true;
    lastX.value = e.clientX;
    lastY.value = e.clientY;
    gesture.start(e);
  };

  const handleWheel = (e: WheelEvent) => {
    // Only handle wheel events for panning (not zooming)
    if (!e.ctrlKey && e.deltaY % 1 === 0) {
      translateX.value = translateX.value - e.deltaX;
      translateY.value = translateY.value - e.deltaY;
    }
  };

  const pan = (e: MouseEvent | TouchEvent) => {
    // Handle touch events
    if (e instanceof TouchEvent) {
      if (e.touches.length === 2) {
        const currentDistance = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        
        if (initialDistance.value > 0) {
          const delta = currentDistance / initialDistance.value;
          if (Math.abs(delta - lastScale.value) > 0.01) {
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            updateZoom(delta / lastScale.value, centerX, centerY);
            lastScale.value = delta;

            // Update pan position
            translateX.value += centerX - lastX.value;
            translateY.value += centerY - lastY.value;
            lastX.value = centerX;
            lastY.value = centerY;
          }
        }
      } else if (e.touches.length === 1 && isPanning.value) {
        // Use gesture for smoother single touch panning
        gesture.move(e);
        translateX.value += gesture.delta.value.x;
        translateY.value += gesture.delta.value.y;
      }
      return;
    }

    // Mouse interaction - require space key
    if (!isPanning.value || !spacePressed.value) return;
    
    gesture.move(e);
    translateX.value += gesture.delta.value.x;
    translateY.value += gesture.delta.value.y;
  };

  const endPan = () => {
    isPanning.value = false;
    lastScale.value = 1;
    initialDistance.value = 0;
    gesture.end();
  };

  // Set up event listeners
  useEventListener(window, 'keydown', handleKeyDown);
  useEventListener(window, 'keyup', handleKeyUp);
  useEventListener(window, 'wheel', handleZoom, { passive: false });
  useEventListener(window, 'wheel', handleWheel, { passive: false });
  useEventListener(window, 'mousemove', pan);
  useEventListener(window, 'touchmove', pan, { passive: false });
  useEventListener(window, 'mouseup', endPan);
  useEventListener(window, 'mouseleave', endPan);
  useEventListener(window, 'touchend', endPan);
  useEventListener(window, 'touchcancel', endPan);

  return {
    scale,
    translateX,
    translateY,
    isPanning,
    spacePressed,
    isTouchDevice,
    startPan,
    pan,
    endPan,
    handleZoom,
    updateZoom,
  };
}