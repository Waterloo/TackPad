<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '~/stores/ui'
import { useBoardStore } from '~/stores/board'
import { deleteSelectedBoardItems } from '~/composables/useGlobalShortcuts'
import { useUpload } from '~/composables/useUpload'

const uiStore = useUiStore()
const boardStore = useBoardStore()
const { deleteItemWithUpload } = useUpload()
const canvasScale = inject<Ref<number>>('canvasScale', ref(1))

const { selectedItemIds } = storeToRefs(uiStore)

// ── Derived selection state ────────────────────────────────────────────────

const selectedItems = computed(() =>
  [...selectedItemIds.value].map(id => boardStore.items.get(id)).filter(Boolean),
)

const hasGroupItem = computed(() =>
  selectedItems.value.some(it => it?.kind === 'group'),
)

// All selected items share the same parentGroupId (they are sibling children of a group)
const sharedParentGroupId = computed(() => {
  const items = selectedItems.value
  if (items.length < 1) return null
  const gid = (items[0] as any)?.parentGroupId as string | undefined
  if (!gid) return null
  return items.every(it => (it as any)?.parentGroupId === gid) ? gid : null
})

const canGroup = computed(() => {
  if (selectedItemIds.value.size < 2) return false
  // Can't group if any selected item is already a group widget
  return !hasGroupItem.value
})

const canUngroup = computed(() => {
  if (selectedItemIds.value.size < 1) return false
  return hasGroupItem.value || sharedParentGroupId.value !== null
})

// ── Visibility ────────────────────────────────────────────────────────────

const shouldShow = computed(() => {
  const size = selectedItemIds.value.size
  if (size === 0) return false
  if (size >= 2) return true
  // Single selection: only show for GroupItem (ungroup action)
  return selectedItems.value[0]?.kind === 'group'
})

// ── Bounding box of all selected items ────────────────────────────────────

const selectionBbox = computed(() => {
  if (!shouldShow.value) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const item of selectedItems.value) {
    if (!item) continue
    minX = Math.min(minX, item.x_position)
    minY = Math.min(minY, item.y_position)
    maxX = Math.max(maxX, item.x_position + item.width)
    maxY = Math.max(maxY, item.y_position + item.height)
  }
  if (!isFinite(minX)) return null
  return { minX, minY, maxX, centerX: (minX + maxX) / 2 }
})

// ── Positioning in board space ────────────────────────────────────────────
// The toolbar lives inside origin-wrapper (board coordinate space).
// We position it at the top-center of the selection bbox, then counter-scale
// so it stays the same visual size regardless of zoom.

const toolbarStyle = computed(() => {
  const bbox = selectionBbox.value
  if (!bbox) return { display: 'none' }
  const s = canvasScale.value > 0 ? 1 / canvasScale.value : 1
  // Offset upward: 48px in screen space → 48/scale in board space
  const offsetUp = 48 * s
  return {
    position: 'absolute' as const,
    left: `${bbox.centerX}px`,
    top: `${bbox.minY - offsetUp}px`,
    transform: `translateX(-50%) scale(${s})`,
    transformOrigin: 'bottom center',
    zIndex: 50,
    pointerEvents: 'auto' as const,
  }
})

// ── Actions ───────────────────────────────────────────────────────────────

function groupAll() {
  const ids = [...selectedItemIds.value]
  const groupId = boardStore.createGroup(ids)
  if (groupId) {
    uiStore.deselectAll()
    uiStore.selectItem(groupId)
  }
}

function ungroupAll() {
  const groupIds = new Set<string>()
  for (const item of selectedItems.value) {
    if (item?.kind === 'group') groupIds.add(item.id)
  }
  // Also dissolve via shared parent if children are selected
  if (sharedParentGroupId.value) groupIds.add(sharedParentGroupId.value)
  for (const gid of groupIds) boardStore.dissolveGroup(gid)
  uiStore.deselectAll()
}

function deleteAll() {
  void deleteSelectedBoardItems(deleteItemWithUpload)
}
</script>

<template>
  <Transition name="mst">
    <div
      v-if="shouldShow && selectionBbox"
      class="multi-select-toolbar"
      :style="toolbarStyle"
      @pointerdown.stop
      @click.stop
    >
      <!-- Group -->
      <button
        v-if="canGroup"
        class="mst-btn"
        title="Group (G)"
        @click="groupAll"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="8" height="8" rx="1.5" />
          <rect x="14" y="14" width="8" height="8" rx="1.5" />
          <path d="M10 6h4a4 4 0 0 1 4 4v4" />
        </svg>
        Group
      </button>

      <!-- Ungroup -->
      <button
        v-if="canUngroup"
        class="mst-btn"
        title="Ungroup"
        @click="ungroupAll"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="8" height="8" rx="1.5" />
          <rect x="14" y="14" width="8" height="8" rx="1.5" />
          <path d="M10 6h4a4 4 0 0 1 4 4v4" stroke-dasharray="3 2" />
        </svg>
        Ungroup
      </button>

      <div v-if="canGroup || canUngroup" class="mst-sep" />

      <!-- Count badge -->
      <span class="mst-count">{{ selectedItemIds.size }} selected</span>

      <div class="mst-sep" />

      <!-- Delete -->
      <button
        class="mst-btn mst-btn--danger"
        title="Delete all"
        @click="deleteAll"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
        Delete
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.multi-select-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 4px 6px;
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.1),
    0 1px 4px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
  user-select: none;
}

.mst-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 9px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  flex-shrink: 0;
}

.mst-btn:hover {
  background: #F3F4F6;
  color: #111827;
}

.mst-btn--danger:hover {
  background: #FEF2F2;
  color: #EF4444;
}

.mst-sep {
  width: 1px;
  height: 16px;
  background: #E5E7EB;
  margin: 0 3px;
  flex-shrink: 0;
}

.mst-count {
  font-size: 11px;
  color: #9CA3AF;
  padding: 0 4px;
  white-space: nowrap;
}

/* Enter/leave */
.mst-enter-active,
.mst-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.mst-enter-from,
.mst-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.92) !important;
}
</style>
