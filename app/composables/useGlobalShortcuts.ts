import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'
import { useWidgetFactory } from '~/composables/widgets/useWidgetFactory'
import { useUpload } from '~/composables/useUpload'

type DeleteItemWithUpload = (itemId: string) => Promise<boolean>

export async function deleteSelectedBoardItems(deleteItemWithUpload?: DeleteItemWithUpload) {
  const uiStore = useUiStore()
  const boardStore = useBoardStore()
  if (uiStore.selectedItemIds.size > 0) {
    for (const id of [...uiStore.selectedItemIds]) {
      if (deleteItemWithUpload) {
        await deleteItemWithUpload(id)
      }
      else {
        boardStore.removeItem(id)
      }
    }
    uiStore.deselectAll()
  }
}

/**
 * Registers all board-level keyboard shortcuts.
 * Call once from the board page's setup(); cleans up on unmount.
 *
 * @param openCommandPalette - callback to open the command palette
 */
export function useGlobalShortcuts(openCommandPalette: () => void) {
  const boardStore = useBoardStore()
  const uiStore    = useUiStore()
  const factory    = useWidgetFactory()
  const { deleteItemWithUpload } = useUpload()

  function isTyping(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable
  }

  function onKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey

    // ── Command palette ─────────────────────────────────────────────────────
    if (ctrl && e.key === 'k') {
      e.preventDefault()
      openCommandPalette()
      return
    }

    // ── Undo / redo ─────────────────────────────────────────────────────────
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      boardStore.undo()
      return
    }
    if (ctrl && (e.key === 'Z' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault()
      boardStore.redo()
      return
    }

    // ── Zoom shortcuts ───────────────────────────────────────────────────────
    if (!isTyping(e)) {
      if ((ctrl && (e.key === '=' || e.key === '+')) || e.key === '+') {
        e.preventDefault(); boardStore.zoomBy(1.15); return
      }
      if ((ctrl && e.key === '-') || e.key === '-') {
        e.preventDefault(); boardStore.zoomBy(1 / 1.15); return
      }
      if (ctrl && e.key === '0') {
        e.preventDefault(); boardStore.zoomReset(); return
      }
      if (ctrl && e.key === 'Shift' && e.shiftKey && e.code === 'Digit1') {
        e.preventDefault(); boardStore.zoomFit(); return
      }
    }

    // Skip creation / delete shortcuts if typing
    if (isTyping(e)) return

    // ── Delete selected ──────────────────────────────────────────────────────
    if (e.key === 'Delete' || e.key === 'Backspace') {
      void deleteSelectedBoardItems(deleteItemWithUpload)
      return
    }

    // ── Widget creation (Alt + key) ──────────────────────────────────────────
    if (e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'n': e.preventDefault(); factory.createNote();  return
        case 't': e.preventDefault(); factory.createTodo();  return
        case 'l': e.preventDefault(); factory.createLink();  return
        case 'p': e.preventDefault(); factory.createTimer(); return
        case 'x': e.preventDefault(); factory.createText();  return
        case 'u': e.preventDefault(); uiStore.openFilePicker(); return
        case 'r': e.preventDefault(); uiStore.openVoiceRecorder(); return
      }
    }

    // ── Select mode toggle (V) ───────────────────────────────────────────────
    if (e.key === 'v' || e.key === 'V') {
      uiStore.toggleBoardSelectMode()
      return
    }

    // ── Escape: cancel pending tool, exit select mode, or deselect ──────────
    if (e.key === 'Escape') {
      if (uiStore.pendingTool) uiStore.clearPendingTool()
      else if (uiStore.boardSelectMode) uiStore.exitBoardSelectMode()
      else uiStore.deselectAll()
    }
  }

  onMounted(()  => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
