<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useBoardStore } from '~/stores/board'
import { useUiStore } from '~/stores/ui'
import { useWidgetDrag } from '~/composables/widgets/useWidgetDrag'
import { useWidgetResize } from '~/composables/widgets/useWidgetResize'
import { useWidgetSelection } from '~/composables/widgets/useWidgetSelection'
import { usePiPWindow } from '~/composables/usePiPWindow'
import { useAuthStore } from '~/stores/auth'
import { useCommentCount } from '~/composables/useCommentCount'
import { useUpload } from '~/composables/useUpload'
import { isSecretWidget } from '~~/shared/utils/secrets'
import ReactionBar from './ReactionBar.vue'
import CheckpointPanel from './CheckpointPanel.vue'
import CommentPanel from './CommentPanel.vue'

const props = defineProps<{ itemId: string }>()

const boardStore = useBoardStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const { drawingMode, selectedItemIds } = storeToRefs(uiStore)
const { boardId } = storeToRefs(boardStore)
const canvasScale = inject<Ref<number>>('canvasScale', ref(1))

const { openPip, isOpen: isPipOpen } = usePiPWindow()

const item = computed(() => boardStore.items.get(props.itemId))

const { isDragging, startDrag } = useWidgetDrag(item as Ref<any>)
const { isResizing, startResize } = useWidgetResize(item as Ref<any>)
const { isSelected, select } = useWidgetSelection(props.itemId)
const { deleteItemWithUpload } = useUpload()

const isInteracting = computed(() => isDragging.value || isResizing.value)
const isItemCreator = computed(() => item.value?.createdBy === authStore.profile?.id)
const isSecretItem = computed(() => !!item.value && isSecretWidget(item.value))
const isSecretReadonly = computed(() => isSecretItem.value && !isItemCreator.value)

// True when the item has at least one reaction with votes — keeps the
// reaction area visible even when the widget is not hovered/selected.
const hasReactions = computed(() => {
  const r = item.value?.reactions
  return !!r && Object.values(r).some(voters => voters.length > 0)
})

// Display name editing
const isEditingName = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)
const nameValue = ref('')

function startEditName() {
  if (isSecretReadonly.value) return
  nameValue.value = item.value?.displayName ?? ''
  isEditingName.value = true
  nextTick(() => nameInput.value?.focus())
}

function commitName() {
  isEditingName.value = false
  if (item.value) {
    boardStore.updateItem(props.itemId, { displayName: nameValue.value.trim() })
  }
}

function onNameKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === 'Escape') commitName()
}

// Context menu actions
async function deleteWidget() {
  if (isSecretReadonly.value) return
  await deleteItemWithUpload(props.itemId)
}

function toggleLock() {
  if (!item.value || isSecretReadonly.value) return
  boardStore.updateItem(props.itemId, { lock: !item.value.lock })
}

// Wrapper style
const wrapperStyle = computed(() => {
  if (!item.value) return {}
  return {
    transform: `translate(${item.value.x_position}px, ${item.value.y_position}px)`,
    width: `${item.value.width}px`,
    height: `${item.value.height}px`,
    zIndex: isSelected.value ? 11 : 10,
    willChange: isInteracting.value ? 'transform' : 'auto',
    // Disable all pointer interaction while in drawing mode so the SVG
    // capture rect (and not the widget) handles every pointer event.
    pointerEvents: drawingMode.value ? 'none' : undefined,
  }
})

// ---------------------------------------------------------------------------
// Checkpoint + Comment panels
// ---------------------------------------------------------------------------
const showCheckpointPanel = ref(false)
const showCommentPanel = ref(false)

const itemIdRef = computed(() => props.itemId)
const { count: commentCount, fetchCount: fetchCommentCount, setCount: setCommentCount } = useCommentCount(itemIdRef)

// Lazy-fetch comment count on select or hover
watch(isSelected, (sel) => { if (sel) fetchCommentCount() })

function toggleCheckpointPanel() {
  showCheckpointPanel.value = !showCheckpointPanel.value
  showCommentPanel.value = false
}

function toggleCommentPanel() {
  showCommentPanel.value = !showCommentPanel.value
  showCheckpointPanel.value = false
}

function onCommentCountUpdate(count: number) {
  setCommentCount(count)
}

// Context menu counter-scale — keeps toolbar the same visual size at any zoom.
// Guard against zero/negative scale to avoid Infinity in the transform.
const menuStyle = computed(() => ({
  transform: `translateX(-50%) scale(${canvasScale.value > 0 ? 1 / canvasScale.value : 1})`,
  transformOrigin: 'bottom center',
}))
</script>

