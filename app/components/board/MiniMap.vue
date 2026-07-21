<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'

const MAP_W = 160
const MAP_H = 110

const ITEM_COLORS: Record<string, string> = {
  note:   '#FEF08A',
  todo:   '#BFDBFE',
  link:   '#BBF7D0',
  timer:  '#FCA5A5',
  text:   '#E9D5FF',
  audio:  '#FDE68A',
  file:   '#D1FAE5',
  image:  '#FBCFE8',
}

const boardStore = useBoardStore()
const { boardItemsArray, scale, translateX, translateY } = storeToRefs(boardStore)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const visible   = ref(true)

// ── Minimap coordinate math ──────────────────────────────────────────────────
// Board items have positions in board-space.
// The canvas viewport shows: boardX = (screenX - vw/2 - translateX) / scale
// Minimap needs to show all items + the visible viewport rect.

function computeLayout() {
  const items = boardItemsArray.value
  if (items.length === 0) {
    // Show a viewport-only map centered on (0,0)
    const vw = window.innerWidth
    const vh = window.innerHeight - 48
    return {
      minX: -vw / 2 / scale.value,
      minY: -vh / 2 / scale.value,
      maxX:  vw / 2 / scale.value,
      maxY:  vh / 2 / scale.value,
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const item of items) {
    minX = Math.min(minX, item.x_position)
    minY = Math.min(minY, item.y_position)
    maxX = Math.max(maxX, item.x_position + item.width)
    maxY = Math.max(maxY, item.y_position + item.height)
  }

  // Also include current viewport bounds so they're always visible
  const vw = window.innerWidth
  const vh = window.innerHeight - 48
  const vpLeft   = (-vw / 2 - translateX.value) / scale.value
  const vpTop    = (-vh / 2 - translateY.value) / scale.value
  const vpRight  = ( vw / 2 - translateX.value) / scale.value
  const vpBottom = ( vh / 2 - translateY.value) / scale.value

  minX = Math.min(minX, vpLeft)  - 32
  minY = Math.min(minY, vpTop)   - 32
  maxX = Math.max(maxX, vpRight) + 32
  maxY = Math.max(maxY, vpBottom) + 32

  return { minX, minY, maxX, maxY }
}

function boardToMap(bx: number, by: number, bounds: ReturnType<typeof computeLayout>) {
  const bw = bounds.maxX - bounds.minX || 1
  const bh = bounds.maxY - bounds.minY || 1
  return {
    mx: ((bx - bounds.minX) / bw) * MAP_W,
    my: ((by - bounds.minY) / bh) * MAP_H,
  }
}

function mapToBoard(mx: number, my: number, bounds: ReturnType<typeof computeLayout>) {
  const bw = bounds.maxX - bounds.minX || 1
  const bh = bounds.maxY - bounds.minY || 1
  return {
    bx: bounds.minX + (mx / MAP_W) * bw,
    by: bounds.minY + (my / MAP_H) * bh,
  }
}

// ── Draw ─────────────────────────────────────────────────────────────────────
function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const bounds = computeLayout()
  const bw = bounds.maxX - bounds.minX || 1
  const bh = bounds.maxY - bounds.minY || 1

  // Background
  ctx.fillStyle = '#F9FAFB'
  ctx.fillRect(0, 0, MAP_W, MAP_H)

  // Item dots
  for (const item of boardItemsArray.value) {
    const color = ITEM_COLORS[item.kind] ?? '#E5E7EB'
    const dotW  = Math.min(8, Math.max(2, (item.width  / bw) * MAP_W))
    const dotH  = Math.min(8, Math.max(2, (item.height / bh) * MAP_H))
    const { mx, my } = boardToMap(item.x_position, item.y_position, bounds)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(mx, my, dotW, dotH, 1)
    ctx.fill()
  }

  // Viewport rect
  const vw = window.innerWidth
  const vh = window.innerHeight - 48
  const vpLeft   = (-vw / 2 - translateX.value) / scale.value
  const vpTop    = (-vh / 2 - translateY.value) / scale.value
  const vpRight  = ( vw / 2 - translateX.value) / scale.value
  const vpBottom = ( vh / 2 - translateY.value) / scale.value

  const { mx: vx1, my: vy1 } = boardToMap(vpLeft,  vpTop,    bounds)
  const { mx: vx2, my: vy2 } = boardToMap(vpRight, vpBottom, bounds)
  const vrW = vx2 - vx1
  const vrH = vy2 - vy1

  ctx.fillStyle = 'rgba(59,130,246,0.12)'
  ctx.fillRect(vx1, vy1, vrW, vrH)
  ctx.strokeStyle = 'rgba(59,130,246,0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(vx1 + 0.5, vy1 + 0.5, vrW - 1, vrH - 1)
}

// Deep watch tracks individual item position/size changes, not just array identity.
// Separate watcher for viewport pan/zoom so a drag doesn't deep-diff all items.
watch(boardItemsArray, () => nextTick(draw), { deep: true })
watch([scale, translateX, translateY], () => nextTick(draw))

