<script setup lang="ts">
import { getStroke } from 'perfect-freehand'
import { nanoid } from 'nanoid'
import { storeToRefs } from 'pinia'
import { useDrawingStore } from '~/stores/drawing'
import { useUiStore } from '~/stores/ui'
import { useAuthStore } from '~/stores/auth'
import type { DrawingItem, DrawingBase, ShapeItem, FreehandItem } from '~/shared/types/drawing'

// ─── Injected canvas utilities ────────────────────────────────────────────────

type CanvasCoords = {
  screenToBoard: (x: number, y: number) => { x: number; y: number }
}
const coords = inject<CanvasCoords>('canvasCoords')!
const canvasScale = inject<Ref<number>>('canvasScale', ref(1))

// ─── Stores ───────────────────────────────────────────────────────────────────

const drawingStore = useDrawingStore()
const uiStore = useUiStore()
const authStore = useAuthStore()

const { drawingsArray, selectedDrawingIds, selectedDrawingId, selectedItem, activeStyle } = storeToRefs(drawingStore)
const { drawingMode, activeTool } = storeToRefs(uiStore)

// ─── In-progress drawing state ────────────────────────────────────────────────

const inProgressItem = ref<DrawingItem | null>(null)
const dragStart = ref<{ bx: number; by: number } | null>(null)

// Interaction for selected item move/resize
const interaction = ref<{
  type: 'move' | 'resize'
  startBx: number
  startBy: number
  origItems: Map<string, DrawingItem>  // snapshot of ALL selected items' positions
  handleIdx?: number
} | null>(null)

// Rubber-band marquee
const marquee = ref<{ sx: number; sy: number; ex: number; ey: number } | null>(null)

// ─── Rotate mode ──────────────────────────────────────────────────────────────

const isRotateMode = ref(false)

const rotateInteraction = ref<{
  centerX: number
  centerY: number
  startAngleDeg: number
  origRotations: Map<string, number>
} | null>(null)

/** Position of the rotation handle and the rotation center, in board coords. */
const rotateHandleInfo = computed(() => {
  if (!isRotateMode.value || !drawingMode.value || activeTool.value !== 'select') return null
  const selected = drawingsArray.value.filter(item => selectedDrawingIds.value.has(item.id))
  if (selected.length === 0) return null

  const bbox = selected.length === 1
    ? { x: selected[0]!.x, y: selected[0]!.y, width: selected[0]!.width, height: selected[0]!.height }
    : combinedBbox(selected)

  const cx = bbox.x + bbox.width / 2
  const cy = bbox.y + bbox.height / 2
  const handleOffset = 32 / canvasScale.value

  return {
    hx: cx,                       // handle circle center x
    hy: bbox.y - handleOffset,    // handle circle center y (above bbox)
    ly: bbox.y,                   // connector line start y (top of bbox)
    cx,                           // rotation center x
    cy,                           // rotation center y
  }
})

function onRotateHandlePointerDown(e: PointerEvent) {
  e.stopPropagation()
  if (!rotateHandleInfo.value) return
  const { cx, cy } = rotateHandleInfo.value
  const { x: bx, y: by } = evToBoard(e)
  const startAngleDeg = Math.atan2(by - cy, bx - cx) * 180 / Math.PI

  const origRotations = new Map<string, number>()
  for (const id of selectedDrawingIds.value) {
    origRotations.set(id, drawingStore.drawings.get(id)?.rotation ?? 0)
  }
  rotateInteraction.value = { centerX: cx, centerY: cy, startAngleDeg, origRotations }
  ;(e.currentTarget as SVGCircleElement).setPointerCapture(e.pointerId)
}

function onRotateHandlePointerMove(e: PointerEvent) {
  if (!rotateInteraction.value) return
  const { centerX, centerY, startAngleDeg, origRotations } = rotateInteraction.value
  const { x: bx, y: by } = evToBoard(e)
  const currentAngleDeg = Math.atan2(by - centerY, bx - centerX) * 180 / Math.PI
  let delta = currentAngleDeg - startAngleDeg
  // Normalize to [-180, 180] to avoid wrap-around jumps
  while (delta > 180) delta -= 360
  while (delta < -180) delta += 360
  // Snap to 15° increments when Shift held
  if (e.shiftKey) delta = Math.round(delta / 15) * 15

  for (const [id, origRot] of origRotations) {
    drawingStore.updateDrawingGeometry(id, { rotation: origRot + delta } as Partial<DrawingItem>)
  }
}

function onRotateHandlePointerUp(_e: PointerEvent) {
  rotateInteraction.value = null
}

// ─── Group drill-in mode ──────────────────────────────────────────────────────

/**
 * When non-null we are "inside" a drawing group: single-clicking any member
 * navigates within the group rather than selecting the whole group.
 * Reset to null when leaving select mode, deselecting, or pressing Escape.
 */
const activeDrawingGroupId = ref<string | null>(null)

function selectGroup(groupId: string) {
  const members = drawingsArray.value.filter(d => d.groupId === groupId)
  drawingStore.clearSelection()
  for (const m of members) drawingStore.toggleSelection(m.id)
}

