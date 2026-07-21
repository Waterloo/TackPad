<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'
import type { GroupItem } from '~/shared/types/board'

const props = defineProps<{ itemId: string }>()

const boardStore = useBoardStore()
const uiStore = useUiStore()
const { selectedItemIds } = storeToRefs(uiStore)
const canvasScale = inject<Ref<number>>('canvasScale', ref(1))

const item = computed(() => boardStore.items.get(props.itemId) as GroupItem | undefined)

const isSelected = computed(() => selectedItemIds.value.has(props.itemId))

// Computed bounding box derived live from child positions
const childBbox = computed(() => {
  if (!item.value) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const id of item.value.childIds) {
    const child = boardStore.items.get(id)
    if (!child) continue
    minX = Math.min(minX, child.x_position)
    minY = Math.min(minY, child.y_position)
    maxX = Math.max(maxX, child.x_position + child.width)
    maxY = Math.max(maxY, child.y_position + child.height)
  }
  if (!isFinite(minX)) return null
  const PAD = 16
  return { x: minX - PAD, y: minY - PAD, w: (maxX - minX) + PAD * 2, h: (maxY - minY) + PAD * 2 }
})

const wrapperStyle = computed(() => {
  const bb = childBbox.value
  if (!bb) return { display: 'none' }
  return {
    transform: `translate(${bb.x}px, ${bb.y}px)`,
    width: `${bb.w}px`,
    height: `${bb.h}px`,
    // Sits below all widgets (z-index 10) so children are always clickable
    zIndex: 5,
  }
})

// Label editing
const isEditingLabel = ref(false)
const labelValue = ref('')
const labelInputRef = ref<HTMLInputElement | null>(null)

function startLabelEdit(e: MouseEvent) {
  e.stopPropagation()
  labelValue.value = item.value?.label ?? ''
  isEditingLabel.value = true
  nextTick(() => labelInputRef.value?.focus())
}

function commitLabel() {
  isEditingLabel.value = false
  if (item.value) {
    boardStore.updateItem(props.itemId, { label: labelValue.value.trim() } as any)
  }
}

// Click on group background → select the GroupItem
// Children sit above (z-index 10) so clicks on children hit them first, not this div
function onPointerDown(e: PointerEvent) {
  e.stopPropagation()
  if (e.shiftKey) uiStore.toggleSelection(props.itemId)
  else uiStore.selectItem(props.itemId)
}

// Drag: moves the group widget + all children together
const isDragging = ref(false)

function startDrag(e: PointerEvent) {
  if (e.button !== 0) return
  e.stopPropagation()
  if (!item.value) return

  const startPx = e.clientX
  const startPy = e.clientY

  const origins = new Map<string, { x: number; y: number }>()
  origins.set(props.itemId, { x: item.value.x_position, y: item.value.y_position })
  for (const id of item.value.childIds) {
    const child = boardStore.items.get(id)
    if (child) origins.set(id, { x: child.x_position, y: child.y_position })
  }

  isDragging.value = true
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

  function onMove(e: PointerEvent) {
    const dx = (e.clientX - startPx) / boardStore.scale
    const dy = (e.clientY - startPy) / boardStore.scale
    for (const [id, orig] of origins) {
      boardStore.updateItem(id, { x_position: orig.x + dx, y_position: orig.y + dy })
    }
  }

  function onUp(e: PointerEvent) {
    isDragging.value = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

// Counter-scale for the label
const labelScale = computed(() => ({
  transform: `scale(${canvasScale.value > 0 ? 1 / canvasScale.value : 1})`,
  transformOrigin: 'top left',
}))
</script>

<template>
  <div
    v-if="item && childBbox"
    class="group-widget"
    :class="{
      'is-selected': isSelected,
      'is-dragging': isDragging,
    }"
    :style="wrapperStyle"
    @pointerdown="onPointerDown"
    @click.stop
  >
    <!-- Drag handle strip across the top padding area -->
    <div class="group-drag-handle" @pointerdown.stop="startDrag" />

    <!-- Label (top-left, counter-scaled) -->
    <div class="group-label-area" :style="labelScale">
      <input
        v-if="isEditingLabel"
        ref="labelInputRef"
        v-model="labelValue"
        class="group-label-input"
        placeholder="Group name…"
        @blur="commitLabel"
        @keydown.enter.prevent="commitLabel"
        @keydown.escape.prevent="isEditingLabel = false"
        @pointerdown.stop
        @click.stop
      />
      <span
        v-else
        class="group-label"
        @dblclick.stop="startLabelEdit"
      >{{ item.label || '' }}</span>
    </div>
  </div>
</template>

<style scoped>
.group-widget {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 8px;
  background: rgba(219, 234, 254, 0.2);
  border: 1.5px dashed #93C5FD;
  box-sizing: border-box;
  cursor: default;
  transition: border-color 0.15s, background 0.15s;
}

.group-widget.is-selected {
  border-color: #3B82F6;
  background: rgba(219, 234, 254, 0.3);
}

.group-widget.is-dragging {
  opacity: 0.85;
}

/* Drag handle: the top strip (padding area above children) */
.group-drag-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  cursor: grab;
  z-index: 1;
}

.group-widget.is-dragging .group-drag-handle {
  cursor: grabbing;
}

/* Label */
.group-label-area {
  position: absolute;
  top: 3px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  z-index: 2;
  pointer-events: auto;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: #93C5FD;
  letter-spacing: 0.02em;
  cursor: text;
  white-space: nowrap;
}

.group-widget.is-selected .group-label {
  color: #3B82F6;
}

.group-label-input {
  font-size: 11px;
  font-weight: 600;
  color: #3B82F6;
  background: #fff;
  border: 1px solid #3B82F6;
  border-radius: 4px;
  padding: 1px 6px;
  outline: none;
  width: 120px;
}
</style>
