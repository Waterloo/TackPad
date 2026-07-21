/**
 * Touch gesture abstraction.
 * Detects single-finger pan and two-finger pinch from TouchEvents.
 * Returns event handlers to attach to the canvas viewport element.
 */

interface GestureCallbacks {
  onPan: (dx: number, dy: number) => void
  onPinch: (scaleDelta: number, centerX: number, centerY: number) => void
}

export function useGesture(callbacks: GestureCallbacks) {
  let activeTouches: Touch[] = []
  let lastPinchDist = 0

  function getTouchDist(a: Touch, b: Touch): number {
    return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
  }

  function getTouchCenter(a: Touch, b: Touch) {
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    }
  }

  function onTouchStart(e: TouchEvent) {
    activeTouches = Array.from(e.touches)
    if (activeTouches.length === 2) {
      lastPinchDist = getTouchDist(activeTouches[0], activeTouches[1])
    }
  }

  function onTouchMove(e: TouchEvent) {
    const current = Array.from(e.touches)

    if (current.length === 1 && activeTouches.length === 1) {
      // Single-finger pan
      const dx = current[0].clientX - activeTouches[0].clientX
      const dy = current[0].clientY - activeTouches[0].clientY
      callbacks.onPan(dx, dy)
    }
    else if (current.length === 2 && activeTouches.length === 2) {
      // Two-finger pinch zoom
      const dist = getTouchDist(current[0], current[1])
      const center = getTouchCenter(current[0], current[1])
      if (lastPinchDist > 0) {
        callbacks.onPinch(dist / lastPinchDist, center.x, center.y)
      }
      lastPinchDist = dist
    }

    activeTouches = current
  }

  function onTouchEnd(e: TouchEvent) {
    activeTouches = Array.from(e.touches)
    if (activeTouches.length === 2) {
      lastPinchDist = getTouchDist(activeTouches[0], activeTouches[1])
    }
    else {
      lastPinchDist = 0
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