<template>
  <div
    v-if="item"
    class="widget-wrapper"
    :class="{
      'is-selected': isSelected,
      'is-locked': item.lock,
      'is-dragging': isDragging,
      'is-resizing': isResizing,
    }"
    :style="wrapperStyle"
    @pointerdown="select"
    @click.stop
  >
    <!-- ── Display name ─────────────────────────────────────────── -->
    <div class="name-area" @pointerdown.stop>
      <input
        v-if="isEditingName"
        ref="nameInput"
        v-model="nameValue"
        class="name-input"
        placeholder="Name…"
        @blur="commitName"
        @keydown="onNameKeydown"
        @click.stop
      />
      <template v-else>
        <span class="name-label" @dblclick.stop="startEditName">
          {{ item.displayName || '' }}
        </span>
        <button v-if="!isSecretReadonly" class="name-edit-btn" title="Rename" @click.stop="startEditName">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </template>
    </div>

    <!-- ── Context toolbar ─────────────────────────────────────── -->
    <!-- v-show (not v-if) keeps the slot div in the DOM so Teleport from
         child widgets always finds its target on mount. -->
    <Transition name="menu">
      <div
        v-show="isSelected && !isInteracting && selectedItemIds.size === 1"
        class="context-toolbar"
        :style="menuStyle"
        @pointerdown.stop
      >
        <!-- Widget-specific controls teleport here -->
        <div :class="`widget-custom-slot widget-slot-${itemId}`" class="custom-slot" />

        <div class="toolbar-divider" />

        <!-- Lock / unlock -->
        <button
          v-if="!isSecretReadonly"
          class="toolbar-btn"
          :title="item.lock ? 'Unlock' : 'Lock'"
          @click.stop="toggleLock"
        >
          <svg v-if="item.lock" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        </button>

        <!-- Picture-in-Picture -->
        <button
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': isPipOpen }"
          title="Pop out (Picture-in-Picture)"
          @click.stop="openPip(boardId, itemId, item.width, item.height)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
          </svg>
        </button>

        <!-- Checkpoint / Version History (only for item creator) -->
        <button
          v-if="isItemCreator && !isSecretItem"
          class="toolbar-btn"
          :class="{ 'toolbar-btn--active': showCheckpointPanel }"
          title="Version History"
          @click.stop="toggleCheckpointPanel"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>

        <!-- Delete -->
        <button
          v-if="!isSecretReadonly"
          class="toolbar-btn toolbar-btn--danger"
          title="Delete"
          @click.stop="void deleteWidget()"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- ── Drag handle ─────────────────────────────────────────── -->
    <div
      v-if="!item.lock && !isSecretReadonly"
      class="drag-handle"
      @pointerdown.stop="startDrag"
    >
      <div class="drag-pill" />
    </div>

    <!-- ── Widget content ──────────────────────────────────────── -->
    <div class="widget-content" @wheel.stop @touchmove.stop>
      <slot />
    </div>

    <!-- ── Lock badge ──────────────────────────────────────────── -->
    <div v-if="item.lock" class="lock-badge">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2.5" fill="none" />
      </svg>
    </div>

    <!-- ── Resize handle ───────────────────────────────────────── -->
    <div
      v-if="!item.lock && !isSecretReadonly"
      class="resize-handle"
      @pointerdown.stop="startResize"
    />

    <!-- ── Checkpoint drawer ────────────────────────────────────── -->
    <CheckpointPanel
      v-if="isItemCreator && !isSecretItem"
      v-model:visible="showCheckpointPanel"
      :item-id="itemId"
    />

    <!-- ── Reaction bar + Comment button ──────────────────────── -->
    <!-- Always in DOM; visible on hover/selection or when any reaction exists -->
    <div
      v-if="!isSecretItem"
      class="reaction-area"
      :class="{ 'reaction-area--visible': hasReactions || commentCount > 0 }"
      @pointerdown.stop
    >
      <ReactionBar :item-id="itemId" />

      <!-- Spacer pushes comment button to the right -->
      <div class="reaction-spacer" />

      <!-- Comment button -->
      <button
        class="comment-btn"
        :class="{ 'comment-btn--active': showCommentPanel, 'comment-btn--has-count': commentCount > 0 }"
        title="Comments"
        @click.stop="toggleCommentPanel"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span v-if="commentCount > 0" class="comment-count">{{ commentCount }}</span>
      </button>
    </div>

    <!-- ── Comment drawer ──────────────────────────────────────── -->
    <CommentPanel
      v-if="!isSecretItem"
      v-model:visible="showCommentPanel"
      :item-id="itemId"
      @count-update="onCommentCountUpdate"
    />
  </div>
</template>

<style scoped>
.widget-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 10px;
  background: #fff;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.07),
    0 1px 2px rgba(0, 0, 0, 0.05);
  outline: 1.5px solid transparent;
  outline-offset: 0;
  transition:
    box-shadow 0.15s ease,
    outline-color 0.1s ease;
  cursor: default;
}

.widget-wrapper.is-selected {
  outline-color: #3B82F6;
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.15),
    0 4px 16px rgba(0, 0, 0, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.06);
}

