import { useUiStore } from '~/stores/ui'

/**
 * Click-to-select / click-canvas-to-deselect logic for a single widget.
 * Shift+click toggles the item in/out of the multi-selection.
 * The board viewport listens for clicks on the background to deselect all.
 */
export function useWidgetSelection(itemId: string) {
  const uiStore = useUiStore()

  const isSelected = computed(() => uiStore.selectedItemIds.has(itemId))

  function select(e: MouseEvent | PointerEvent) {
    e.stopPropagation() // prevent the canvas click-to-deselect from firing
    if ((e as PointerEvent).shiftKey) {
      uiStore.toggleSelection(itemId)
    } else {
      uiStore.selectItem(itemId)
    }
  }

  function deselect() {
    if (isSelected.value) uiStore.deselectAll()
  }

  return { isSelected, select, deselect }
}
