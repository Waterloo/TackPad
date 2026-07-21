import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'
import type { BoardItem } from '~/shared/types/board'

/** How close to the viewport edge (px) before scrolling kicks in. */
const EDGE_THRESHOLD = 80
/** Maximum scroll speed in screen pixels per frame. */
const MAX_SCROLL_SPEED = 12

/**
 * Returns a scroll velocity (screen px/frame) for each axis based on how far
 * the pointer has entered the edge zone. Zero outside the zone; ramps linearly
 * up to MAX_SCROLL_SPEED at the very edge.
 */
function edgeScrollVelocity(px: number, py: number): { vx: number; vy: number } {
  const w = window.innerWidth
  const h = window.innerHeight
  let vx = 0
  let vy = 0
  if (px < EDGE_THRESHOLD)
    vx = -((EDGE_THRESHOLD - px) / EDGE_THRESHOLD) * MAX_SCROLL_SPEED
  else if (px > w - EDGE_THRESHOLD)
    vx = ((px - (w - EDGE_THRESHOLD)) / EDGE_THRESHOLD) * MAX_SCROLL_SPEED
  if (py < EDGE_THRESHOLD)
    vy = -((EDGE_THRESHOLD - py) / EDGE_THRESHOLD) * MAX_SCROLL_SPEED
  else if (py > h - EDGE_THRESHOLD)
    vy = ((py - (h - EDGE_THRESHOLD)) / EDGE_THRESHOLD) * MAX_SCROLL_SPEED
  return { vx, vy }
}

/**
 * Pointer-Events drag for a board widget.
 * Uses setPointerCapture so the drag continues even if the pointer leaves the element.
 * Delta is divided by boardStore.scale so movement matches cursor at any zoom level.
 *
 * Multi-select: if the dragged item is part of a multi-selection, ALL selected
 * items move together. If it's not in the selection, only the dragged item moves.
 *
 * Edge scrolling: when the pointer approaches a viewport edge, the canvas pans
 * automatically. The logical drag origin is adjusted each frame so widgets stay
 * pinned under the cursor even as the canvas moves.
 */
export function useWidgetDrag(item: Readonly<Ref<BoardItem>>) {
  const boardStore = useBoardStore()
  const uiStore = useUiStore()
  const isDragging = ref(false)

  function startDrag(e: PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()

    // Mutable start point — adjusted each frame to absorb canvas pan.
    let startPointerX = e.clientX
    let startPointerY = e.clientY

    // Live pointer position, updated on every pointermove.
    let currentPointerX = e.clientX
    let currentPointerY = e.clientY

    // Decide whether this is a multi-item drag
    const isMulti = uiStore.selectedItemIds.size > 1 && uiStore.selectedItemIds.has(item.value.id)

    // Capture start positions of all items that will move
    const origins = new Map<string, { x: number; y: number }>()
    if (isMulti) {
      for (const id of uiStore.selectedItemIds) {
        const it = boardStore.items.get(id)
        if (it) origins.set(id, { x: it.x_position, y: it.y_position })
      }
    } else {
      origins.set(item.value.id, { x: item.value.x_position, y: item.value.y_position })
    }

    isDragging.value = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    function applyPositions() {
      const dx = (currentPointerX - startPointerX) / boardStore.scale
      const dy = (currentPointerY - startPointerY) / boardStore.scale
      for (const [id, orig] of origins) {
        boardStore.updateItem(id, {
          x_position: orig.x + dx,
          y_position: orig.y + dy,
        })
      }
    }

    // rAF loop: pans the canvas when near an edge and keeps widgets under cursor.
    let rafId: number | null = null
    function scrollLoop() {
      const { vx, vy } = edgeScrollVelocity(currentPointerX, currentPointerY)
      if (vx !== 0 || vy !== 0) {
        boardStore.translateX -= vx
        boardStore.translateY -= vy
        // Pull the logical start point in the same direction as the canvas pan
        // so the board-space delta (currentPointer - startPointer) / scale
        // stays consistent with where the widgets should be.
        startPointerX -= vx
        startPointerY -= vy
        applyPositions()
      }
      rafId = requestAnimationFrame(scrollLoop)
    }
    rafId = requestAnimationFrame(scrollLoop)

    function onMove(e: PointerEvent) {
      currentPointerX = e.clientX
      currentPointerY = e.clientY
      applyPositions()
    }

    function onUp(e: PointerEvent) {
      isDragging.value = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return { isDragging, startDrag }
}