onMounted(() => {
  // Hide minimap by default on mobile
  if (window.matchMedia('(max-width: 640px)').matches) {
    visible.value = false
  }
  draw()
})
onUnmounted(() => { dragging = false })

// ── Click to pan ─────────────────────────────────────────────────────────────
function onCanvasClick(e: MouseEvent) {
  // Suppress click that fires at the end of a drag
  if (didDrag) { didDrag = false; return }

  const canvas = canvasRef.value
  if (!canvas) return
  const rect   = canvas.getBoundingClientRect()
  const mx     = e.clientX - rect.left
  const my     = e.clientY - rect.top
  const bounds = computeLayout()
  const { bx, by } = mapToBoard(mx, my, bounds)

  // Center board so (bx, by) is viewport center
  const vw = window.innerWidth
  const vh = window.innerHeight - 48
  boardStore.translateX = -bx * scale.value + vw / 2
  boardStore.translateY = -by * scale.value + vh / 2
}

// ── Drag viewport rect ────────────────────────────────────────────────────────
let dragging = false
let didDrag = false
let lastMx = 0
let lastMy = 0

function onPointerDown(e: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  // Check if pointer is inside viewport rect
  const bounds = computeLayout()
  const vw = window.innerWidth
  const vh = window.innerHeight - 48
  const vpLeft   = (-vw / 2 - translateX.value) / scale.value
  const vpTop    = (-vh / 2 - translateY.value) / scale.value
  const vpRight  = ( vw / 2 - translateX.value) / scale.value
  const vpBottom = ( vh / 2 - translateY.value) / scale.value

  const { mx: vx1, my: vy1 } = boardToMap(vpLeft,  vpTop,    bounds)
  const { mx: vx2, my: vy2 } = boardToMap(vpRight, vpBottom, bounds)

  const rect = canvas.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top

  if (cx >= vx1 && cx <= vx2 && cy >= vy1 && cy <= vy2) {
    dragging = true
    didDrag = false
    lastMx = cx
    lastMy = cy
    canvas.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  didDrag = true
  const canvas = canvasRef.value
  if (!canvas) return

  const rect   = canvas.getBoundingClientRect()
  const cx     = e.clientX - rect.left
  const cy     = e.clientY - rect.top
  const dx     = cx - lastMx
  const dy     = cy - lastMy
  lastMx = cx
  lastMy = cy

  const bounds = computeLayout()
  const bw     = bounds.maxX - bounds.minX || 1
  const bh     = bounds.maxY - bounds.minY || 1
  const dbx    = (dx / MAP_W) * bw
  const dby    = (dy / MAP_H) * bh

  boardStore.translateX -= dbx * scale.value
  boardStore.translateY -= dby * scale.value
}

function onPointerUp() {
  dragging = false
}
</script>

<template>
  <div class="minimap-wrap" :class="{ 'minimap-wrap--hidden': !visible }">
    <!-- Toggle button -->
    <button
      class="minimap-toggle"
      :title="visible ? 'Hide map' : 'Show map'"
      :aria-label="visible ? 'Hide map' : 'Show map'"
      @click="visible = !visible"
    >
      <!-- Eye icon -->
      <svg v-if="visible" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <ellipse cx="6" cy="6" rx="4.5" ry="3" stroke="currentColor" stroke-width="1.2"/>
        <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
      </svg>
      <!-- Eye-off icon -->
      <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M1.5 1.5l9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M5.1 3.2A4.9 4.9 0 0 1 6 3c2.2 0 4 1.8 4.5 3-.27.66-.69 1.26-1.23 1.75" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M3.5 4.5C2.5 5.1 1.8 5.9 1.5 6c.5 1.2 2.3 3 4.5 3 .7 0 1.37-.17 1.96-.46" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Canvas -->
    <canvas
      v-if="visible"
      ref="canvasRef"
      :width="MAP_W"
      :height="MAP_H"
      class="minimap-canvas"
      @click="onCanvasClick"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    />
  </div>
</template>

<style scoped>
.minimap-wrap {
  position: fixed;
  bottom: 80px;
  right: 16px;
  z-index: 49;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  width: 160px;
}

.minimap-wrap--hidden {
  width: auto;
  border-radius: 999px;
}

.minimap-toggle {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(255,255,255,0.85);
  border-radius: 999px;
  color: #9CA3AF;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  backdrop-filter: blur(2px);
}

.minimap-toggle:hover {
  background: #EFF6FF;
  color: #2563EB;
}

/* When hidden, toggle becomes a standalone pill */
.minimap-wrap--hidden .minimap-toggle {
  position: static;
  width: 28px;
  height: 28px;
  background: transparent;
}

.minimap-canvas {
  display: block;
  cursor: crosshair;
  touch-action: none;
}

/* ── Mobile ───────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .minimap-wrap {
    bottom: 60px;
    right: 8px;
    width: 120px;
  }

  .minimap-toggle { width: 28px; height: 28px; }
}
</style>
