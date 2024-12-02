<template>
  <div class="text-widget">
    <div v-if="isEditing" class="editing-container h-full">
      <textarea
        v-model="content"
        @blur="saveContent"
        ref="textArea"
        class="w-full h-full p-4 resize-none focus:outline-none text-base"
        @mousedown.stop
      ></textarea>
    </div>
    <h1 
      v-else 
      class="display-container"
      style="font-family: 'Bad Script', cursive;"
      @dblclick.stop="startEditing"
    >
      {{ content || 'Double click to edit text' }}
  </h1>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  itemId: string
  isSelected: boolean
  initialText?: string
}>()

const emit = defineEmits(['update:text'])

const content = ref(props.initialText || '')
const isEditing = ref(false)
const textArea = ref<HTMLTextAreaElement | null>(null)

function startEditing() {
  isEditing.value = true
  // Wait for the textarea to be rendered
  setTimeout(() => {
    if (textArea.value) {
      textArea.value.focus()
    }
  }, 0)
}

function saveContent() {
  isEditing.value = false
  emit('update:text', content.value)
}

watch(() => props.initialText, (newText) => {
  if (newText !== undefined) {
    content.value = newText
  }
})
</script>

<style scoped>
.text-widget {
  border-radius: 4px;
  padding: 0;
  position: relative;
}

.editing-container {
  display: flex;
  flex-direction: column;
}

.text-input {
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.5;
}

.text-content {
  word-break: break-word;
  min-height: 100px;
  line-height: 1.5;
}

.display-container {
  cursor: text;
}
</style>
