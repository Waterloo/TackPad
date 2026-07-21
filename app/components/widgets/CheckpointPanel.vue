<script setup lang="ts">
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import type { Checkpoint } from '~/shared/types/checkpoint'

import StickyNote  from '~/components/widgets/StickyNote.vue'
import TodoList    from '~/components/widgets/TodoList.vue'
import LinkItem    from '~/components/widgets/LinkItem.vue'
import Timer       from '~/components/widgets/Timer.vue'
import TextWidget  from '~/components/widgets/TextWidget.vue'
import ImageWidget from '~/components/widgets/ImageWidget.vue'
import AudioWidget from '~/components/widgets/AudioWidget.vue'
import FileWidget  from '~/components/widgets/FileWidget.vue'
import Tacklet from '~/components/widgets/Tacklet.vue'

const WIDGET_COMPONENTS: Record<string, any> = {
  note:    StickyNote,
  todo:    TodoList,
  link:    LinkItem,
  timer:   Timer,
  text:    TextWidget,
  image:   ImageWidget,
  audio:   AudioWidget,
  file:    FileWidget,
  tacklet: Tacklet,
}

const props = defineProps<{ itemId: string }>()
const visible = defineModel<boolean>('visible', { default: false })

const boardStore = useBoardStore()
const authStore = useAuthStore()
const { boardId } = storeToRefs(boardStore)

const item = computed(() => boardStore.items.get(props.itemId))
const widgetComponent = computed(() => item.value ? WIDGET_COMPONENTS[item.value.kind] ?? null : null)

const checkpoints = ref<Checkpoint[]>([])
const loading = ref(false)
const saving = ref(false)
const restoringId = ref<string | null>(null)
const confirmRestoreId = ref<string | null>(null)
const latestCheckpoint = computed(() => checkpoints.value[0] ?? null)
const checkpointCountText = computed(() => {
  const count = checkpoints.value.length
  if (count === 0) return 'No snapshots'
  if (count === 1) return '1 snapshot'
  return `${count} snapshots`
})

async function fetchCheckpoints() {
  loading.value = true
  try {
    checkpoints.value = await $fetch<Checkpoint[]>(`/api/board/${boardId.value}/checkpoints`, {
      query: { itemId: props.itemId },
    })
  }
  catch { /* silent */ }
  finally { loading.value = false }
}

async function saveCheckpoint() {
  const ok = await authStore.requireUsername()
  if (!ok) return
  saving.value = true
  try {
    await $fetch(`/api/board/${boardId.value}/checkpoints`, {
      method: 'POST',
      body: { itemId: props.itemId },
    })
    await fetchCheckpoints()
  }
  catch { /* silent */ }
  finally { saving.value = false }
}

