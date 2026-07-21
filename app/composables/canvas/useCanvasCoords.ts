import type { Ref } from 'vue'

/**
 * Coordinate math between screen space and board space.
 *
 * Board (0, 0) = center of the board-viewport element at translateX=0, translateY=0, scale=1.
 *
 * Screen ↔ Board:
 *   screenX = boardX * scale + viewportCenterX + translateX
 *   screenY = boardY * scale + viewportCenterY + translateY
 *   boardX  = (screenX - viewportCenterX - translateX) / scale
 *   boardY  = (screenY - viewportCenterY - translateY) / scale
 */
export function useCanvasCoords(
  translateX: Ref<number>,
  translateY: Ref<number>,
  scale: Ref<number>,
  viewportEl?: Ref<HTMLElement | null>,
) {
  function getViewportRect() {
    return viewportEl?.value?.getBoundingClientRect() ?? null
  }

  function getViewportCenter() {
    const rect = getViewportRect()
    if (!rect) {
      return { cx: window.innerWidth / 2, cy: window.innerHeight / 2 }
    }
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    }
  }

  function screenToBoard(screenX: number, screenY: number) {
    const { cx, cy } = getViewportCenter()
    return {
      x: (screenX - cx - translateX.value) / scale.value,
      y: (screenY - cy - translateY.value) / scale.value,
    }
  }

  function boardToScreen(boardX: number, boardY: number) {
    const { cx, cy } = getViewportCenter()
    return {
      x: boardX * scale.value + cx + translateX.value,
      y: boardY * scale.value + cy + translateY.value,
    }
  }

  /** Board coords of the current viewport center. Used for "place widget at center". */
  function getViewportCenterBoard() {
    const { cx, cy } = getViewportCenter()
    return screenToBoard(cx, cy)
  }

  /** Board coords of the current visible viewport rectangle. Used by the minimap. */
  function getViewportBounds() {
    const rect = getViewportRect()
    const left = rect?.left ?? 0
    const top = rect?.top ?? 0
    const right = rect?.right ?? window.innerWidth
    const bottom = rect?.bottom ?? window.innerHeight
    const topLeft = screenToBoard(left, top)
    const bottomRight = screenToBoard(right, bottom)
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    }
  }

  return { screenToBoard, boardToScreen, getViewportCenter: getViewportCenterBoard, getViewportBounds }
}
