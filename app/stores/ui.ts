import { defineStore } from 'pinia'
import type { DrawingTool } from '~/shared/types/drawing'
import type { BoardItem } from '~/shared/types/board'
import { useDrawingStore } from '~/stores/drawing'

export const useUiStore = defineStore('ui', () => {
  // ── Pending tool placement ───────────────────────────────────────────────
  /** When set, the next canvas click will create a widget of this kind. */
  const pendingTool = ref<BoardItem['kind'] | null>(null)

  function setPendingTool(kind: BoardItem['kind']) {
    pendingTool.value = kind
    boardSelectMode.value = false
    drawingMode.value = false
  }

  function clearPendingTool() {
    pendingTool.value = null
  }
  // ── Widget selection ───────────────────────────────────────────────────────
  const selectedItemIds = ref(new Set<string>())

  /** Backward-compat alias: defined only when exactly one item is selected. */
  const selectedItemId = computed<string | null>(() => {
    if (selectedItemIds.value.size === 1) return [...selectedItemIds.value][0]!
    return null
  })

  /** The last item to be directly clicked — used to anchor the toolbar. */
  const primarySelectedId = ref<string | null>(null)

  // ── Board select mode (rubber-band selection) ──────────────────────────────
  const boardSelectMode = ref(false)

  function enterBoardSelectMode() {
    boardSelectMode.value = true
    boardPanMode.value = false
  }

  function exitBoardSelectMode() {
    boardSelectMode.value = false
  }

  function toggleBoardSelectMode() {
    boardSelectMode.value = !boardSelectMode.value
  }

  // ── Drawing mode ───────────────────────────────────────────────────────────
  const drawingMode = ref(false)
  const activeTool = ref<DrawingTool>('select')

  // ── Pan tool (mobile) ────────────────────────────────────────────────────
  /** Board-mode pan toggle (for mobile, where single-finger pan is off by default). */
  const boardPanMode = ref(false)

  function toggleBoardPanMode() { boardPanMode.value = !boardPanMode.value }

  /** True when single-finger touch pan should be allowed (mobile). */
  const isTouchPanAllowed = computed(() => boardPanMode.value)

  // ── Overlay visibility ─────────────────────────────────────────────────────
  const isCommandPaletteOpen = ref(false)
  const isFilePickerVisible = ref(false)
  const isVoiceRecorderVisible = ref(false)
  const isTackletsDirectoryVisible = ref(false)
  const isBoardShareOpen = ref(false)
  const isProfileOpen = ref(false)

  function openFilePicker() { isFilePickerVisible.value = true }
  function closeFilePicker() { isFilePickerVisible.value = false }
  function openVoiceRecorder() { isVoiceRecorderVisible.value = true }
  function closeVoiceRecorder() { isVoiceRecorderVisible.value = false }
  function openTackletsDirectory() { isTackletsDirectoryVisible.value = true }
  function closeTackletsDirectory() { isTackletsDirectoryVisible.value = false }

  // ── Selection helpers ──────────────────────────────────────────────────────

  /** Select a single item, clearing the rest. */
  function selectItem(id: string) {
    selectedItemIds.value = new Set([id])
    primarySelectedId.value = id
  }

  /** Toggle an item in/out of the selection (shift+click). */
  function toggleSelection(id: string) {
    const next = new Set(selectedItemIds.value)
    if (next.has(id)) {
      next.delete(id)
      if (primarySelectedId.value === id) {
        primarySelectedId.value = next.size > 0 ? [...next][next.size - 1]! : null
      }
    } else {
      next.add(id)
      primarySelectedId.value = id
    }
    selectedItemIds.value = next
  }

  /** Clear all selections. */
  function deselectAll() {
    selectedItemIds.value = new Set()
    primarySelectedId.value = null
  }

  /** Check if an item is selected. */
  function isSelected(id: string): boolean {
    return selectedItemIds.value.has(id)
  }

  function toggleCommandPalette() {
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value
  }

  function enterDrawingMode() {
    drawingMode.value = true
    activeTool.value = 'select'
    boardPanMode.value = false
    deselectAll()
  }

  function exitDrawingMode() {
    drawingMode.value = false
    activeTool.value = 'select'
    boardPanMode.value = false
    // Clear drawing selections when leaving drawing mode
    useDrawingStore().clearSelection()
  }

  function setTool(tool: DrawingTool) {
    activeTool.value = tool
    boardPanMode.value = false
    // Switching to a draw tool deselects current widget
    if (tool !== 'select') deselectAll()
  }

  return {
    pendingTool,
    setPendingTool,
    clearPendingTool,
    selectedItemIds,
    selectedItemId,
    primarySelectedId,
    boardSelectMode,
    enterBoardSelectMode,
    exitBoardSelectMode,
    toggleBoardSelectMode,
    drawingMode,
    activeTool,
    boardPanMode,
    toggleBoardPanMode,
    isTouchPanAllowed,
    isCommandPaletteOpen,
    isFilePickerVisible,
    isVoiceRecorderVisible,
    isTackletsDirectoryVisible,
    isBoardShareOpen,
    isProfileOpen,
    openFilePicker,
    closeFilePicker,
    openVoiceRecorder,
    closeVoiceRecorder,
    openTackletsDirectory,
    closeTackletsDirectory,
    selectItem,
    toggleSelection,
    deselectAll,
    isSelected,
    toggleCommandPalette,
    enterDrawingMode,
    exitDrawingMode,
    setTool,
  }
})