.widget-wrapper.is-dragging {
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.15),
    0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: grabbing;
}

.widget-wrapper.is-locked {
  outline-color: transparent;
}

/* ── Display name ──────────────────────────────────────────────── */
.name-area {
  position: absolute;
  top: -22px;
  left: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  max-width: calc(100% - 8px);
}

.widget-wrapper.is-selected .name-area {
  pointer-events: auto;
  opacity: 1;
}

.name-label {
  font-size: 11px;
  font-weight: 500;
  color: #6B7280;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
  max-width: 160px;
}

.name-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: #9CA3AF;
  cursor: pointer;
  border-radius: 3px;
  flex-shrink: 0;
  padding: 0;
  transition: color 0.1s;
}

.name-edit-btn:hover {
  color: #374151;
}

.name-input {
  font-size: 11px;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #3B82F6;
  border-radius: 4px;
  padding: 1px 6px;
  outline: none;
  pointer-events: auto;
  width: auto;
  min-width: 80px;
  max-width: 160px;
}

/* ── Context toolbar ───────────────────────────────────────────── */
.context-toolbar {
  position: absolute;
  bottom: calc(100% + 32px);
  left: 50%;
  /* transform set inline for counter-scale */
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
  pointer-events: auto;
}

.custom-slot {
  display: contents;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background: #E5E7EB;
  margin: 0 3px;
  flex-shrink: 0;
}

/* Hide divider if custom-slot is empty */
.custom-slot:empty + .toolbar-divider {
  display: none;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: #6B7280;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  flex-shrink: 0;
}

.toolbar-btn:hover {
  background: #F3F4F6;
  color: #111827;
}

.toolbar-btn--danger:hover {
  background: #FEF2F2;
  color: #EF4444;
}

.toolbar-btn--active {
  background: #EFF6FF;
  color: #3B82F6;
}

/* ── Drag handle ───────────────────────────────────────────────── */
.drag-handle {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 2;
}

.widget-wrapper:hover .drag-handle,
.widget-wrapper.is-selected .drag-handle {
  opacity: 1;
}

.widget-wrapper.is-dragging .drag-handle {
  cursor: grabbing;
}

.drag-pill {
  width: 36px;
  height: 4px;
  background: #D1D5DB;
  border-radius: 9999px;
  transition: background 0.15s, width 0.15s;
}

.drag-handle:hover .drag-pill {
  background: #9CA3AF;
  width: 42px;
}

/* ── Widget content ────────────────────────────────────────────── */
.widget-content {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  position: relative;
  touch-action: pan-y;
}

/* ── Lock badge ────────────────────────────────────────────────── */
.lock-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  color: #D1D5DB;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
}

.widget-wrapper.is-locked:hover .lock-badge,
.widget-wrapper.is-locked.is-selected .lock-badge {
  opacity: 1;
}

/* ── Resize handle ─────────────────────────────────────────────── */
.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  opacity: 0;
  transition: opacity 0.15s;
}

.widget-wrapper:hover .resize-handle,
.widget-wrapper.is-selected .resize-handle {
  opacity: 1;
}

.resize-handle::after {
  content: '';
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 8px 8px;
  border-color: transparent transparent #9CA3AF transparent;
  border-radius: 1px;
  transition: border-color 0.15s;
}

.resize-handle:hover::after {
  border-color: transparent transparent #6B7280 transparent;
}

/* ── Menu enter/leave animation ────────────────────────────────── */
.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  /* combine with the counter-scale inline style */
  margin-bottom: -4px;
}

/* ── Reaction area ──────────────────────────────────────────────── */
.reaction-area {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

/* Show on hover or selection */
.widget-wrapper:hover .reaction-area,
.widget-wrapper.is-selected .reaction-area {
  opacity: 1;
  pointer-events: auto;
}

/* Always show when the item already has reactions — so collaborators
   can see existing reactions without needing to hover. */
.reaction-area--visible {
  opacity: 1;
  pointer-events: auto;
}

/* ── Reaction spacer ──────────────────────────────────────────── */
.reaction-spacer {
  flex: 1;
}

/* ── Comment button ───────────────────────────────────────────── */
.comment-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px 2px 5px;
  border-radius: 999px;
  border: 1.5px solid rgba(59, 80, 180, 0.12);
  background: rgba(255, 255, 255, 0.85);
  color: #9CA3AF;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
  line-height: 1;
  flex-shrink: 0;
}

.comment-btn:hover {
  background: #F0F4FF;
  border-color: rgba(59, 92, 198, 0.25);
  color: #3B5CC6;
}

.comment-btn--active {
  background: #EFF6FF;
  border-color: #93C5FD;
  color: #3B82F6;
}

.comment-btn--has-count {
  border-color: rgba(59, 92, 198, 0.2);
  color: #6B7280;
}

.comment-count {
  font-size: 10.5px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  min-width: 8px;
  text-align: center;
}

</style>
