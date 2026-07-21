<script setup lang="ts">
import { nanoid } from 'nanoid'
import { useBoardStore } from '~/stores/board'
import { useAuthStore } from '~/stores/auth'
import { useMentionSuggestions } from '~/composables/useMentionSuggestions'
import { useTaskDragDrop } from '~/composables/useTaskDragDrop'
import type { TodoList, TodoTask } from '~/shared/types/board'
import type { MentionData } from '~/shared/types/mention'
import MentionInput from '~/components/ui/MentionInput.vue'
import TaskContentRenderer from '~/components/ui/TaskContentRenderer.vue'

const props = defineProps<{ itemId: string }>()
const boardStore = useBoardStore()
const authStore = useAuthStore()

const currentBoardId = computed(() => boardStore.boardId)
const { loadAll, filteredResults } = useMentionSuggestions(currentBoardId)

const item = computed(() => boardStore.items.get(props.itemId) as TodoList | undefined)
const isLocked = computed(() => item.value?.lock ?? false)

// ── Title ─────────────────────────────────────────────────────────
const isEditingTitle = ref(false)
const titleDraft = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

function startEditTitle() {
  if (isLocked.value) return
  titleDraft.value = item.value?.content.title ?? ''
  isEditingTitle.value = true
  nextTick(() => titleInput.value?.focus())
}

function commitTitle() {
  isEditingTitle.value = false
  if (!item.value) return
  boardStore.updateItem(props.itemId, {
    content: { ...item.value.content, title: titleDraft.value.trim() || 'To-do' },
  })
}

function onTitleKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === 'Escape') commitTitle()
}

// ── Tasks ─────────────────────────────────────────────────────────
const newTaskText = ref('')
const newTaskInput = ref<InstanceType<typeof MentionInput> | null>(null)
const taskDrafts = reactive<Record<string, string>>({})
const editingTaskId = ref<string | null>(null)

function tasks(): TodoTask[] {
  return item.value?.content.tasks ?? []
}

function updateTasks(updated: TodoTask[]) {
  if (!item.value) return
  boardStore.updateItem(props.itemId, {
    content: { ...item.value.content, tasks: updated },
  })
}

function addTask() {
  const text = newTaskText.value.trim()
  if (!text) return
  const task: TodoTask = { task_id: nanoid(), content: text, completed: false }
  updateTasks([...tasks(), task])
  newTaskText.value = ''
  nextTick(() => newTaskInput.value?.focus())
}

// Handle blur on MentionInput for task editing
function onTaskEditBlur(taskId: string) {
  // Small delay to allow mention dropdown clicks to register
  setTimeout(() => commitTaskEdit(taskId), 100)
}

function onNewTaskKey(e: KeyboardEvent) {
  if (e.key === 'Enter') addTask()
}

function toggleTask(taskId: string) {
  if (isLocked.value) return
  updateTasks(tasks().map(t =>
    t.task_id === taskId ? { ...t, completed: !t.completed } : t,
  ))
}

function deleteTask(taskId: string) {
  if (isLocked.value) return
  updateTasks(tasks().filter(t => t.task_id !== taskId))
}

function startEditTask(task: TodoTask) {
  if (isLocked.value) return
  editingTaskId.value = task.task_id
  taskDrafts[task.task_id] = task.content
}

function commitTaskEdit(taskId: string) {
  const text = (taskDrafts[taskId] ?? '').trim()
  editingTaskId.value = null
  if (!text) { deleteTask(taskId); return }
  updateTasks(tasks().map(t =>
    t.task_id === taskId ? { ...t, content: text } : t,
  ))
}

function onTaskEditKey(e: KeyboardEvent, taskId: string) {
  if (e.key === 'Enter' || e.key === 'Escape') commitTaskEdit(taskId)
}

const completedCount = computed(() => tasks().filter(t => t.completed).length)
const totalCount = computed(() => tasks().length)
const progressPct = computed(() =>
  totalCount.value === 0 ? 0 : Math.round((completedCount.value / totalCount.value) * 100),
)

// ── Mention support ──────────────────────────────────────────────
const mentionSections = ref<{ label: string; items: MentionData[] }[]>([])

function onMentionTrigger(query: string) {
  loadAll()
  mentionSections.value = filteredResults(query)
}

function onMentionInsert(mentionItem: MentionData) {
  if (mentionItem.type !== 'user') return
  const profile = authStore.profile
  if (!profile) return
  $fetch('/api/notifications/mention', {
    method: 'POST',
    body: {
      recipientId: mentionItem.id,
      boardId: boardStore.boardId,
      boardTitle: boardStore.title,
      itemId: props.itemId,
      itemKind: 'todo',
      itemDisplayName: item.value?.displayName || item.value?.content?.title || 'Todo List',
      context: '',
    },
  }).catch(() => {})
}

