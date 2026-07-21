import { nanoid } from 'nanoid'
import { useWidgetFactory } from '~/composables/widgets/useWidgetFactory'
import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'
import { useDrawingStore } from '~/stores/drawing'
import type { BoardItem } from '~/shared/types/board'
import type { DrawingItem, FreehandItem, ShapeItem } from '~/shared/types/drawing'

const MIME_ITEMS    = 'application/x-tackpad-items'
const MIME_DRAWINGS = 'application/x-tackpad-drawings'

function isValidUrl(s: string): boolean {
  try { return ['http:', 'https:'].includes(new URL(s).protocol) }
  catch { return false }
}

/**
 * If every non-empty line in the text starts with a bullet/numbered-list marker,
 * returns the stripped item strings (≥2 lines required).
 * Handles: `- `, `* `, `+ `, `• `, `1. `, `1) `, `[ ] `, `[x] `
 */
function parseAsList(text: string): string[] | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const markerRe = /^(?:[-*+•]|\d+[.)]) +|\[[ xX]\] /
  if (!lines.every(l => markerRe.test(l))) return null
  return lines.map(l => l.replace(markerRe, '').trim())
}

function isTypingInInput(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable
}

/**
 * Listens for global copy and paste events.
 *
 * Copy/Cut — writes selected widgets and drawings to the system clipboard
 * using custom MIME types, with a plain-text fallback.
 * Skipped when the user is focused inside an editor (isTypingInInput).
 *
 * Paste — priority order:
 *   1. application/x-tackpad-items   → pasteItems() (viewport-centered, ID-remapped)
 *   2. application/x-tackpad-drawings → pasteDrawings()
 *   3. URL text                       → factory.createLink(url)
 *   4. Short text (<150 chars)        → factory.createText(text)
 *   5. Long text (≥150 chars)         → factory.createNote(text)
 *   6. Image file                     → factory.createImage(dataUrl)
 */