// Exit rotate mode / drill-in when selection is cleared or tool changes
watch(selectedDrawingIds, (ids) => {
  if (ids.size === 0) {
    isRotateMode.value = false
    activeDrawingGroupId.value = null
  } else if (activeDrawingGroupId.value) {
    // If nothing in the selection still belongs to the drilled-in group, exit drill-in
    const stillInGroup = [...ids].some(
      id => drawingStore.drawings.get(id)?.groupId === activeDrawingGroupId.value,
    )
    if (!stillInGroup) activeDrawingGroupId.value = null
  }
})
watch(activeTool, (tool) => { if (tool !== 'select') isRotateMode.value = false })

// Label editing
const editingLabelId = ref<string | null>(null)
const editingLabelText = ref('')
const labelInputRef = ref<HTMLInputElement | null>(null)

// ─── Computed ─────────────────────────────────────────────────────────────────

// SVG pointer-events on drawing items: only interactive in select mode
const itemPointerEvents = computed(() =>
  drawingMode.value && activeTool.value === 'select' ? 'all' : 'none',
)

// Handle size stays ~6px on screen regardless of zoom
const handleSize = computed(() => 6 / canvasScale.value)

// Groups: map from groupId → DrawingItem[]
const groupMap = computed(() => {
  const m = new Map<string, DrawingItem[]>()
  for (const item of drawingsArray.value) {
    if (item.groupId) {
      const arr = m.get(item.groupId) ?? []
      arr.push(item)
      m.set(item.groupId, arr)
    }
  }
  return m
})

// Groups whose members are currently selected (any member selected)
const selectedGroupIds = computed(() => {
  const ids = new Set<string>()
  for (const item of drawingsArray.value) {
    if (item.groupId && selectedDrawingIds.value.has(item.id)) {
      ids.add(item.groupId)
    }
  }
  return ids
})

// Marquee rect in board space (normalized, min-size 1)
const marqueeRect = computed(() => {
  if (!marquee.value) return null
  const { sx, sy, ex, ey } = marquee.value
  return {
    x: Math.min(sx, ex),
    y: Math.min(sy, ey),
    width: Math.max(1, Math.abs(ex - sx)),
    height: Math.max(1, Math.abs(ey - sy)),
  }
})

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function evToBoard(e: PointerEvent): { x: number; y: number } {
  return coords.screenToBoard(e.clientX, e.clientY)
}

// ─── Item creation helpers ────────────────────────────────────────────────────

function makeBase(): DrawingBase {
  const profileId = authStore.profile?.id ?? 'anonymous'
  const now = new Date().toISOString()
  return {
    id: `DRAW-${nanoid(10)}`,
    kind: 'freehand', // placeholder — overridden by spread caller
    x: 0, y: 0, width: 0, height: 0,
    lock: false,
    createdAt: now, createdBy: profileId,
    lastUpdatedAt: now, lastUpdatedBy: profileId,
  }
}

// ─── Freehand rendering ───────────────────────────────────────────────────────

function getSvgPath(stroke: number[][]): string {
  if (!stroke.length) return ''
  const d: (string | number)[] = ['M', stroke[0][0], stroke[0][1]]
  for (let i = 1; i < stroke.length; i++) {
    const [x0, y0] = stroke[i - 1]
    const [x1, y1] = stroke[i]
    d.push('Q', x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  }
  d.push('Z')
  return d.join(' ')
}

function freehandToPath(item: FreehandItem): string {
  const stroke = getStroke(item.points, {
    size: item.style.strokeWidth * 3,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
  })
  return getSvgPath(stroke)
}

// ─── Shape geometry helpers ───────────────────────────────────────────────────

function diamondPoints(item: ShapeItem): string {
  const { x, y, width: w, height: h } = item
  return `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`
}

function trianglePoints(item: ShapeItem): string {
  const { x, y, width: w, height: h } = item
  return `${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`
}

function arrowPath(item: ShapeItem): string {
  const x1 = item.lx1 ?? item.x
  const y1 = item.ly1 ?? item.y
  const x2 = item.lx2 ?? item.x + item.width
  const y2 = item.ly2 ?? item.y + item.height
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 14 / canvasScale.value
  const headAngle = Math.PI / 6
  const ax1 = x2 - headLen * Math.cos(angle - headAngle)
  const ay1 = y2 - headLen * Math.sin(angle - headAngle)
  const ax2 = x2 - headLen * Math.cos(angle + headAngle)
  const ay2 = y2 - headLen * Math.sin(angle + headAngle)
  return `M${x1},${y1} L${x2},${y2} M${ax2},${ay2} L${x2},${y2} L${ax1},${ay1}`
}

// ─── Selection handles ────────────────────────────────────────────────────────

interface Handle { x: number; y: number; idx: number; cursor: string }

const HANDLE_CURSORS = [
  'nw-resize', 'n-resize', 'ne-resize', 'e-resize',
  'se-resize', 's-resize', 'sw-resize', 'w-resize',
]

function getHandles(item: DrawingItem): Handle[] {
  const hs = handleSize.value
  const { x, y, width: w, height: h } = item
  const cx = x + w / 2
  const cy = y + h / 2
  const hw = hs / 2
  return [
    { x: x - hw,     y: y - hw,     idx: 0, cursor: HANDLE_CURSORS[0] },
    { x: cx - hw,    y: y - hw,     idx: 1, cursor: HANDLE_CURSORS[1] },
    { x: x + w - hw, y: y - hw,     idx: 2, cursor: HANDLE_CURSORS[2] },
    { x: x + w - hw, y: cy - hw,    idx: 3, cursor: HANDLE_CURSORS[3] },
    { x: x + w - hw, y: y + h - hw, idx: 4, cursor: HANDLE_CURSORS[4] },
    { x: cx - hw,    y: y + h - hw, idx: 5, cursor: HANDLE_CURSORS[5] },
    { x: x - hw,     y: y + h - hw, idx: 6, cursor: HANDLE_CURSORS[6] },
    { x: x - hw,     y: cy - hw,    idx: 7, cursor: HANDLE_CURSORS[7] },
  ]
}

// ─── Bounding-box helpers ─────────────────────────────────────────────────────

function bboxFromPoints(sx: number, sy: number, ex: number, ey: number) {
  return {
    x: Math.min(sx, ex),
    y: Math.min(sy, ey),
    width: Math.max(1, Math.abs(ex - sx)),
    height: Math.max(1, Math.abs(ey - sy)),
  }
}

/** Combined bounding box for a list of items + padding. */
function combinedBbox(items: DrawingItem[], pad = 0) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const item of items) {
    minX = Math.min(minX, item.x)
    minY = Math.min(minY, item.y)
    maxX = Math.max(maxX, item.x + item.width)
    maxY = Math.max(maxY, item.y + item.height)
  }
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
}

