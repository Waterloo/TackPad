import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1;

export function usePanZoom() {
  const scale = ref(1);
  const translateX = ref(0);
  const translateY = ref(0);
  const isPanning = ref(false);
  const lastScale = ref(1);
  const initialDistance = ref(0);
  const spacePressed = ref(false);
  const lastX = ref(0);
  const lastY = ref(0);
  const isTouchDevice = ref(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !spacePressed.value && !e.repeat && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
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
      }
      return;
    }

    // Mouse interaction
    if (e.button !== 0 || !spacePressed.value) return;
    isPanning.value = true;
    lastX.value = e.clientX;
    lastY.value = e.clientY;
  };

  const pan = (e: MouseEvent | TouchEvent) => {
    if (!isPanning.value && e instanceof MouseEvent) return;

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
      }
      return;
    }

    // Mouse interaction
    if (!spacePressed.value) {
      isPanning.value = false;
      return;
    }

    const deltaX = e.clientX - lastX.value;
    const deltaY = e.clientY - lastY.value;
    translateX.value += deltaX;
    translateY.value += deltaY;
    lastX.value = e.clientX;
    lastY.value = e.clientY;
  };

  const endPan = () => {
    isPanning.value = false;
    lastScale.value = 1;
    initialDistance.value = 0;
  };

  // Set up event listeners
  useEventListener(window, 'keydown', handleKeyDown);
  useEventListener(window, 'keyup', handleKeyUp);
  useEventListener(window, 'wheel', handleZoom, { passive: false });

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