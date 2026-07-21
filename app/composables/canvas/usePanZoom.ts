import type { Ref } from 'vue'
import { useGesture } from './useGesture'

const SCALE_MIN = 0.25
const SCALE_MAX = 1.0

export interface PanZoomState {
  translateX: Ref<number>
  translateY: Ref<number>
  scale: Ref<number>
}

/**
 * Pan and zoom event handling for the board canvas.
 * Accepts external state refs (owned by the board store) so canvas position
 * is globally accessible without prop drilling.
 *
 * Pan inputs:
 *   - Space + pointer drag (desktop)
 *   - Single-finger touch (mobile)
 *   - Scroll wheel without modifier (trackpad two-finger scroll)
 *
 * Zoom inputs:
 *   - Ctrl/Cmd + scroll wheel (anchored to cursor)
 *   - Two-finger pinch (anchored to pinch center)
 */
export interface PanZoomOptions {
  /** When provided, single-finger touch pan is only allowed when this returns true. */
  canTouchPan?: () => boolean
}

export function usePanZoom(viewportEl: Ref<HTMLElement | null>, state: PanZoomState, options: PanZoomOptions = {}) {
  const { translateX, translateY, scale } = state

  const isPanMode = ref(false)
  const isDragging = ref(false)

  let dragLastX = 0
  let dragLastY = 0

  // -------------------------------------------------------------------------
  // Zoom
  // -------------------------------------------------------------------------
  function applyZoom(newScale: number, clientX: number, clientY: number) {
    newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, newScale))
    if (newScale === scale.value) return

    const rect = viewportEl.value?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2

    // Board coords of the point under the cursor — must stay fixed on screen
    const boardX = (clientX - cx - translateX.value) / scale.value
    const boardY = (clientY - cy - translateY.value) / scale.value

    translateX.value = clientX - cx - boardX * newScale
    translateY.value = clientY - cy - boardY * newScale
    scale.value = newScale
  }

  // -------------------------------------------------------------------------
  // Wheel
  // -------------------------------------------------------------------------
  function onWheel(e: WheelEvent) {
    e.preventDefault()

    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      applyZoom(scale.value * factor, e.clientX, e.clientY)
    }
    else {
      translateX.value -= e.deltaX
      translateY.value -= e.deltaY
    }
  }

  // -------------------------------------------------------------------------
  // Space + drag (desktop pan)
  // -------------------------------------------------------------------------
  function onKeyDown(e: KeyboardEvent) {
    if (e.code !== 'Space' || e.repeat) return
    const target = e.target as HTMLElement
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
    e.preventDefault()
    isPanMode.value = true
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code !== 'Space') return
    isPanMode.value = false
    isDragging.value = false
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    if (!isPanMode.value || e.button !== 0) return
    isDragging.value = true
    dragLastX = e.clientX
    dragLastY = e.clientY
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return
    translateX.value += e.clientX - dragLastX
    translateY.value += e.clientY - dragLastY
    dragLastX = e.clientX
    dragLastY = e.clientY
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging.value) return
    isDragging.value = false
    ;(e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId)
  }

  // -------------------------------------------------------------------------
  // Touch gestures (mobile)
  // -------------------------------------------------------------------------
  // Detect touch device at runtime (coarse pointer = mobile/tablet)
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

  const { onTouchStart, onTouchMove, onTouchEnd } = useGesture({
    onPan: (dx, dy) => {
      // On touch devices, single-finger pan requires explicit opt-in via canTouchPan
      if (isTouchDevice && options.canTouchPan && !options.canTouchPan()) return
      translateX.value += dx
      translateY.value += dy
    },
    onPinch: (delta, cx, cy) => {
      applyZoom(scale.value * delta, cx, cy)
    },
  })

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  let attached = false

  function init() {
    if (attached) return // Guard against double-call on component remount
    const el = viewportEl.value
    if (!el) return
    attached = true
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  }

  function destroy() {
    attached = false
    const el = viewportEl.value
    if (!el) return
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerUp)
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchEnd)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  }

  const cursor = computed(() => {
    if (isDragging.value) return 'grabbing'
    if (isPanMode.value) return 'grab'
    // Show grab cursor when canTouchPan is active (mobile pan tool)
    if (isTouchDevice && options.canTouchPan?.()) return 'grab'
    return 'default'
  })

  return { isPanMode, cursor, applyZoom, init, destroy }
}