async function restoreCheckpoint(cpId: string) {
  const ok = await authStore.requireUsername()
  if (!ok) return
  restoringId.value = cpId
  try {
    const result = await $fetch<{ restoredItem: any; itemId: string }>(
      `/api/board/${boardId.value}/checkpoints/restore`,
      { method: 'POST', body: { checkpointId: cpId } },
    )
    // Update the item in the board store with the restored content
    boardStore.updateItem(result.itemId, result.restoredItem)
    await fetchCheckpoints()
  }
  catch { /* silent */ }
  finally {
    restoringId.value = null
    confirmRestoreId.value = null
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function absoluteTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function kindIcon(kind: string): string {
  const icons: Record<string, string> = {
    note: '📝', todo: '☑️', link: '🔗', timer: '⏱️', text: 'Aa',
    image: '🖼️', audio: '🎵', file: '📎', tacklet: '🧩', group: '📦',
  }
  return icons[kind] || '•'
}

function itemSnippet(content: any): string {
  if (!content) return ''
  if (content.kind === 'note') return content.content?.text?.replace(/<[^>]+>/g, '').slice(0, 40) || ''
  if (content.kind === 'todo') return `${content.content?.tasks?.length || 0} tasks`
  if (content.kind === 'text') return content.content?.text?.slice(0, 40) || ''
  if (content.kind === 'link') return content.content?.url?.slice(0, 40) || ''
  return content.displayName || ''
}

// Fetch checkpoints when drawer opens
watch(visible, (v) => { if (v) fetchCheckpoints() })
</script>

<template>
  <Drawer v-model:visible="visible" position="right" :style="{ width: 'min(580px, 100vw)' }" :modal="true" :dismissable="true">
    <template #header>
      <div class="cp-drawer-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div class="cp-drawer-title-wrap">
          <span class="cp-drawer-title">Version History</span>
          <span class="cp-drawer-subtitle">{{ checkpointCountText }}</span>
        </div>
        <span v-if="item?.displayName" class="cp-drawer-item-name">{{ item.displayName }}</span>
      </div>
    </template>

    <div class="cp-drawer-body">
      <!-- Widget preview (40%) -->
      <div class="cp-preview-section">
        <div class="cp-preview-top">
          <div class="cp-preview-label-wrap">
            <span class="cp-preview-label">Current item</span>
            <span v-if="latestCheckpoint" class="cp-preview-sub">
              Last snapshot {{ relativeTime(latestCheckpoint.createdAt) }}
            </span>
          </div>
          <button
            class="cp-save-btn"
            :disabled="saving"
            @click="saveCheckpoint"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ saving ? 'Saving…' : 'Save snapshot' }}
          </button>
        </div>
        <div class="cp-preview-frame">
          <div
            v-if="item && widgetComponent"
            class="cp-preview-widget"
            :style="{ aspectRatio: `${item.width} / ${item.height}` }"
            inert
            aria-hidden="true"
          >
            <component :is="widgetComponent" :item-id="itemId" />
          </div>
          <div v-else class="cp-preview-empty">No preview available</div>
        </div>
      </div>

      <!-- Checkpoints section (60%) -->
      <div class="cp-checkpoints-section">
        <div class="cp-checkpoints-top">
          <span class="cp-checkpoints-title">Snapshots</span>
          <span class="cp-checkpoints-hint">Restoring removes newer snapshots</span>
        </div>

        <!-- Loading -->
        <div v-if="loading && !checkpoints.length" class="cp-empty">
          <span class="cp-spinner" />
        </div>

        <!-- Empty state -->
        <div v-else-if="!checkpoints.length" class="cp-empty">
          <span class="cp-empty-text">No checkpoints yet</span>
          <span class="cp-empty-sub">Save a snapshot to track changes</span>
        </div>

        <!-- Checkpoint list with timeline -->
        <div v-else class="cp-list">
          <div
            v-for="(cp, i) in checkpoints"
            :key="cp.id"
            class="cp-item"
            :style="{ animationDelay: `${i * 40}ms` }"
          >
            <!-- Timeline connector -->
            <div class="cp-timeline">
              <div class="cp-dot" :class="{ 'cp-dot--first': i === 0 }" />
              <div v-if="i < checkpoints.length - 1" class="cp-line" />
            </div>

            <!-- Content -->
            <div class="cp-body">
              <div class="cp-meta">
                <span class="cp-time" :title="absoluteTime(cp.createdAt)">{{ relativeTime(cp.createdAt) }}</span>
                <span v-if="i === 0" class="cp-latest-badge">Latest</span>
                <span v-if="cp.createdByUsername" class="cp-author">
                  by @{{ cp.createdByUsername }}
                </span>
              </div>

              <div class="cp-preview-row">
                <span class="cp-kind">{{ kindIcon((cp.content as any)?.kind) }}</span>
                <span class="cp-snippet">{{ itemSnippet(cp.content) }}</span>
              </div>

              <!-- Actions -->
              <div class="cp-actions">
                <button
                  v-if="confirmRestoreId !== cp.id"
                  class="cp-restore-btn"
                  :disabled="restoringId !== null"
                  @click="confirmRestoreId = cp.id"
                >
                  Restore
                </button>
                <template v-else>
                  <span class="cp-confirm-note">This will remove all snapshots newer than this point.</span>
                  <button
                    class="cp-restore-btn cp-restore-btn--confirm"
                    :disabled="restoringId !== null"
                    @click="restoreCheckpoint(cp.id)"
                  >
                    {{ restoringId === cp.id ? 'Restoring…' : 'Confirm' }}
                  </button>
                  <button
                    class="cp-restore-btn cp-restore-btn--cancel"
                    @click="confirmRestoreId = null"
                  >
                    Cancel
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.cp-drawer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #8B7200;
}

.cp-drawer-title {
  font-family: system-ui, sans-serif;
  font-size: 15px;
  font-weight: 650;
  color: #111827;
}

.cp-drawer-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cp-drawer-subtitle {
  font-size: 11px;
  color: #9CA3AF;
  font-weight: 500;
}

.cp-drawer-item-name {
  font-size: 12px;
  color: #9CA3AF;
  font-weight: 450;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Drawer body layout ────────────────────── */
.cp-drawer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
  font-family: system-ui, -apple-system, sans-serif;
}

/* ── Preview section (40%) ─────────────────── */
.cp-preview-section {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  padding: 0 0 12px;
  border-bottom: 1px solid #F3F4F6;
  min-height: 0;
}

