<script setup lang="ts">
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { useMentionSuggestions } from '~/composables/useMentionSuggestions'
import type { MentionData } from '~/shared/types/mention'
import type { Comment, Checkpoint } from '~/shared/types/checkpoint'
import MentionInput from '~/components/ui/MentionInput.vue'
import TaskContentRenderer from '~/components/ui/TaskContentRenderer.vue'

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
const emit = defineEmits<{ countUpdate: [count: number] }>()

const boardStore = useBoardStore()
const authStore = useAuthStore()
const { boardId } = storeToRefs(boardStore)

const item = computed(() => boardStore.items.get(props.itemId))
const widgetComponent = computed(() => item.value ? WIDGET_COMPONENTS[item.value.kind] ?? null : null)

const activeTab = ref<'current' | 'history'>('current')
const comments = ref<Comment[]>([])
const allComments = ref<Comment[]>([])
const latestCheckpointId = ref<string | null>(null)
const loading = ref(false)
const submitting = ref(false)
const draft = ref('')

const mentionInputRef = ref<InstanceType<typeof MentionInput> | null>(null)
const { loadAll, filteredResults } = useMentionSuggestions(boardId)
const mentionSections = ref<{ label: string; items: MentionData[] }[]>([])

function onMentionTrigger(query: string) {
  loadAll()
  mentionSections.value = filteredResults(query)
}

// Fetch latest checkpoint for the item (auto-create if none)
async function ensureLatestCheckpoint(): Promise<string | null> {
  try {
    const cps = await $fetch<Checkpoint[]>(`/api/board/${boardId.value}/checkpoints`, {
      query: { itemId: props.itemId },
    })
    if (cps.length > 0) {
      latestCheckpointId.value = cps[0].id
      return cps[0].id
    }
    // Auto-create initial checkpoint
    const result = await $fetch<{ id: string }>(`/api/board/${boardId.value}/checkpoints`, {
      method: 'POST',
      body: { itemId: props.itemId },
    })
    latestCheckpointId.value = result.id
    return result.id
  }
  catch { return null }
}

async function fetchComments() {
  loading.value = true
  try {
    const cpId = await ensureLatestCheckpoint()
    // Fetch current checkpoint comments
    if (cpId) {
      comments.value = await $fetch<Comment[]>(`/api/board/${boardId.value}/comments`, {
        query: { itemId: props.itemId, checkpointId: cpId },
      })
    }
    // Fetch all comments for history tab
    allComments.value = await $fetch<Comment[]>(`/api/board/${boardId.value}/comments`, {
      query: { itemId: props.itemId },
    })
    emit('countUpdate', allComments.value.length)
  }
  catch { /* silent */ }
  finally { loading.value = false }
}

async function submitComment() {
  if (!draft.value.trim() || submitting.value) return
  const ok = await authStore.requireUsername()
  if (!ok) return
  submitting.value = true
  try {
    const cpId = latestCheckpointId.value || await ensureLatestCheckpoint()
    await $fetch(`/api/board/${boardId.value}/comments`, {
      method: 'POST',
      body: {
        itemId: props.itemId,
        checkpointId: cpId,
        content: draft.value.trim(),
      },
    })
    draft.value = ''
    await fetchComments()
  }
  catch { /* silent */ }
  finally { submitting.value = false }
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

const displayedComments = computed(() =>
  activeTab.value === 'current' ? comments.value : allComments.value,
)

// Fetch comments when drawer opens
watch(visible, (v) => { if (v) fetchComments() })
</script>

<template>
  <Drawer v-model:visible="visible" position="right" :style="{ width: '580px' }" :modal="true" :dismissable="true">
    <template #header>
      <div class="cmp-drawer-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span class="cmp-drawer-title">Comments</span>
        <span v-if="item?.displayName" class="cmp-drawer-item-name">{{ item.displayName }}</span>
      </div>
    </template>

    <div class="cmp-drawer-body">
      <!-- Widget preview (40%) -->
      <div class="cmp-preview-section">
        <div class="cmp-preview-label">Preview</div>
        <div class="cmp-preview-frame">
          <div
            v-if="item && widgetComponent"
            class="cmp-preview-widget"
            :style="{ aspectRatio: `${item.width} / ${item.height}` }"
          >
            <component :is="widgetComponent" :item-id="itemId" />
          </div>
          <div v-else class="cmp-preview-empty">No preview available</div>
        </div>
      </div>

      <!-- Comments section (60%) -->
      <div class="cmp-comments-section">
        <!-- Tabs -->
        <div class="cmp-tabs">
          <button
            class="cmp-tab"
            :class="{ 'cmp-tab--active': activeTab === 'current' }"
            @click="activeTab = 'current'"
          >
            Comments
            <span v-if="comments.length" class="cmp-tab-count">{{ comments.length }}</span>
          </button>
          <button
            class="cmp-tab"
            :class="{ 'cmp-tab--active': activeTab === 'history' }"
            @click="activeTab = 'history'"
          >
            History
            <span v-if="allComments.length" class="cmp-tab-count">{{ allComments.length }}</span>
          </button>
        </div>

        <!-- Comment list -->
        <div class="cmp-list">
          <!-- Loading -->
          <div v-if="loading && !displayedComments.length" class="cmp-empty">
            <span class="cmp-spinner" />
          </div>

          <!-- Empty -->
          <div v-else-if="!displayedComments.length" class="cmp-empty">
            <span class="cmp-empty-text">No comments yet</span>
            <span class="cmp-empty-sub">Start a conversation about this item</span>
          </div>

          <!-- Comments -->
          <div
            v-for="(comment, i) in displayedComments"
            :key="comment.id"
            class="cmp-comment"
            :style="{ animationDelay: `${i * 30}ms` }"
          >
            <div class="cmp-avatar">
              {{ (comment.authorUsername || '?')[0].toUpperCase() }}
            </div>
            <div class="cmp-comment-body">
              <div class="cmp-comment-meta">
                <span class="cmp-comment-author">{{ comment.authorUsername || 'Anonymous' }}</span>
                <span class="cmp-comment-time">{{ relativeTime(comment.createdAt) }}</span>
              </div>
              <div class="cmp-comment-text">
                <TaskContentRenderer :content="comment.content" />
              </div>
            </div>
          </div>
        </div>

        <!-- Input area -->
        <div class="cmp-input-area">
          <div class="cmp-input-wrap">
            <MentionInput
              ref="mentionInputRef"
              v-model="draft"
              placeholder="Write a comment…"
              :mention-sections="mentionSections"
              @submit="submitComment"
              @mention-trigger="onMentionTrigger"
            />
          </div>
          <button
            class="cmp-send-btn"
            :disabled="!draft.trim() || submitting"
            @click="submitComment"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<style scoped>
.cmp-drawer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
}

