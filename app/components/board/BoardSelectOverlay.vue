<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '~/stores/ui'
import { useBoardStore } from '~/stores/board'

const uiStore = useUiStore()
const boardStore = useBoardStore()

const { boardSelectMode } = storeToRefs(uiStore)

// Injected from BoardCanvas — same coords used by SvgLayer and widgets
type CanvasCoords = { screenToBoard: (x: number, y: number) => { x: number; y: number } }
const coords = inject<CanvasCoords>('canvasCoords')!
const canvasScale = inject<Ref<number>>('canvasScale', ref(1))

// ── Rubber-band state ─────────────────────────────────────────────────────

const dragStart = ref<{ bx: number; by: number; px: number; py: number } | null>(null)
// Normalized rubber-band rect in board coordinates
const band = ref<{ x: number; y: number; w: number; h: number } | null>(null)

// ── Pointer handlers ──────────────────────────────────────────────────────

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const { x: bx, y: by } = coords.screenToBoard(e.clientX, e.clientY)
  dragStart.value = { bx, by, px: e.clientX, py: e.clientY }
  band.value = null
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragStart.value) return
  const dx = e.clientX - dragStart.value.px
  const dy = e.clientY - dragStart.value.py
  // Only start drawing after 6px of movement to distinguish from a click
  if (!band.value && Math.sqrt(dx * dx + dy * dy) < 6) return
  const { x: bx, y: by } = coords.screenToBoard(e.clientX, e.clientY)
  band.value = {
    x: Math.min(dragStart.value.bx, bx),
    y: Math.min(dragStart.value.by, by),
    w: Math.abs(bx - dragStart.value.bx),
    h: Math.abs(by - dragStart.value.by),
  }
}

function onPointerUp(e: PointerEvent) {
  if (!dragStart.value) return
  const dx = e.clientX - dragStart.value.px
  const dy = e.clientY - dragStart.value.py
  const isClick = Math.sqrt(dx * dx + dy * dy) < 6

  if (isClick) {
    // Simple click on empty canvas — deselect everything
    uiStore.deselectAll()
  } else if (band.value) {
    // Rubber-band complete — select overlapping top-level non-grouped items
    const r = band.value
    const hits = [...boardStore.items.values()].filter((item) => {
      // Skip items that live inside a group — grouping them again would nest groups
      if (item.parentGroupId) return false
      // Skip group container widgets themselves (select via click, not rubber-band)
      if (item.kind === 'group') return false
      // Bounding-box overlap test
      return (
        item.x_position < r.x + r.w
        && item.x_position + item.width > r.x
        && item.y_position < r.y + r.h
        && item.y_position + item.height > r.y
      )
    })

    if (e.shiftKey) {
      // Shift: add to existing selection
      for (const item of hits) uiStore.toggleSelection(item.id)
    } else {
      uiStore.deselectAll()
      for (const item of hits) uiStore.toggleSelection(item.id)
    }
  }

  dragStart.value = null
  band.value = null
}

// ── Rubber-band visual style (board space) ────────────────────────────────

const bandStyle = computed(() => {
  const b = band.value
  if (!b) return {}
  // Border width stays 1px on screen regardless of zoom
  const bw = `${1 / (canvasScale.value || 1)}px`
  return {
    transform: `translate(${b.x}px, ${b.y}px)`,
    width: `${b.w}px`,
    height: `${b.h}px`,
    borderWidth: bw,
  }
})
</script>

<template>
  <!--
    Background capture div — sits in board space (inside origin-wrapper),
    covers the full 20 000 × 20 000 board area, z-index 1 so it is always
    BEHIND widgets (z-index 10+).  pointer-events only active in select mode.
  -->
  <div
    class="select-bg"
    :class="{ 'select-bg--active': boardSelectMode }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  />

  <!-- Rubber-band rectangle (board space, rendered on top of the bg) -->
  <div
    v-if="band"
    class="rubber-band"
    :style="bandStyle"
  />
</template>

<style scoped>
/* Covers the entire navigable board canvas */
.select-bg {
  position: absolute;
  top: -10000px;
  left: -10000px;
  width: 20000px;
  height: 20000px;
  z-index: 1;
  pointer-events: none;
  cursor: default;
}

.select-bg--active {
  pointer-events: all;
  cursor: crosshair;
}

/* Rubber-band selection rectangle */
.rubber-band {
  position: absolute;
  top: 0;
  left: 0;
  border: 1px dashed #3B82F6;
  background: rgba(59, 130, 246, 0.07);
  border-radius: 2px;
  pointer-events: none;
  z-index: 2;
}
</style>
