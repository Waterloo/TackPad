import { ref, computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useGesture } from './useGesture';

export function usePanZoom() {
  const scale = ref(1);
  const translateX = ref(0);
  const translateY = ref(0);
  const isPanning = ref(false);
  const lastScale = ref(1);
  const initialDistance = ref(0);

  const gesture = useGesture();

  const handleZoom = (e: WheelEvent) => {
    if (!e.ctrlKey && e.deltaY % 1 === 0) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    updateZoom(delta, e.clientX, e.clientY);
  };

  const updateZoom = (delta: number, centerX: number, centerY: number) => {
    const newScale = Math.min(Math.max(0.25, scale.value * delta), 5);
    
    const zoomPoint = {
      x: (centerX - translateX.value) / scale.value,
      y: (centerY - translateY.value) / scale.value
    };

    scale.value = newScale;
    
    translateX.value = centerX - zoomPoint.x * newScale;
    translateY.value = centerY - zoomPoint.y * newScale;
  };

  const startPan = (e: MouseEvent | TouchEvent) => {
    if (e instanceof MouseEvent && e.button !== 0) return;
    if (e.target !== e.currentTarget) return;

    isPanning.value = true;
    if (e instanceof TouchEvent && e.touches.length === 2) {
      initialDistance.value = gesture.scale.value;
    }
    gesture.start(e);
  };

  const pan = (e: MouseEvent | TouchEvent | WheelEvent) => {
    if (!isPanning.value && !(e instanceof WheelEvent)) return;

    if (e instanceof TouchEvent) {
      e.preventDefault();
      gesture.move(e);

      if (e.touches.length === 2) {
        const currentDistance = gesture.scale.value;
        if (initialDistance.value > 0) {
          const delta = currentDistance / initialDistance.value;
          if (Math.abs(delta - lastScale.value) > 0.01) {
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            updateZoom(delta / lastScale.value, centerX, centerY);
            lastScale.value = delta;
          }
        }
      } else if (e.touches.length === 1) {
        translateX.value += gesture.delta.value.x;
        translateY.value += gesture.delta.value.y;
      }
    } else if (e instanceof WheelEvent && !e.ctrlKey) {
      translateX.value = translateX.value - e.deltaX;
      translateY.value = translateY.value - e.deltaY;
    } else if (isPanning.value && e instanceof MouseEvent) {
      gesture.move(e);
      translateX.value += gesture.delta.value.x;
      translateY.value += gesture.delta.value.y;
    }
  };

  const endPan = () => {
    isPanning.value = false;
    lastScale.value = 1;
    initialDistance.value = 0;
    gesture.end();
  };

  // Set up event listeners
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
    startPan,
    pan,
    endPan,
    handleZoom,
  };
}