export function useClipboard() {
  const factory      = useWidgetFactory()
  const boardStore   = useBoardStore()
  const uiStore      = useUiStore()
  const drawingStore = useDrawingStore()

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  // Last known mouse position in screen space (null until first mousemove)
  let lastMouseScreen: { x: number; y: number } | null = null

  function getViewportTop(): number {
    return (document.querySelector('.board-viewport') as HTMLElement | null)
      ?.getBoundingClientRect().top ?? 48
  }

  function screenToBoard(screenX: number, screenY: number) {
    const top = getViewportTop()
    return {
      x: (screenX - window.innerWidth  / 2 - boardStore.translateX) / boardStore.scale,
      y: (screenY - (window.innerHeight / 2 + top) - boardStore.translateY) / boardStore.scale,
    }
  }

  /** Board-space target for pasted content: mouse position, or viewport center as fallback. */
  function getPasteCenter() {
    if (lastMouseScreen) return screenToBoard(lastMouseScreen.x, lastMouseScreen.y)
    const top = getViewportTop()
    return screenToBoard(window.innerWidth / 2, (window.innerHeight + top) / 2)
  }

  function onMouseMove(e: MouseEvent) {
    lastMouseScreen = { x: e.clientX, y: e.clientY }
  }

  // ── Copy ───────────────────────────────────────────────────────────────────

  function onCopy(e: ClipboardEvent) {
    if (isTypingInInput()) return
    if (!e.clipboardData) return

    const selectedItems = [...uiStore.selectedItemIds]
      .map(id => boardStore.items.get(id))
      .filter((item): item is BoardItem => item !== undefined)

    const selectedDrawings = [...drawingStore.selectedDrawingIds]
      .map(id => drawingStore.drawings.get(id))
      .filter((d): d is DrawingItem => d !== undefined)

    if (selectedItems.length === 0 && selectedDrawings.length === 0) return

    if (selectedItems.length > 0) {
      e.clipboardData.setData(MIME_ITEMS, JSON.stringify({ version: 1, items: selectedItems }))
    }
    if (selectedDrawings.length > 0) {
      e.clipboardData.setData(MIME_DRAWINGS, JSON.stringify({ version: 1, drawings: selectedDrawings }))
    }

    // Safari-compatible fallback: embed data in text/html attributes (Safari drops custom MIME types)
    const attrs: string[] = []
    if (selectedItems.length > 0)
      attrs.push(`data-tackpad-items="${btoa(JSON.stringify({ version: 1, items: selectedItems }))}"`)
    if (selectedDrawings.length > 0)
      attrs.push(`data-tackpad-drawings="${btoa(JSON.stringify({ version: 1, drawings: selectedDrawings }))}"`)
    if (attrs.length)
      e.clipboardData.setData('text/html', `<span ${attrs.join(' ')}></span>`)

    // Plain-text fallback
    if (selectedItems.length === 1 && selectedDrawings.length === 0) {
      const item = selectedItems[0]!
      let fallback = item.displayName
      const c = (item as any).content
      if (c && typeof c.text === 'string') {
        fallback = c.text.replace(/<[^>]*>/g, '').slice(0, 80)
      } else if (c && typeof c.url === 'string') {
        fallback = c.url
      }
      e.clipboardData.setData('text/plain', fallback)
    } else {
      const total = selectedItems.length + selectedDrawings.length
      e.clipboardData.setData('text/plain', `${total} items copied`)
    }

    e.preventDefault()
  }

  // ── Paste helpers ──────────────────────────────────────────────────────────

  function pasteItems(payload: { version: number; items: BoardItem[] }) {
    const { items } = payload
    if (items.length === 0) return

    // 1. Bounding box center of all copied items
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const item of items) {
      minX = Math.min(minX, item.x_position)
      minY = Math.min(minY, item.y_position)
      maxX = Math.max(maxX, item.x_position + item.width)
      maxY = Math.max(maxY, item.y_position + item.height)
    }
    const bboxCx = (minX + maxX) / 2
    const bboxCy = (minY + maxY) / 2

    // 2. Paste target: mouse position, falling back to viewport center
    const { x: vpCx, y: vpCy } = getPasteCenter()

    // 3. Offset: move bbox center to paste target
    const dx = vpCx - bboxCx
    const dy = vpCy - bboxCy

    // 4. Build old→new ID map
    const idMap = new Map<string, string>()
    for (const item of items) {
      idMap.set(item.id, `${item.kind.toUpperCase()}-${nanoid(10)}`)
    }

    // 5. Clone each item with new ID, translated position, remapped group refs
    const now = new Date().toISOString()
    for (const item of items) {
      const newItem = {
        ...item,
        id: idMap.get(item.id)!,
        x_position: item.x_position + dx,
        y_position: item.y_position + dy,
        lastUpdatedAt: now,
      } as any

      // Remap parentGroupId — cleared if the parent group wasn't in the selection
      if (newItem.parentGroupId) {
        newItem.parentGroupId = idMap.get(newItem.parentGroupId) ?? undefined
      }

      // Remap childIds for group items
      if (newItem.kind === 'group' && Array.isArray(newItem.childIds)) {
        newItem.childIds = newItem.childIds.map((cid: string) => idMap.get(cid) ?? cid)
      }

      boardStore.addItem(newItem as BoardItem)
    }

    // 6. Select all pasted items
    uiStore.deselectAll()
    const newIds = [...idMap.values()]
    uiStore.selectItem(newIds[0]!)
    for (const id of newIds.slice(1)) uiStore.toggleSelection(id)
  }

  function pasteDrawings(payload: { version: number; drawings: DrawingItem[] }) {
    const { drawings } = payload
    if (drawings.length === 0) return

    // 1. Bounding box center
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const d of drawings) {
      minX = Math.min(minX, d.x)
      minY = Math.min(minY, d.y)
      maxX = Math.max(maxX, d.x + d.width)
      maxY = Math.max(maxY, d.y + d.height)
    }
    const bboxCx = (minX + maxX) / 2
    const bboxCy = (minY + maxY) / 2

    // 2. Paste target: mouse position, falling back to viewport center
    const { x: vpCx, y: vpCy } = getPasteCenter()

    // 3. Offset
    const dx = vpCx - bboxCx
    const dy = vpCy - bboxCy

    // 4. ID map for drawings
    const idMap = new Map<string, string>()
    for (const d of drawings) {
      idMap.set(d.id, nanoid(10))
    }

    // 5. Group ID remap — each unique groupId gets a fresh ID
    const groupIdMap = new Map<string, string>()
    for (const d of drawings) {
      if (d.groupId && !groupIdMap.has(d.groupId)) {
        groupIdMap.set(d.groupId, nanoid(10))
      }
    }

    // 6. Clone + insert
    const now = new Date().toISOString()
    for (const d of drawings) {
      const newDrawing = {
        ...d,
        id: idMap.get(d.id)!,
        x: d.x + dx,
        y: d.y + dy,
        lastUpdatedAt: now,
        groupId: d.groupId ? groupIdMap.get(d.groupId) : undefined,
      } as any

      // Translate recorded freehand points
      if (d.kind === 'freehand') {
        newDrawing.points = (d as FreehandItem).points.map(
          ([px, py, pressure]) => [px + dx, py + dy, pressure],
        )
      }

      // Translate raw line/arrow endpoints
      if (d.kind === 'shape') {
        const s = d as ShapeItem
        if (s.lx1 !== undefined) newDrawing.lx1 = s.lx1 + dx
        if (s.ly1 !== undefined) newDrawing.ly1 = s.ly1 + dy
        if (s.lx2 !== undefined) newDrawing.lx2 = s.lx2 + dx
        if (s.ly2 !== undefined) newDrawing.ly2 = s.ly2 + dy
      }

      drawingStore.addDrawing(newDrawing as DrawingItem)
    }

    // 7. Select pasted drawings
    drawingStore.clearSelection()
    for (const id of idMap.values()) {
      drawingStore.toggleSelection(id)
    }
  }

  // ── Paste ──────────────────────────────────────────────────────────────────

  function onPaste(e: ClipboardEvent) {
    if (isTypingInInput()) return

    // 1. Tackpad board items
    const rawItems = e.clipboardData?.getData(MIME_ITEMS)
    if (rawItems) {
      e.preventDefault()
      try { pasteItems(JSON.parse(rawItems)) } catch { /* ignore malformed */ }
      return
    }

    // 2. Tackpad drawing items
    const rawDrawings = e.clipboardData?.getData(MIME_DRAWINGS)
    if (rawDrawings) {
      e.preventDefault()
      try { pasteDrawings(JSON.parse(rawDrawings)) } catch { /* ignore malformed */ }
      return
    }

    // 2b. Safari fallback: parse text/html data attributes (custom MIME types silently dropped on Safari)
    const rawHtml = e.clipboardData?.getData('text/html') ?? ''
    if (rawHtml) {
      const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
      const el  = doc.querySelector('[data-tackpad-items], [data-tackpad-drawings]')
      if (el) {
        e.preventDefault()
        const itemsAttr    = el.getAttribute('data-tackpad-items')
        const drawingsAttr = el.getAttribute('data-tackpad-drawings')
        if (itemsAttr)    try { pasteItems(JSON.parse(atob(itemsAttr))) }    catch { /* ignore malformed */ }
        if (drawingsAttr) try { pasteDrawings(JSON.parse(atob(drawingsAttr))) } catch { /* ignore malformed */ }
        return
      }
    }

    const text      = e.clipboardData?.getData('text/plain')?.trim() ?? ''
    const clipItems = Array.from(e.clipboardData?.items ?? [])
    const imgItem   = clipItems.find(i => i.type.startsWith('image/'))

    // 3. URL → LinkItem
    if (text && isValidUrl(text)) {
      e.preventDefault()
      factory.createLink(text)
      return
    }

    // 4. List text → TodoList pre-filled
    const listItems = text ? parseAsList(text) : null
    if (listItems) {
      e.preventDefault()
      factory.createTodo(listItems)
      return
    }

    // 5. Short text (<150) → TextWidget pre-filled
    if (text && text.length < 150) {
      e.preventDefault()
      factory.createText(text)
      return
    }

    // 6. Long text (≥150) → StickyNote pre-filled
    if (text) {
      e.preventDefault()
      factory.createNote(text)
      return
    }

    // 7. Image file → ImageWidget
    if (imgItem) {
      e.preventDefault()
      const file = imgItem.getAsFile()
      if (file) {
        const reader = new FileReader()
        reader.onload = () => factory.createImage(reader.result as string)
        reader.readAsDataURL(file)
      }
    }
  }

  // ── Mount / unmount ────────────────────────────────────────────────────────

  onMounted(() => {
    document.addEventListener('copy',      onCopy)
    document.addEventListener('paste',     onPaste)
    document.addEventListener('mousemove', onMouseMove)
  })
  onUnmounted(() => {
    document.removeEventListener('copy',      onCopy)
    document.removeEventListener('paste',     onPaste)
    document.removeEventListener('mousemove', onMouseMove)
  })
}