/** Check if item's bbox overlaps with rect. */
function itemOverlapsRect(item: DrawingItem, r: { x: number; y: number; width: number; height: number }) {
  return (
    item.x < r.x + r.width &&
    item.x + item.width > r.x &&
    item.y < r.y + r.height &&
    item.y + item.height > r.y
  )
}

// ─── Pointer handlers — background capture rect ───────────────────────────────

// Whether the bg pointer drag has moved enough to count as a marquee
const _bgDragMovedEnough = ref(false)
const _bgDragStart = ref<{ bx: number; by: number; px: number; py: number } | null>(null)

function onBgPointerDown(e: PointerEvent) {
  if (!drawingMode.value) return
  const { x: bx, y: by } = evToBoard(e)

  if (activeTool.value === 'select') {
    // Start potential marquee (confirmed on first significant move)
    _bgDragStart.value = { bx, by, px: e.clientX, py: e.clientY }
    _bgDragMovedEnough.value = false
    ;(e.currentTarget as SVGRectElement).setPointerCapture(e.pointerId)
    return
  }

  // Text tool: click-to-place with no drag. Handle before the drag setup.
  // Switch back to select immediately so itemPointerEvents becomes 'all' and
  // the placed item can be moved, resized, and double-clicked to re-edit.
  if (activeTool.value === 'text') {
    const base = makeBase()
    const item: ShapeItem = {
      ...base,
      kind: 'shape', shapeType: 'text',
      x: bx - 75, y: by - 20,
      width: 150, height: 40,
      style: { ...activeStyle.value, fill: 'none' },
      label: 'Text',
    }
    drawingStore.addDrawing(item)
    drawingStore.selectDrawing(item.id)
    uiStore.setTool('select')
    startLabelEdit(item.id)
    return
  }

  // Drag-based tools — capture the pointer for the duration of the stroke/shape drag
  dragStart.value = { bx, by }
  ;(e.currentTarget as SVGRectElement).setPointerCapture(e.pointerId)

  if (activeTool.value === 'pen') {
    const base = makeBase()
    const item: FreehandItem = {
      ...base,
      kind: 'freehand',
      x: bx, y: by, width: 0, height: 0,
      style: { ...activeStyle.value },
      points: [[bx, by, e.pressure || 0.5]],
    }
    inProgressItem.value = item
    return
  }

  // Shape tools (rect / ellipse / diamond / triangle / arrow / line)
  const shapeType = activeTool.value as ShapeItem['shapeType']
  const isLinear = shapeType === 'line' || shapeType === 'arrow'
  const base = makeBase()
  const item: ShapeItem = {
    ...base,
    kind: 'shape', shapeType,
    x: bx, y: by, width: 0, height: 0,
    style: { ...activeStyle.value },
    label: '',
    ...(isLinear ? { lx1: bx, ly1: by, lx2: bx, ly2: by } : {}),
  }
  inProgressItem.value = item
}

