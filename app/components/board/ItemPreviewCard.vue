<script setup lang="ts">
import type { BoardItem } from '~/shared/types/board'

const props = defineProps<{
  item: BoardItem
}>()

const kind = computed(() => props.item.kind)

/** Strip HTML tags to get plain text snippet */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

const noteText = computed(() => {
  if (kind.value !== 'note') return ''
  const content = (props.item as any).content
  return stripHtml(content?.text ?? '').slice(0, 120)
})

const noteColor = computed(() => {
  if (kind.value !== 'note') return '#FDE68A'
  return (props.item as any).content?.color ?? '#FDE68A'
})

const todoTasks = computed(() => {
  if (kind.value !== 'todo') return []
  const content = (props.item as any).content
  return (content?.tasks ?? []).slice(0, 3)
})

const todoTitle = computed(() => {
  if (kind.value !== 'todo') return ''
  return (props.item as any).content?.title ?? ''
})

const linkTitle = computed(() => {
  if (kind.value !== 'link') return ''
  return (props.item as any).content?.title ?? ''
})

const linkUrl = computed(() => {
  if (kind.value !== 'link') return ''
  return (props.item as any).content?.url ?? ''
})

const linkHostname = computed(() => {
  try { return new URL(linkUrl.value).hostname }
  catch { return linkUrl.value.slice(0, 30) }
})

const textContent = computed(() => {
  if (kind.value !== 'text') return ''
  return stripHtml((props.item as any).content?.text ?? '').slice(0, 120)
})

const imageUrl = computed(() => {
  if (kind.value !== 'image') return ''
  return (props.item as any).content?.url ?? ''
})

const fileName = computed(() => {
  if (kind.value === 'audio') return (props.item as any).content?.fileName ?? 'Audio'
  if (kind.value === 'file') return (props.item as any).content?.fileName ?? 'File'
  return ''
})

const fileType = computed(() => {
  if (kind.value === 'file') return (props.item as any).content?.fileType ?? ''
  if (kind.value === 'audio') return 'audio'
  return ''
})

const timerMode = computed(() => {
  if (kind.value !== 'timer') return ''
  return (props.item as any).content?.timerType ?? 'Focus'
})

const isSecret = computed(() => kind.value === 'secret_note' || kind.value === 'secret_kv')

const KIND_LABELS: Record<string, string> = {
  note: 'Note', todo: 'To-do', link: 'Link', text: 'Text',
  secret_note: 'Encrypted Note', secret_kv: 'Encrypted Keys',
  image: 'Image', audio: 'Audio', file: 'File', timer: 'Timer', tacklet: 'Tacklet',
}
</script>

<template>
  <div class="ipc" :class="`ipc--${kind}`">
    <!-- Note -->
    <template v-if="kind === 'note'">
      <div class="ipc-note" :style="{ background: noteColor }">
        <span class="ipc-note-text">{{ noteText || 'Empty note' }}</span>
      </div>
    </template>

    <!-- Todo -->
    <template v-else-if="kind === 'todo'">
      <div class="ipc-todo">
        <span v-if="todoTitle" class="ipc-todo-title">{{ todoTitle }}</span>
        <div v-for="task in todoTasks" :key="task.task_id" class="ipc-todo-row">
          <svg class="ipc-todo-check" width="12" height="12" viewBox="0 0 24 24" fill="none"
               :stroke="task.completed ? '#10B981' : '#D1D5DB'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <polyline v-if="task.completed" points="9 12 11 14 15 10" />
          </svg>
          <span class="ipc-todo-text" :class="{ 'ipc-todo-done': task.completed }">{{ task.content }}</span>
        </div>
      </div>
    </template>

    <!-- Link -->
    <template v-else-if="kind === 'link'">
      <div class="ipc-link">
        <span class="ipc-link-title">{{ linkTitle || 'Untitled link' }}</span>
        <span class="ipc-link-url">{{ linkHostname }}</span>
      </div>
    </template>

    <!-- Text -->
    <template v-else-if="kind === 'text'">
      <div class="ipc-text">
        <span>{{ textContent || 'Empty text' }}</span>
      </div>
    </template>

    <template v-else-if="isSecret">
      <div class="ipc-secret">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 1 1 8 0v3" />
        </svg>
        <span>{{ KIND_LABELS[kind] }}</span>
      </div>
    </template>

    <!-- Image -->
    <template v-else-if="kind === 'image'">
      <div class="ipc-image">
        <img v-if="imageUrl" :src="imageUrl" alt="" />
        <div v-else class="ipc-image-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
        </div>
      </div>
    </template>

    <!-- Audio / File -->
    <template v-else-if="kind === 'audio' || kind === 'file'">
      <div class="ipc-file">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <template v-if="kind === 'audio'">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </template>
          <template v-else>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </template>
        </svg>
        <span class="ipc-file-name">{{ fileName }}</span>
        <span v-if="fileType" class="ipc-file-type">{{ fileType }}</span>
      </div>
    </template>

    <!-- Timer -->
    <template v-else-if="kind === 'timer'">
      <div class="ipc-timer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="1.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <span class="ipc-timer-mode">{{ timerMode }}</span>
      </div>
    </template>

    <!-- Tacklet / fallback -->
    <template v-else>
      <div class="ipc-generic">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
        <span>{{ KIND_LABELS[kind] || kind }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ipc {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: #fff;
  flex-shrink: 0;
}

/* Note */
.ipc-note {
  width: 100%; height: 100%;
  padding: 10px;
  display: flex;
  align-items: flex-start;
}
.ipc-note-text {
  font-size: 11px;
  line-height: 1.4;
  color: rgba(0,0,0,0.7);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
}

/* Todo */
.ipc-todo {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
}
.ipc-todo-title {
  font-size: 11px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ipc-todo-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.ipc-todo-check { flex-shrink: 0; }
.ipc-todo-text {
  font-size: 11px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ipc-todo-done {
  text-decoration: line-through;
  color: #9CA3AF;
}

/* Link */
.ipc-link {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  height: 100%;
  background: linear-gradient(135deg, #EEF2FF, #F5F3FF);
}
.ipc-link-title {
  font-size: 11px;
  font-weight: 600;
  color: #1E40AF;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.ipc-link-url {
  font-size: 10px;
  color: #6B7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: auto;
}

/* Text */
.ipc-text {
  padding: 10px;
  height: 100%;
  font-size: 11px;
  line-height: 1.4;
  color: #374151;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
}

.ipc-secret {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(180deg, #F9FAFB 0%, #EEF2FF 100%);
  color: #374151;
  font-size: 12px;
  font-weight: 600;
}

/* Image */
.ipc-image {
  width: 100%; height: 100%;
}
.ipc-image img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.ipc-image-empty {
  width: 100%; height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F9FAFB;
}

/* File / Audio */
.ipc-file {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #F9FAFB;
}
.ipc-file-name {
  font-size: 11px;
  font-weight: 500;
  color: #374151;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.ipc-file-type {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  color: #9CA3AF;
  background: #F3F4F6;
  padding: 1px 5px;
  border-radius: 3px;
}

/* Timer */
.ipc-timer {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(135deg, #FFFBEB, #FEF3C7);
}
.ipc-timer-mode {
  font-size: 12px;
  font-weight: 600;
  color: #92400E;
}

/* Generic */
.ipc-generic {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #F9FAFB;
  font-size: 11px;
  color: #6B7280;
}
</style>