// Check if content has mention markers
function hasMentions(content: string) {
  return /@\[[^\]]+\]\((user|item|board):[^)]+\)/.test(content)
}

// ── Drag & drop reorder + cross-list ─────────────────────────────
const {
  dragSource, dropIndex,
  onDragStart, onDragEnd, onDragOver, onDragOverList, onDragLeave, onDrop,
  onTaskMoved,
} = useTaskDragDrop(props.itemId, tasks, updateTasks)

onMounted(() => window.addEventListener('task-moved', onTaskMoved))
onUnmounted(() => window.removeEventListener('task-moved', onTaskMoved))

// Touch DnD — activates after 200ms long-press to avoid conflicting with taps
let touchTask: TodoTask | null = null
let touchClone: HTMLElement | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let touchActive = false
let startX = 0
let startY = 0

function onTouchDragStart(e: TouchEvent, task: TodoTask) {
  if (isLocked.value) return
  const touch = e.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  touchTask = task
  touchActive = false

  longPressTimer = setTimeout(() => {
    touchActive = true
    dragSource.value = { listId: props.itemId, task }
    const el = e.currentTarget as HTMLElement
    touchClone = el.cloneNode(true) as HTMLElement
    touchClone.style.cssText = `position:fixed;pointer-events:none;opacity:0.7;z-index:9999;width:${el.offsetWidth}px;`
    document.body.appendChild(touchClone)
    touchClone.style.left = `${startX - 20}px`
    touchClone.style.top = `${startY - 16}px`
    el.classList.add('task-dragging')
  }, 200)
}

function onTouchDragMove(e: TouchEvent) {
  if (!touchTask) return
  const touch = e.touches[0]
  // Cancel long-press if finger moves too much before activation
  if (!touchActive) {
    if (Math.abs(touch.clientX - startX) > 8 || Math.abs(touch.clientY - startY) > 8) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
      touchTask = null
    }
    return
  }
  e.preventDefault()
  if (touchClone) {
    touchClone.style.left = `${touch.clientX - 20}px`
    touchClone.style.top = `${touch.clientY - 16}px`
  }
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  const row = el?.closest('[data-task-index]') as HTMLElement | null
  if (row) dropIndex.value = Number(row.dataset.taskIndex)
}

function onTouchDragEnd(e: TouchEvent) {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
  if (!touchTask || !touchActive) { touchTask = null; touchActive = false; return }
  touchClone?.remove()
  touchClone = null
  const touch = e.changedTouches[0]
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  const listEl = el?.closest('[data-list-id]') as HTMLElement | null
  const row = el?.closest('[data-task-index]') as HTMLElement | null

  if (listEl && row) {
    const targetListId = listEl.dataset.listId!
    const targetIdx = Number(row.dataset.taskIndex)
    if (targetListId === props.itemId) {
      const arr = tasks().filter(t => t.task_id !== touchTask!.task_id)
      arr.splice(Math.min(targetIdx, arr.length), 0, touchTask!)
      updateTasks(arr)
    } else {
      window.dispatchEvent(new CustomEvent('task-cross-drop', {
        detail: { targetListId, task: touchTask, targetIdx },
      }))
      updateTasks(tasks().filter(t => t.task_id !== touchTask!.task_id))
    }
  }

  // Clean up dragging class
  document.querySelectorAll('.task-dragging').forEach(el => el.classList.remove('task-dragging'))
  touchTask = null
  touchActive = false
  dragSource.value = null
  dropIndex.value = null
}

// Listen for cross-list touch drops targeting this list
function onCrossDrop(e: Event) {
  const { targetListId, task, targetIdx } = (e as CustomEvent).detail
  if (targetListId !== props.itemId) return
  const arr = [...tasks()]
  arr.splice(Math.min(targetIdx, arr.length), 0, task)
  updateTasks(arr)
}

onMounted(() => window.addEventListener('task-cross-drop', onCrossDrop))
onUnmounted(() => window.removeEventListener('task-cross-drop', onCrossDrop))
</script>