function onBgPointerMove(e: PointerEvent) {
  // Marquee drag in select mode
  if (activeTool.value === 'select' && _bgDragStart.value) {
    const dx = e.clientX - _bgDragStart.value.px
    const dy = e.clientY - _bgDragStart.value.py
    if (!_bgDragMovedEnough.value && Math.sqrt(dx * dx + dy * dy) > 6) {
      _bgDragMovedEnough.value = true
      marquee.value = { sx: _bgDragStart.value.bx, sy: _bgDragStart.value.by, ex: _bgDragStart.value.bx, ey: _bgDragStart.value.by }
    }
    if (_bgDragMovedEnough.value && marquee.value) {
      const { x: bx, y: by } = evToBoard(e)
      marquee.value = { ...marquee.value, ex: bx, ey: by }
    }
    return
  }

  if (!inProgressItem.value || !dragStart.value) return
  const { x: bx, y: by } = evToBoard(e)
  const { bx: sx, by: sy } = dragStart.value
  const item = inProgressItem.value

  if (item.kind === 'freehand') {
    const pts = [...(item as FreehandItem).points, [bx, by, e.pressure || 0.5] as [number, number, number]]
    const xs = pts.map(p => p[0])
    const ys = pts.map(p => p[1])
    inProgressItem.value = {
      ...item,
      points: pts,
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    } as FreehandItem
    return
  }

  if (item.kind === 'shape') {
    const si = item as ShapeItem
    const bbox = bboxFromPoints(sx, sy, bx, by)
    if (si.shapeType === 'line' || si.shapeType === 'arrow') {
      inProgressItem.value = { ...si, ...bbox, lx1: sx, ly1: sy, lx2: bx, ly2: by }
    } else {
      inProgressItem.value = { ...si, ...bbox }
    }
  }
}

function onBgPointerUp(e: PointerEvent) {
  // Finalize marquee or simple click deselect
  if (activeTool.value === 'select' && _bgDragStart.value) {
    if (_bgDragMovedEnough.value && marqueeRect.value) {
      // Select items that overlap the marquee
      const overlapping = drawingsArray.value.filter(item => itemOverlapsRect(item, marqueeRect.value!))
      if (overlapping.length > 0) {
        // Select all overlapping (clear first, then add one by one via Set)
        drawingStore.clearSelection()
        for (const item of overlapping) {
          drawingStore.toggleSelection(item.id)
        }
      } else {
        drawingStore.clearSelection()
      }
    } else {
      // Simple click on bg: deselect and exit any drill-in
      drawingStore.clearSelection()
      uiStore.deselectAll()
      activeDrawingGroupId.value = null
    }
    marquee.value = null
    _bgDragStart.value = null
    _bgDragMovedEnough.value = false
    return
  }

  const item = inProgressItem.value
  if (item) {
    const minSize = 4
    if (item.kind === 'freehand' && (item as FreehandItem).points.length > 2) {
      drawingStore.addDrawing(item)
      drawingStore.selectDrawing(item.id)
    } else if (item.kind === 'shape') {
      const si = item as ShapeItem
      if (si.width > minSize || si.height > minSize) {
        drawingStore.addDrawing(item)
        drawingStore.selectDrawing(item.id)
      }
    }
  }
  inProgressItem.value = null
  dragStart.value = null
}

// ─── Pointer handlers — drawing items (select tool) ───────────────────────────

function onItemPointerDown(e: PointerEvent, id: string) {
  if (!drawingMode.value || activeTool.value !== 'select') return
  e.stopPropagation()

  const item = drawingStore.drawings.get(id)
  if (!item) return

  if (e.shiftKey) {
    drawingStore.toggleSelection(id)
  } else if (item.groupId) {
    if (activeDrawingGroupId.value === item.groupId) {
      // Already drilled into this group → single-click navigates between members
      drawingStore.selectDrawing(id)
    } else {
      // First click on a group → select all members (group mode), clear any prior drill-in
      activeDrawingGroupId.value = null
      selectGroup(item.groupId)
    }
  } else {
    // Non-grouped item — clear drill-in and select normally
    activeDrawingGroupId.value = null
    drawingStore.selectDrawing(id)
  }

  const currentItem = drawingStore.drawings.get(id)
  if (!currentItem || currentItem.lock) return

  const { x: bx, y: by } = evToBoard(e)

  // Capture start positions of ALL currently selected items
  const origItems = new Map<string, DrawingItem>()
  for (const selId of drawingStore.selectedDrawingIds) {
    const si = drawingStore.drawings.get(selId)
    if (si) origItems.set(selId, { ...si } as DrawingItem)
  }

  interaction.value = {
    type: 'move',
    startBx: bx, startBy: by,
    origItems,
  }
  ;(e.currentTarget as SVGGElement).setPointerCapture(e.pointerId)
}

function onItemPointerMove(e: PointerEvent) {
  if (!interaction.value || interaction.value.type !== 'move') return
  const { x: bx, y: by } = evToBoard(e)
  const dx = bx - interaction.value.startBx
  const dy = by - interaction.value.startBy

  for (const [selId, orig] of interaction.value.origItems) {
    const changes: Partial<DrawingItem> = { x: orig.x + dx, y: orig.y + dy }
    if (orig.kind === 'freehand') {
      // Shift every recorded point so the visual stroke follows the bbox
      ;(changes as Partial<FreehandItem>).points = (orig as FreehandItem).points.map(
        ([px, py, pressure]) => [px + dx, py + dy, pressure],
      )
    } else if ('lx1' in orig && (orig as ShapeItem).lx1 != null) {
      // Shift line / arrow endpoints
      Object.assign(changes, {
        lx1: (orig as ShapeItem).lx1! + dx, ly1: (orig as ShapeItem).ly1! + dy,
        lx2: (orig as ShapeItem).lx2! + dx, ly2: (orig as ShapeItem).ly2! + dy,
      })
    }
    drawingStore.updateDrawingGeometry(selId, changes)
  }
}

