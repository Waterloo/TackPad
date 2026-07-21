import { useBoardStore } from '~/stores/board'
import type { BoardItem } from '~/shared/types/board'

const MIN_WIDTH = 160
const MIN_HEIGHT = 120

/**
 * SE-corner resize for a board widget.
 * Delta divided by boardStore.scale so resize matches pointer at any zoom level.
 */
export function useWidgetResize(item: Readonly<Ref<BoardItem>>) {
  const boardStore = useBoardStore()
  const isResizing = ref(false)

  function startResize(e: PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()

    const startWidth = item.value.width
    const startHeight = item.value.height
    const startPointerX = e.clientX
    const startPointerY = e.clientY

    isResizing.value = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    function onMove(e: PointerEvent) {
      const dw = (e.clientX - startPointerX) / boardStore.scale
      const dh = (e.clientY - startPointerY) / boardStore.scale
      boardStore.updateItem(item.value.id, {
        width: Math.max(MIN_WIDTH, startWidth + dw),
        height: Math.max(MIN_HEIGHT, startHeight + dh),
      })
    }

    function onUp(e: PointerEvent) {
      isResizing.value = false
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return { isResizing, startResize }
}