.cp-preview-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.cp-preview-label-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cp-preview-label {
  font-size: 11px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cp-preview-sub {
  font-size: 11px;
  color: #9CA3AF;
}

.cp-save-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border: 1px solid rgba(180, 160, 120, 0.25);
  border-radius: 7px;
  background: linear-gradient(180deg, #FFF8E6, #FFF3D0);
  color: #8B7200;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(180, 160, 120, 0.08);
}

.cp-save-btn:hover:not(:disabled) {
  background: linear-gradient(180deg, #FFF3D0, #FFEDB8);
  border-color: rgba(180, 160, 120, 0.4);
  box-shadow: 0 2px 6px rgba(180, 160, 120, 0.15);
}

.cp-save-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.cp-preview-frame {
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  border: 1px solid #E5E7EB;
  background: #FAFAFA;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cp-preview-widget {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  user-select: none;
}

.cp-preview-widget :deep(*) {
  pointer-events: none !important;
}

.cp-preview-empty {
  font-size: 13px;
  color: #D1D5DB;
  padding: 24px;
}

/* ── Checkpoints section (60%) ─────────────── */
.cp-checkpoints-section {
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 12px;
}

.cp-checkpoints-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.cp-checkpoints-title {
  font-size: 12px;
  font-weight: 620;
  color: #374151;
  letter-spacing: 0.01em;
}

.cp-checkpoints-hint {
  font-size: 10.5px;
  color: #B45309;
}

/* ── Empty state ───────────────────────────── */
.cp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 4px;
}

.cp-empty-text {
  font-size: 12px;
  font-weight: 550;
  color: #9CA3AF;
}

.cp-empty-sub {
  font-size: 11px;
  color: #D1D5DB;
}

.cp-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(184, 134, 11, 0.15);
  border-top-color: #B8860B;
  border-radius: 50%;
  animation: cp-spin 0.6s linear infinite;
}

@keyframes cp-spin {
  to { transform: rotate(360deg); }
}

/* ── List ──────────────────────────────────── */
.cp-list {
  overflow-y: auto;
  padding: 8px 0;
  flex: 1;
}

.cp-list::-webkit-scrollbar { width: 4px; }
.cp-list::-webkit-scrollbar-thumb { background: rgba(180, 160, 120, 0.2); border-radius: 2px; }

/* ── Item ──────────────────────────────────── */
.cp-item {
  display: flex;
  gap: 0;
  animation: cp-slide-in 0.2s ease both;
}

@keyframes cp-slide-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Timeline ──────────────────────────────── */
.cp-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 16px;
  flex-shrink: 0;
  padding-top: 6px;
}

.cp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #D4B96A;
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px rgba(180, 160, 120, 0.3);
  flex-shrink: 0;
  z-index: 1;
}

.cp-dot--first {
  background: #B8860B;
  width: 8px;
  height: 8px;
  box-shadow: 0 0 0 2px rgba(184, 134, 11, 0.15);
}

.cp-line {
  width: 1.5px;
  flex: 1;
  background: linear-gradient(180deg, rgba(180, 160, 120, 0.25), rgba(180, 160, 120, 0.08));
  margin: 2px 0;
}

/* ── Body ──────────────────────────────────── */
.cp-body {
  flex: 1;
  min-width: 0;
  padding: 4px 0 12px 8px;
}

.cp-meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 3px;
}

.cp-time {
  font-size: 11px;
  font-weight: 600;
  color: #8B7200;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

.cp-latest-badge {
  font-size: 9.5px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: 999px;
  background: #FEF3C7;
  color: #92400E;
  border: 1px solid rgba(180, 160, 120, 0.3);
}

.cp-author {
  font-size: 10.5px;
  color: #B0A080;
  font-weight: 450;
}

.cp-preview-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: rgba(255, 248, 230, 0.6);
  border: 1px solid rgba(180, 160, 120, 0.1);
  border-radius: 6px;
  margin-bottom: 5px;
}

.cp-kind {
  font-size: 12px;
  flex-shrink: 0;
}

.cp-snippet {
  font-size: 11px;
  color: #6B7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Actions ───────────────────────────────── */
.cp-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.cp-confirm-note {
  font-size: 10px;
  color: #B45309;
  margin-right: 2px;
}

.cp-restore-btn {
  font-size: 10.5px;
  font-weight: 550;
  padding: 2px 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 5px;
  background: #fff;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.12s ease;
}

.cp-restore-btn:hover:not(:disabled) {
  background: #F9FAFB;
  border-color: rgba(0, 0, 0, 0.14);
  color: #374151;
}

.cp-restore-btn--confirm {
  background: #FEF3C7;
  border-color: rgba(180, 160, 120, 0.3);
  color: #92400E;
}

.cp-restore-btn--confirm:hover:not(:disabled) {
  background: #FDE68A;
  border-color: #D97706;
}

.cp-restore-btn--cancel {
  color: #9CA3AF;
  border-color: transparent;
  background: transparent;
}

.cp-restore-btn--cancel:hover {
  color: #6B7280;
}

.cp-restore-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.cp-save-btn:focus-visible,
.cp-restore-btn:focus-visible {
  outline: 2px solid #D97706;
  outline-offset: 1px;
}

@media (max-width: 640px) {
  .cp-drawer-item-name {
    max-width: 120px;
  }

  .cp-checkpoints-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }
}
</style>
