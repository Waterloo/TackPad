<script setup lang="ts">
import { useBoardStore } from '~/stores/board'
import type { TextWidget } from '~/shared/types/board'

const props = defineProps<{ itemId: string }>()
const boardStore = useBoardStore()
const item = computed(() => boardStore.items.get(props.itemId) as TextWidget | undefined)

const isEditing = ref(false)
const draft = ref('')
const textarea = ref<HTMLTextAreaElement | null>(null)

function startEdit() {
  if (item.value?.lock) return
  draft.value = item.value?.content.text ?? ''
  isEditing.value = true
  nextTick(() => textarea.value?.focus())
}

function commit() {
  isEditing.value = false
  if (!item.value) return
  boardStore.updateItem(props.itemId, { content: { text: draft.value } })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') commit()
}
</script>

<template>
  <div
    v-if="item"
    class="text-root"
    :class="{ 'text-root-editing': isEditing }"
    @dblclick.stop="startEdit"
  >
    <textarea
      v-if="isEditing"
      ref="textarea"
      v-model="draft"
      class="text-editor"
      @blur="commit"
      @keydown="onKey"
      @click.stop
      @pointerdown.stop
    />
    <p v-else class="text-display" :class="{ 'text-placeholder': !item.content.text }">
      {{ item.content.text || 'Double-click to edit' }}
    </p>
  </div>
</template>

<style scoped>
.text-root {
  width: 100%;
  height: 100%;
  background: transparent;
  border-radius: inherit;
  display: flex;
  align-items: flex-start;
  padding: 10px 12px;
  box-sizing: border-box;
  cursor: text;
}

.text-display {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 15px;
  line-height: 1.6;
  color: #1F2937;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-placeholder {
  color: #9CA3AF;
  font-style: italic;
  font-size: 13px;
}

.text-editor {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 15px;
  line-height: 1.6;
  color: #1F2937;
  padding: 0;
}
</style>
