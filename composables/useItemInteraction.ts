import { ref, computed, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useBoardStore } from '~/stores/board'

interface Position {
  x: number
  y: number
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

export function useItemInteraction(
  position: ComputedRef<Position>,
  onUpdate: (updates: Partial<Position>) => void,
  options = {
    minWidth: 160,
    minHeight: 120,
    grid: 1
  }
) {
  const boardStore = useBoardStore()
  const isMoving = ref(false)
  const isResizing = ref(false)
  const startPos = ref<Point>({ x: 0, y: 0 })
  const initialPos = ref({ ...position.value })
  const currentPos = ref({ ...position.value })
  const resizeHandle = ref<string | null>(null)
  const elementRef = ref<HTMLElement | null>(null)
  const activePointerId = ref<number | null>(null)
  const didAutoscroll = ref(false)
  // Watch for external position changes
  watch(() => position, (newPos) => {
    if (!isMoving.value && !isResizing.value) {
      currentPos.value = {
        x: newPos.value.x,
        y: newPos.value.y,
        width: newPos.value.width || currentPos.value.width,
        height: newPos.value.height || currentPos.value.height
      }
    }
  }, { deep: true })

  const style = computed(() => ({
    transform: `translate(${currentPos.value.x}px, ${currentPos.value.y}px)`,
    width: `${currentPos.value.width}px`,
    height: `${currentPos.value.height}px`,
    touchAction: 'none' // Prevent browser handling of all panning and zooming gestures
  }))

  function getEventCoordinates(e: PointerEvent): Point {
    return {
      x: e.clientX,
      y: e.clientY
    }
  }

  function startMove(e: PointerEvent) {
    // Only handle left mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return

    e.preventDefault()
    isMoving.value = true
    didAutoscroll.value = false
    initialPos.value = { ...currentPos.value }
    startPos.value = getEventCoordinates(e)
    activePointerId.value = e.pointerId

    // Set pointer capture for better tracking
    if (elementRef.value) {
      elementRef.value.setPointerCapture(e.pointerId)
    }
  }

  function startResize(handle: string, e: PointerEvent) {
    // Only handle left mouse button or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return

    e.preventDefault()
    isResizing.value = true
    resizeHandle.value = handle
    initialPos.value = { ...currentPos.value }
    startPos.value = getEventCoordinates(e)
    activePointerId.value = e.pointerId

    // Set pointer capture for better tracking
    if (elementRef.value) {
      elementRef.value.setPointerCapture(e.pointerId)
    }
  }

  function move(e: PointerEvent) {
    if ((!isMoving.value && !isResizing.value) ||
        (activePointerId.value !== null && e.pointerId !== activePointerId.value)) return

    const coords = getEventCoordinates(e)
    const scale = boardStore.scale

    if (isMoving.value) {
      const leftThreshold = currentPos.value.width / 2
      const rightThreshold = currentPos.value.width / 2
      const topThreshold = currentPos.value.height * 0.1
      const bottomThreshold = currentPos.value.height

      const scrollSpeed = 10 // Pixels to scroll per frame

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Check if pointer is near edges and scroll accordingly, accounting for item size
         if (coords.x < leftThreshold) {
           // Near left edge - scroll left
           boardStore.setTranslateX(boardStore.translateX + scrollSpeed)
           didAutoscroll.value = true
         } else if (coords.x > viewportWidth - rightThreshold) {
           // Near right edge - scroll right
           boardStore.setTranslateX(boardStore.translateX - scrollSpeed)
           didAutoscroll.value = true
         }

         if (coords.y < topThreshold) {
           // Near top edge - scroll up
           boardStore.setTranslateY(boardStore.translateY + scrollSpeed)
           didAutoscroll.value = true
         } else if (coords.y > viewportHeight - bottomThreshold) {
           // Near bottom edge - scroll down
           boardStore.setTranslateY(boardStore.translateY - scrollSpeed)
           didAutoscroll.value = true
         }

      const dx = (coords.x - startPos.value.x)
      const dy = (coords.y - startPos.value.y)

      const newX = Math.round((initialPos.value.x + dx / scale) / options.grid) * options.grid
      const newY = Math.round((initialPos.value.y + dy / scale) / options.grid) * options.grid

      currentPos.value = {
        ...currentPos.value,
        x: newX,
        y: newY
      }

      onUpdate({ x: newX, y: newY })
    }

    if (isResizing.value && resizeHandle.value) {
      const dx = (coords.x - startPos.value.x)
      const dy = (coords.y - startPos.value.y)
      const newPos = { ...initialPos.value }
      const handle = resizeHandle.value

      // Handle width changes
      if (handle.includes('e')) {
        newPos.width = Math.max(options.minWidth, initialPos.value.width + dx / scale)
      } else if (handle.includes('w')) {
        const newWidth = Math.max(options.minWidth, initialPos.value.width - dx / scale)
        if (newWidth !== initialPos.value.width) {
          newPos.x = initialPos.value.x + (initialPos.value.width - newWidth)
          newPos.width = newWidth
        }
      }

      // Handle height changes
      if (handle.includes('s')) {
        newPos.height = Math.max(options.minHeight, initialPos.value.height + dy / scale)
      } else if (handle.includes('n')) {
        const newHeight = Math.max(options.minHeight, initialPos.value.height - dy / scale)
        if (newHeight !== initialPos.value.height) {
          newPos.y = initialPos.value.y + (initialPos.value.height - newHeight)
          newPos.height = newHeight
        }
      }

      currentPos.value = newPos
      onUpdate(newPos)
    }
  }

  function stopInteraction(e: PointerEvent) {
    if ((isMoving.value || isResizing.value) &&
        (activePointerId.value === null || e.pointerId === activePointerId.value)) {

      // Only recalculate position if autoscrolling occurred during drag
      if (isMoving.value && didAutoscroll.value) {
        const finalCoords = getEventCoordinates(e)
        const scale = boardStore.scale

        // Convert cursor position to board coordinates
        const boardX = (finalCoords.x - boardStore.translateX) / scale
        const boardY = (finalCoords.y - boardStore.translateY) / scale

        // Position item relative to cursor (cursor at top-left of item)
        const finalX = Math.round(boardX / options.grid) * options.grid
        const finalY = Math.round(boardY / options.grid) * options.grid

        currentPos.value = {
          ...currentPos.value,
          x: finalX,
          y: finalY
        }

        onUpdate({ x: finalX, y: finalY })
      }

      // Release pointer capture
      if (elementRef.value && activePointerId.value !== null) {
        try {
          elementRef.value.releasePointerCapture(activePointerId.value)
        } catch (err) {
          // Ignore errors when pointer is already released
        }
      }

      isMoving.value = false
      isResizing.value = false
      resizeHandle.value = null
      activePointerId.value = null
    }
  }

  return {
    style,
    isMoving,
    isResizing,
    elementRef,
    startMove,
    startResize,
    move,
    stopInteraction
  }
}
