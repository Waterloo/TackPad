import { ref, computed, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useGesture } from './useGesture';
import { useBoardStore } from '~/stores/board';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1;

// Predefined zoom level thresholds - with level 1 being the overview zoom
const ZOOM_THRESHOLDS = [
  { level: 0, scale: 0.35 },  // Level 0 (zoomed out)
  { level: 1, scale: 0.6 },   // Level 1 (overview zoom)
  { level: 2, scale: 0.8 },   // Level 2 (medium zoom)
  { level: 3, scale: 1.0 }    // Level 3 (maximum zoom)
];

export function usePanZoom() {
  const boardStore = useBoardStore();
  
  // Use the scale from the board store instead of a local ref
  const scale = computed({
    get: () => boardStore.scale,
    set: (value) => {
      boardStore.setScale(value);
      // Update the zoom level based on the scale value
      updateZoomLevel(value);
    }
  });
  
  // Use translateX and translateY from the board store
  const translateX = computed({
    get: () => boardStore.translateX,
    set: (value) => boardStore.setTranslateX(value)
  });
  
  const translateY = computed({
    get: () => boardStore.translateY,
    set: (value) => boardStore.setTranslateY(value)
  });
  
  const isPanning = ref(false);
  const lastScale = ref(1);
  const initialDistance = ref(0);
  const spacePressed = ref(false);
  const lastX = ref(0);
  const lastY = ref(0);
  const isTouchDevice = ref(false);
  
  // Use gesture for better touch handling
  const gesture = useGesture();

  // Function to update the zoom level based on scale value
  const updateZoomLevel = (scaleValue: number) => {
    // Find the appropriate zoom level based on the scale
    let newZoomLevel = 0;
    
    // Find the highest threshold that's less than or equal to the current scale
    for (let i = ZOOM_THRESHOLDS.length - 1; i >= 0; i--) {
      if (scaleValue >= ZOOM_THRESHOLDS[i].scale) {
        newZoomLevel = ZOOM_THRESHOLDS[i].level;
        break;
      }
    }
    
    // Update the zoom level in the store if it's different
    if (boardStore.ZOOM_LEVEL !== newZoomLevel) {
      boardStore.setZoomLevel(newZoomLevel);
    }
  };

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

  // Set zoom to a specific level
  const setZoomToLevel = (level: number) => {
    // Find the target scale for the requested level
    const targetLevel = ZOOM_THRESHOLDS.find(threshold => threshold.level === level);
    if (!targetLevel) return;
    
    // Calculate the center point of the viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Calculate the zoom delta to reach the target scale
    const delta = targetLevel.scale / scale.value;
    
    // Apply the zoom
    updateZoom(delta, centerX, centerY);
  };

  const startPan = (e: MouseEvent | TouchEvent) => {
    if (e instanceof TouchEvent) {
      e.preventDefault();
      isTouchDevice.value = true;
      
      // Handle two-finger touch (existing pinch-zoom logic)
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
        return;
      }
      
      // Handle single-finger touch
      if (e.touches.length === 1) {
        // Get the element that was touched
        const target = e.target as HTMLElement;
        
        // Check if touch target is the board or container (not a widget)
        const boardElement = document.querySelector('.board');
        const containerElement = document.querySelector('.board-container');
        
        // Only enable panning if touched directly on board or container
        if (target === boardElement || target === containerElement ||
            target.classList.contains('board') || target.classList.contains('board-container')) {
          isPanning.value = true;
          lastX.value = e.touches[0].clientX;
          lastY.value = e.touches[0].clientY;
          e.preventDefault(); // Prevent default behaviors
        }
      }
      return;
    }
  
    // Mouse interaction logic (unchanged)
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
      }
      if (e.touches.length === 1 && isPanning.value) {
        const dx = e.touches[0].clientX - lastX.value;
        const dy = e.touches[0].clientY - lastY.value;
        
        translateX.value += dx;
        translateY.value += dy;
        
        lastX.value = e.touches[0].clientX;
        lastY.value = e.touches[0].clientY;
        
        // Prevent default to avoid scrolling
        e.preventDefault();
        return;
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

  // Initialize zoom level based on current scale
  updateZoomLevel(scale.value);

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
    setZoomToLevel, // Export new function to set zoom to a specific level
  };
}