function onItemPointerUp(_e: PointerEvent) {
  interaction.value = null
}

// ─── Pointer handlers — resize handles ───────────────────────────────────────

function onHandlePointerDown(e: PointerEvent, handleIdx: number) {
  e.stopPropagation()
  const item = selectedItem.value
  if (!item) return
  const { x: bx, y: by } = evToBoard(e)
  const origItems = new Map([[item.id, { ...item } as DrawingItem]])
  interaction.value = {
    type: 'resize',
    startBx: bx, startBy: by,
    origItems,
    handleIdx,
  }
  ;(e.currentTarget as SVGRectElement).setPointerCapture(e.pointerId)
}

function onHandlePointerMove(e: PointerEvent) {
  if (!interaction.value || interaction.value.type !== 'resize') return
  const { x: bx, y: by } = evToBoard(e)
  const dx = bx - interaction.value.startBx
  const dy = by - interaction.value.startBy
  const orig = [...interaction.value.origItems.values()][0]!
  const idx = interaction.value.handleIdx!

  let { x, y, width: w, height: h } = orig
  // 0=TL, 1=TC, 2=TR, 3=MR, 4=BR, 5=BC, 6=BL, 7=ML
  if (idx === 0) { x += dx; y += dy; w -= dx; h -= dy }
  else if (idx === 1) { y += dy; h -= dy }
  else if (idx === 2) { y += dy; w += dx; h -= dy }
  else if (idx === 3) { w += dx }
  else if (idx === 4) { w += dx; h += dy }
  else if (idx === 5) { h += dy }
  else if (idx === 6) { x += dx; w -= dx; h += dy }
  else if (idx === 7) { x += dx; w -= dx }

  // Enforce minimum size
  const MIN = 4
  if (w < MIN) { if (idx === 0 || idx === 6 || idx === 7) x = orig.x + orig.width - MIN; w = MIN }
  if (h < MIN) { if (idx === 0 || idx === 1 || idx === 2) y = orig.y + orig.height - MIN; h = MIN }

  if (selectedDrawingId.value) {
    const changes: Partial<DrawingItem> = { x, y, width: w, height: h }
    const scaleX = orig.width > 0 ? w / orig.width : 1
    const scaleY = orig.height > 0 ? h / orig.height : 1

    if (orig.kind === 'freehand') {
      // Scale every recorded point proportionally into the new bbox
      ;(changes as Partial<FreehandItem>).points = (orig as FreehandItem).points.map(
        ([px, py, pressure]) => [
          x + (px - orig.x) * scaleX,
          y + (py - orig.y) * scaleY,
          pressure,
        ],
      )
    } else if (orig.kind === 'shape' && 'lx1' in orig && (orig as ShapeItem).lx1 != null) {
      // Scale arrow / line endpoints proportionally into the new bbox
      const sh = orig as ShapeItem
      Object.assign(changes, {
        lx1: x + (sh.lx1! - orig.x) * scaleX,
        ly1: y + (sh.ly1! - orig.y) * scaleY,
        lx2: x + (sh.lx2! - orig.x) * scaleX,
        ly2: y + (sh.ly2! - orig.y) * scaleY,
      })
    }

    drawingStore.updateDrawingGeometry(selectedDrawingId.value, changes)
  }
}

// Unified pointermove handler for the capture rect (used for both bg drawing and item interaction)
function onCapturePtrMove(e: PointerEvent) {
  onBgPointerMove(e)
  if (!interaction.value) return
  if (interaction.value.type === 'move') onItemPointerMove(e)
  if (interaction.value.type === 'resize') onHandlePointerMove(e)
}

function onCapturePtrUp(e: PointerEvent) {
  onBgPointerUp(e)
  interaction.value = null
}

// ─── Label editing ────────────────────────────────────────────────────────────

function startLabelEdit(id: string) {
  const item = drawingStore.drawings.get(id)
  if (!item || item.kind !== 'shape') return
  editingLabelId.value = id
  editingLabelText.value = (item as ShapeItem).label ?? ''
  nextTick(() => labelInputRef.value?.select())
}

function commitLabel() {
  if (!editingLabelId.value) return
  drawingStore.updateDrawing(editingLabelId.value, {
    label: editingLabelText.value,
  } as Partial<ShapeItem>)
  editingLabelId.value = null
}

function cancelLabel() {
  editingLabelId.value = null
}

/**
 * Double-click on a drawing item.
 * - Grouped item, not yet drilled-in → enter drill-in mode for that group.
 * - Otherwise (ungrouped or already drilled-in) → open label editor for shapes.
 */