<template>
  <div v-if="item" class="todo-root">
    <!-- Header -->
    <div class="todo-header">
      <div class="todo-title-row">
        <input
          v-if="isEditingTitle"
          ref="titleInput"
          v-model="titleDraft"
          class="title-input"
          @blur="commitTitle"
          @keydown="onTitleKey"
          @click.stop
          @pointerdown.stop
        />
        <h3 v-else class="todo-title" @dblclick.stop="startEditTitle">
          {{ item.content.title }}
        </h3>
        <span class="todo-count">{{ completedCount }}/{{ totalCount }}</span>
      </div>

      <!-- Progress bar -->
      <div v-if="totalCount > 0" class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: progressPct + '%' }"
          :class="{ 'progress-done': progressPct === 100 }"
        />
      </div>
    </div>

    <!-- Task list -->
    <div
      class="task-list"
      :data-list-id="itemId"
      @dragover="onDragOverList"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div
        v-for="(task, idx) in tasks()"
        :key="task.task_id"
        class="task-row"
        :class="{
          'task-done': task.completed,
          'drop-above': dragSource && dropIndex === idx,
        }"
        :data-task-index="idx"
        :draggable="!isLocked && editingTaskId !== task.task_id"
        @dragstart.stop="onDragStart($event, task)"
        @dragend="onDragEnd"
        @dragover.stop="onDragOver($event, idx)"
        @touchstart.passive="onTouchDragStart($event, task)"
        @touchmove="onTouchDragMove"
        @touchend="onTouchDragEnd"
      >
        <button
          class="checkbox"
          :class="{ 'checkbox-checked': task.completed }"
          @click.stop="toggleTask(task.task_id)"
        >
          <svg v-if="task.completed" width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <MentionInput
          v-if="editingTaskId === task.task_id"
          :model-value="taskDrafts[task.task_id]"
          :mention-sections="mentionSections"
          class="task-edit-input"
          @update:model-value="v => taskDrafts[task.task_id] = v"
          @submit="commitTaskEdit(task.task_id)"
          @cancel="commitTaskEdit(task.task_id)"
          @blur="onTaskEditBlur(task.task_id)"
          @mention-trigger="onMentionTrigger"
          @mention-select="onMentionInsert"
        />
        <span
          v-else
          class="task-text"
          :class="{ 'task-text-done': task.completed }"
          @dblclick.stop="startEditTask(task)"
        >
          <TaskContentRenderer v-if="hasMentions(task.content)" :content="task.content" />
          <template v-else>{{ task.content }}</template>
        </span>

        <button
          v-if="!isLocked"
          class="task-delete"
          @click.stop="deleteTask(task.task_id)"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Add task -->
    <div v-if="!isLocked" class="add-task-row">
      <div class="add-icon">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>
      <MentionInput
        ref="newTaskInput"
        v-model="newTaskText"
        :mention-sections="mentionSections"
        placeholder="Add task…"
        class="new-task-input"
        @submit="addTask"
        @mention-trigger="onMentionTrigger"
        @mention-select="onMentionInsert"
      />
    </div>

  </div>
</template>

<style scoped>
.todo-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: inherit;
  overflow: hidden;
  font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
}

/* Header */
.todo-header {
  padding: 12px 12px 8px;
  border-bottom: 1px solid #F3F4F6;
  flex-shrink: 0;
}

.todo-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.todo-title {
  font-size: 14px;
  font-weight: 650;
  color: #111827;
  margin: 0;
  cursor: text;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-input {
  font-size: 14px;
  font-weight: 650;
  color: #111827;
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  padding: 0;
  min-width: 0;
}

.todo-count {
  font-size: 11px;
  color: #9CA3AF;
  font-weight: 500;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.progress-track {
  height: 3px;
  background: #F3F4F6;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3B82F6;
  border-radius: 9999px;
  transition: width 0.3s ease, background 0.3s ease;
}

.progress-fill.progress-done {
  background: #22C55E;
}

/* Task list */
.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
  min-height: 0;
}

.task-list::-webkit-scrollbar { width: 3px; }
.task-list::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 2px; }

.task-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 32px;
  border-radius: 6px;
  padding: 4px 4px;
  transition: background 0.1s;
}

.task-row:hover {
  background: #F9FAFB;
}

.task-row[draggable="true"] {
  cursor: grab;
}

.task-row.task-dragging {
  opacity: 0.3;
}

.task-row.drop-above {
  border-top: 2px solid #3B82F6;
  margin-top: -2px;
}

.task-row:hover .task-delete {
  opacity: 1;
}

/* Checkbox */
.checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid #D1D5DB;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
}

.checkbox:hover {
  border-color: #3B82F6;
}

.checkbox-checked {
  background: #3B82F6;
  border-color: #3B82F6;
}

/* Checkbox alignment when rows wrap */
.checkbox { margin-top: 2px; }

/* Task text */
.task-text {
  flex: 1;
  font-size: 13px;
  color: #374151;
  cursor: text;
  min-width: 0;
  word-break: break-word;
  line-height: 1.5;
}

.task-text-done {
  text-decoration: line-through;
  color: #9CA3AF;
}

.task-edit-input {
  flex: 1;
  min-width: 0;
}

.task-delete {
  opacity: 0;
  color: #9CA3AF;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: opacity 0.15s, color 0.1s;
}

.task-delete:hover { color: #EF4444; }

/* Add task */
.add-task-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 12px 10px;
  border-top: 1px solid #F3F4F6;
  flex-shrink: 0;
}

.add-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  flex-shrink: 0;
  margin-top: 2px;
}

.new-task-input {
  flex: 1;
  min-width: 0;
}
</style>