.cmp-drawer-title {
  font-family: system-ui, sans-serif;
  font-size: 15px;
  font-weight: 650;
  color: #111827;
}

.cmp-drawer-item-name {
  font-size: 12px;
  color: #9CA3AF;
  font-weight: 450;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Drawer body layout ────────────────────── */
.cmp-drawer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
  font-family: system-ui, -apple-system, sans-serif;
}

/* ── Preview section (40%) ─────────────────── */
.cmp-preview-section {
  flex: 0 0 40%;
  display: flex;
  flex-direction: column;
  padding: 0 0 12px;
  border-bottom: 1px solid #F3F4F6;
  min-height: 0;
}

.cmp-preview-label {
  font-size: 11px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.cmp-preview-frame {
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

.cmp-preview-widget {
  width: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.cmp-preview-empty {
  font-size: 13px;
  color: #D1D5DB;
  padding: 24px;
}

/* ── Comments section (60%) ────────────────── */
.cmp-comments-section {
  flex: 0 0 60%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 12px;
}

/* ── Tabs ──────────────────────────────────── */
.cmp-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #F3F4F6;
  margin-bottom: 0;
}

.cmp-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 8px 9px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 550;
  color: #9CA3AF;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
}

.cmp-tab:hover {
  color: #6B7280;
}

.cmp-tab--active {
  color: #3B5CC6;
  border-bottom-color: #3B5CC6;
}

.cmp-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: rgba(59, 92, 198, 0.08);
  color: inherit;
  font-size: 10px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.cmp-tab--active .cmp-tab-count {
  background: rgba(59, 92, 198, 0.12);
}

/* ── Comment list ──────────────────────────── */
.cmp-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 0;
}

.cmp-list::-webkit-scrollbar { width: 4px; }
.cmp-list::-webkit-scrollbar-thumb { background: rgba(59, 80, 180, 0.12); border-radius: 2px; }

/* ── Empty ─────────────────────────────────── */
.cmp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 3px;
}

.cmp-empty-text {
  font-size: 12px;
  font-weight: 550;
  color: #9CA3AF;
}

.cmp-empty-sub {
  font-size: 11px;
  color: #D1D5DB;
}

.cmp-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(59, 92, 198, 0.12);
  border-top-color: #3B5CC6;
  border-radius: 50%;
  animation: cmp-spin 0.6s linear infinite;
}

@keyframes cmp-spin {
  to { transform: rotate(360deg); }
}

/* ── Comment row ───────────────────────────── */
.cmp-comment {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  animation: cmp-fade-in 0.18s ease both;
}

@keyframes cmp-fade-in {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

.cmp-comment + .cmp-comment {
  margin-top: 2px;
}

.cmp-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366F1, #3B82F6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
  text-transform: uppercase;
}

.cmp-comment-body {
  flex: 1;
  min-width: 0;
}

.cmp-comment-meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 1px;
}

.cmp-comment-author {
  font-size: 12px;
  font-weight: 650;
  color: #1F2937;
}

.cmp-comment-time {
  font-size: 10px;
  color: #C0C4CC;
  font-variant-numeric: tabular-nums;
}

.cmp-comment-text {
  font-size: 13px;
  color: #4B5563;
  line-height: 1.5;
  word-break: break-word;
}

/* ── Input area ────────────────────────────── */
.cmp-input-area {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 10px 0 2px;
  border-top: 1px solid #F3F4F6;
}

.cmp-input-wrap {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1.5px solid rgba(59, 80, 180, 0.12);
  border-radius: 10px;
  background: #fff;
  transition: border-color 0.15s ease;
}

.cmp-input-wrap:focus-within {
  border-color: rgba(59, 92, 198, 0.35);
  box-shadow: 0 0 0 3px rgba(59, 92, 198, 0.06);
}

.cmp-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, #3B5CC6, #5B7FE6);
  color: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(59, 92, 198, 0.2);
}

.cmp-send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2D4AA0, #4B6FD6);
  box-shadow: 0 3px 10px rgba(59, 92, 198, 0.3);
  transform: translateY(-1px);
}

.cmp-send-btn:disabled {
  opacity: 0.35;
  cursor: default;
  transform: none;
  box-shadow: none;
}
</style>