function onItemDblClick(e: MouseEvent, id: string) {
  const item = drawingStore.drawings.get(id)
  if (!item) return
  if (item.groupId && activeDrawingGroupId.value !== item.groupId) {
    // Enter drill-in mode
    activeDrawingGroupId.value = item.groupId
    drawingStore.selectDrawing(id)
    return
  }
  // Normal double-click: label edit for shapes
  if (item.kind === 'shape') startLabelEdit(id)
}

// The item whose label is being edited (for foreignObject positioning)
const editingItem = computed(() => {
  if (!editingLabelId.value) return null
  return drawingStore.drawings.get(editingLabelId.value) as ShapeItem | null
})

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function onKeydown(e: KeyboardEvent) {
  if (!drawingMode.value) return
  if (editingLabelId.value) return // don't interfere with label input
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const toDelete = [...drawingStore.selectedDrawingIds]
    for (const id of toDelete) drawingStore.removeDrawing(id)
  }
  if (e.key === 'Escape') {
    if (isRotateMode.value) {
      isRotateMode.value = false
    } else if (activeDrawingGroupId.value) {
      // Exit drill-in → restore full group selection
      selectGroup(activeDrawingGroupId.value)
      activeDrawingGroupId.value = null
    } else {
      drawingStore.clearSelection()
    }
  }
  // R — toggle rotate mode (any tool, auto-switches to select if needed)
  if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
    if (selectedDrawingIds.value.size > 0) {
      if (activeTool.value !== 'select') uiStore.setTool('select')
      isRotateMode.value = !isRotateMode.value
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <svg
    class="svg-layer"
    xmlns="http://www.w3.org/2000/svg"
    overflow="visible"
    aria-hidden="true"
  >
    <!-- ── Event capture rect (drawing mode only) ──────────────────────────── -->
    <rect
      v-if="drawingMode"
      x="-10000" y="-10000" width="20000" height="20000"
      fill="transparent"
      style="pointer-events: all"
      :style="{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }"
      @pointerdown="onBgPointerDown"
      @pointermove="onCapturePtrMove"
      @pointerup="onCapturePtrUp"
    />

    <!-- ── Group bounding boxes (rendered before items, behind outlines) ──── -->
    <template v-if="drawingMode && activeTool === 'select'">
      <template v-for="[gid, members] in groupMap" :key="'grp-' + gid">
        <template v-if="selectedGroupIds.has(gid)">
          <rect
            :x="combinedBbox(members, 6).x"
            :y="combinedBbox(members, 6).y"
            :width="combinedBbox(members, 6).width"
            :height="combinedBbox(members, 6).height"
            fill="#EFF6FF"
            fill-opacity="0.5"
            stroke="#93C5FD"
            :stroke-width="1.5 / canvasScale"
            stroke-dasharray="6 4"
            rx="4"
            style="pointer-events: none"
          />
        </template>
      </template>
    </template>

    <!-- ── Committed drawing items ─────────────────────────────────────────── -->
    <g
      v-for="item in drawingsArray"
      :key="item.id"
      :transform="item.rotation ? `rotate(${item.rotation}, ${item.x + item.width / 2}, ${item.y + item.height / 2})` : undefined"
      :style="{ pointerEvents: itemPointerEvents }"
      @pointerdown="onItemPointerDown($event, item.id)"
      @pointermove="onItemPointerMove($event)"
      @pointerup="onItemPointerUp($event)"
      @dblclick.stop="onItemDblClick($event, item.id)"
    >
      <!-- Freehand stroke -->
      <path
        v-if="item.kind === 'freehand'"
        :d="freehandToPath(item as FreehandItem)"
        :fill="item.style.stroke"
        stroke="none"
        :opacity="item.style.opacity"
      />

      <!-- Shape primitives -->
      <template v-else-if="item.kind === 'shape'">
        <rect
          v-if="(item as ShapeItem).shapeType === 'rect'"
          :x="item.x" :y="item.y"
          :width="item.width" :height="item.height"
          :fill="(item as ShapeItem).style.fill"
          :stroke="(item as ShapeItem).style.stroke"
          :stroke-width="(item as ShapeItem).style.strokeWidth"
          :opacity="(item as ShapeItem).style.opacity"
          rx="2"
        />
        <ellipse
          v-else-if="(item as ShapeItem).shapeType === 'ellipse'"
          :cx="item.x + item.width / 2" :cy="item.y + item.height / 2"
          :rx="item.width / 2" :ry="item.height / 2"
          :fill="(item as ShapeItem).style.fill"
          :stroke="(item as ShapeItem).style.stroke"
          :stroke-width="(item as ShapeItem).style.strokeWidth"
          :opacity="(item as ShapeItem).style.opacity"
        />
        <polygon
          v-else-if="(item as ShapeItem).shapeType === 'diamond'"
          :points="diamondPoints(item as ShapeItem)"
          :fill="(item as ShapeItem).style.fill"
          :stroke="(item as ShapeItem).style.stroke"
          :stroke-width="(item as ShapeItem).style.strokeWidth"
          :opacity="(item as ShapeItem).style.opacity"
        />
        <polygon
          v-else-if="(item as ShapeItem).shapeType === 'triangle'"
          :points="trianglePoints(item as ShapeItem)"
          :fill="(item as ShapeItem).style.fill"
          :stroke="(item as ShapeItem).style.stroke"
          :stroke-width="(item as ShapeItem).style.strokeWidth"
          :opacity="(item as ShapeItem).style.opacity"
        />
        <line
          v-else-if="(item as ShapeItem).shapeType === 'line'"
          :x1="(item as ShapeItem).lx1 ?? item.x"
          :y1="(item as ShapeItem).ly1 ?? item.y"
          :x2="(item as ShapeItem).lx2 ?? item.x + item.width"
          :y2="(item as ShapeItem).ly2 ?? item.y + item.height"
          :stroke="(item as ShapeItem).style.stroke"
          :stroke-width="(item as ShapeItem).style.strokeWidth"
          fill="none"
          :opacity="(item as ShapeItem).style.opacity"
          stroke-linecap="round"
        />
        <path
          v-else-if="(item as ShapeItem).shapeType === 'arrow'"
          :d="arrowPath(item as ShapeItem)"
          :stroke="(item as ShapeItem).style.stroke"
          :stroke-width="(item as ShapeItem).style.strokeWidth"
          fill="none"
          :opacity="(item as ShapeItem).style.opacity"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Text shape: centered label + transparent hit-area rect.
             The <text> element has pointer-events:none to prevent text
             selection interfering with drag. The <rect> is the actual
             hit-target that lets the parent <g> receive pointer events —
             without it the <g> has no renderable area and is never hit. -->
        <template v-else-if="(item as ShapeItem).shapeType === 'text'">
          <rect
            :x="item.x" :y="item.y"
            :width="item.width" :height="item.height"
            fill="transparent"
            stroke="none"
          />
          <text
            :x="item.x + item.width / 2"
            :y="item.y + item.height / 2"
            text-anchor="middle"
            dominant-baseline="middle"
            :fill="(item as ShapeItem).style.stroke"
            :font-size="14 / canvasScale"
            font-family="system-ui, -apple-system, sans-serif"
            :opacity="(item as ShapeItem).style.opacity"
            style="pointer-events: none; user-select: none; white-space: pre"
          >{{ (item as ShapeItem).label || 'Text' }}</text>
        </template>

        <!-- Label overlay for non-text shapes -->
        <text
          v-if="(item as ShapeItem).shapeType !== 'text' && (item as ShapeItem).label"
          :x="item.x + item.width / 2"
          :y="item.y + item.height / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          :fill="(item as ShapeItem).style.stroke"
          :font-size="13 / canvasScale"
          font-family="system-ui, -apple-system, sans-serif"
          style="pointer-events: none; user-select: none"
        >{{ (item as ShapeItem).label }}</text>
      </template>

      <!-- Selection outline (shown for any selected item) -->
      <rect
        v-if="selectedDrawingIds.has(item.id)"
        :x="item.x - 3 / canvasScale"
        :y="item.y - 3 / canvasScale"
        :width="item.width + 6 / canvasScale"
        :height="item.height + 6 / canvasScale"
        fill="none"
        stroke="#3B82F6"
        :stroke-width="1.5 / canvasScale"
        stroke-dasharray="4 3"
        style="pointer-events: none"
      />

      <!-- Resize handles — only when exactly one item is selected and not rotated -->
      <template v-if="selectedDrawingIds.size === 1 && selectedDrawingIds.has(item.id) && !item.rotation">
        <rect
          v-for="h in getHandles(item)"
          :key="h.idx"
          :x="h.x" :y="h.y"
          :width="handleSize" :height="handleSize"
          fill="white"
          stroke="#3B82F6"
          :stroke-width="1.5 / canvasScale"
          rx="1"
          :style="{ pointerEvents: 'all', cursor: h.cursor }"
          @pointerdown.stop="onHandlePointerDown($event, h.idx)"
          @pointermove.stop="onHandlePointerMove($event)"
          @pointerup.stop="onItemPointerUp($event)"
        />
      </template>
    </g>

    <!-- ── Rotation handle ────────────────────────────────────────────────── -->
    <g v-if="rotateHandleInfo" style="pointer-events: none">
      <!-- Connector line: top of selection bbox → handle circle -->
      <line
        :x1="rotateHandleInfo.hx"
        :y1="rotateHandleInfo.ly"
        :x2="rotateHandleInfo.hx"
        :y2="rotateHandleInfo.hy"
        stroke="#3B82F6"
        :stroke-width="1.2 / canvasScale"
        stroke-dasharray="3 2"
      />
      <!-- Handle circle (pointer-events restored on this element alone) -->
      <circle
        :cx="rotateHandleInfo.hx"
        :cy="rotateHandleInfo.hy"
        :r="5 / canvasScale"
        fill="white"
        stroke="#3B82F6"
        :stroke-width="1.5 / canvasScale"
        style="pointer-events: all; cursor: grab"
        @pointerdown.stop="onRotateHandlePointerDown"
        @pointermove="onRotateHandlePointerMove"
        @pointerup="onRotateHandlePointerUp"
      />
    </g>

    <!-- ── In-progress preview ─────────────────────────────────────────────── -->
    <g v-if="inProgressItem" style="pointer-events: none">
      <!-- Freehand preview -->
      <path
        v-if="inProgressItem.kind === 'freehand'"
        :d="freehandToPath(inProgressItem as FreehandItem)"
        :fill="inProgressItem.style.stroke"
        stroke="none"
        :opacity="inProgressItem.style.opacity * 0.8"
      />

      <!-- Shape previews (dashed outline) -->
      <template v-else-if="inProgressItem.kind === 'shape'">
        <rect
          v-if="(inProgressItem as ShapeItem).shapeType === 'rect'"
          :x="inProgressItem.x" :y="inProgressItem.y"
          :width="inProgressItem.width" :height="inProgressItem.height"
          :fill="(inProgressItem as ShapeItem).style.fill"
          :stroke="(inProgressItem as ShapeItem).style.stroke"
          :stroke-width="(inProgressItem as ShapeItem).style.strokeWidth"
          opacity="0.7"
          stroke-dasharray="5 3"
          rx="2"
        />
        <ellipse
          v-else-if="(inProgressItem as ShapeItem).shapeType === 'ellipse'"
          :cx="inProgressItem.x + inProgressItem.width / 2"
          :cy="inProgressItem.y + inProgressItem.height / 2"
          :rx="inProgressItem.width / 2" :ry="inProgressItem.height / 2"
          :fill="(inProgressItem as ShapeItem).style.fill"
          :stroke="(inProgressItem as ShapeItem).style.stroke"
          :stroke-width="(inProgressItem as ShapeItem).style.strokeWidth"
          opacity="0.7"
          stroke-dasharray="5 3"
        />
        <polygon
          v-else-if="(inProgressItem as ShapeItem).shapeType === 'diamond'"
          :points="diamondPoints(inProgressItem as ShapeItem)"
          :fill="(inProgressItem as ShapeItem).style.fill"
          :stroke="(inProgressItem as ShapeItem).style.stroke"
          :stroke-width="(inProgressItem as ShapeItem).style.strokeWidth"
          opacity="0.7"
          stroke-dasharray="5 3"
        />
        <polygon
          v-else-if="(inProgressItem as ShapeItem).shapeType === 'triangle'"
          :points="trianglePoints(inProgressItem as ShapeItem)"
          :fill="(inProgressItem as ShapeItem).style.fill"
          :stroke="(inProgressItem as ShapeItem).style.stroke"
          :stroke-width="(inProgressItem as ShapeItem).style.strokeWidth"
          opacity="0.7"
          stroke-dasharray="5 3"
        />
        <line
          v-else-if="(inProgressItem as ShapeItem).shapeType === 'line'"
          :x1="(inProgressItem as ShapeItem).lx1 ?? inProgressItem.x"
          :y1="(inProgressItem as ShapeItem).ly1 ?? inProgressItem.y"
          :x2="(inProgressItem as ShapeItem).lx2 ?? inProgressItem.x + inProgressItem.width"
          :y2="(inProgressItem as ShapeItem).ly2 ?? inProgressItem.y + inProgressItem.height"
          :stroke="(inProgressItem as ShapeItem).style.stroke"
          :stroke-width="(inProgressItem as ShapeItem).style.strokeWidth"
          fill="none" opacity="0.7" stroke-linecap="round"
        />
        <path
          v-else-if="(inProgressItem as ShapeItem).shapeType === 'arrow'"
          :d="arrowPath(inProgressItem as ShapeItem)"
          :stroke="(inProgressItem as ShapeItem).style.stroke"
          :stroke-width="(inProgressItem as ShapeItem).style.strokeWidth"
          fill="none" opacity="0.7"
          stroke-linecap="round" stroke-linejoin="round"
        />
      </template>
    </g>

    <!-- ── Rubber-band marquee preview ────────────────────────────────────── -->
    <rect
      v-if="marqueeRect"
      :x="marqueeRect.x"
      :y="marqueeRect.y"
      :width="marqueeRect.width"
      :height="marqueeRect.height"
      fill="#3B82F6"
      fill-opacity="0.08"
      stroke="#3B82F6"
      :stroke-width="1 / canvasScale"
      stroke-dasharray="4 3"
      style="pointer-events: none"
    />

    <!-- ── Label editor (foreignObject input) ─────────────────────────────── -->
    <foreignObject
      v-if="editingItem"
      :x="editingItem.x"
      :y="editingItem.y + editingItem.height / 2 - 14"
      :width="Math.max(editingItem.width, 100)"
      height="28"
      style="overflow: visible"
    >
      <input
        ref="labelInputRef"
        v-model="editingLabelText"
        style="
          width: 100%;
          height: 28px;
          padding: 2px 6px;
          border: 1.5px solid #3B82F6;
          border-radius: 4px;
          background: white;
          font-size: 13px;
          font-family: system-ui, sans-serif;
          outline: none;
          box-sizing: border-box;
        "
        @blur="commitLabel"
        @keydown.enter.prevent="commitLabel"
        @keydown.escape.prevent="cancelLabel"
        @pointerdown.stop
      />
    </foreignObject>
  </svg>
</template>

<style scoped>
.svg-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}
</style>
