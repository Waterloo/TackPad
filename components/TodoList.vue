<template>
  <div class="h-full flex flex-col bg-white rounded-lg">
    <div class="p-4 border-b flex items-center justify-between">
      <div class="flex items-center gap-2 w-full">
        <div v-if="isEditingTitle" class="w-full">
          <input
            v-model="localTitle"
            class="w-full text-xl font-semibold bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
            @blur="saveTitle"
            @keyup.enter="saveTitle"
            @keyup.esc="cancelTitleEdit"
            @mousedown.stop
            @keydown.delete.stop
            ref="titleInput"
          />
        </div>
        <div 
          v-else 
          class="w-full cursor-pointer break-words"
          @dblclick="startTitleEdit"
        >
          <p 
            class="font-semibold px-1 transition-all duration-200"
            :class="titleSizeClass"
            ref="titleDisplay"
          >
            {{ localTitle }}
          </p>
        </div>
      </div>
    </div>
    
    <div class="p-4 pt-0 overflow-auto" style="max-height: calc(100% - 64px);">
      <div class="bg-gray-100 rounded-lg mt-5 mb-5 flex items-center rounded-md">
        <input
          type="text"
          placeholder="Add a new task"
          class="w-full p-4 bg-gray-100 focus:outline-none text-gray-600"
          v-model="newTask"
          @keyup.enter="addNewTask"
          @mousedown.stop
          @keydown.delete.stop
        />
        <button 
          @click.stop="addNewTask"
          class="p-4 text-blue-600 hover:text-blue-800"
        >
          <img src="/icons/Add-Circle.svg" alt="">
        </button>
      </div>

      <ul class="space-y-4 overflow-y-auto">
        <li 
          v-for="task in list.content.tasks" 
          :key="task.task_id" 
          class="flex gap-3"
        >
          <button 
            class="w-6 h-6 rounded border-2 border-blue-600 flex items-center justify-center flex-shrink-0"
            :class="{ 'bg-blue-600': task.completed }"
            @click.stop="toggleTask(task)"
          >
            <svg
              v-if="task.completed"
              class="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
          <input
            v-if="editingTaskId === task.task_id"
            type="text"
            v-model="editingContent"
            class="flex-grow bg-transparent rounded px-1 focus:outline-none"
            @blur="saveTaskEdit(task)"
            @keyup.enter="saveTaskEdit(task)"
            @keyup.esc="cancelTaskEdit"
            @mousedown.stop
            ref="editInput"
          />
          <span 
            v-else
            class="flex-grow cursor-pointer text-base"
            :class="{ 'line-through text-gray-400': task.completed }"
            @dblclick.stop="startEditing(task)"
          >
            {{ task.content }}
          </span>
          <span>
            <button 
              @click.stop="deleteTask(task)"
              class="text-red-500 hover:text-red-600"
            >
              <span class="text-2xl">×</span>
            </button>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useBoardStore } from '~/stores/board'
import type { TodoList, Task } from '~/types/board'

const props = defineProps<{
  list: TodoList
  isSelected: boolean
}>()

const boardStore = useBoardStore()
const localTitle = ref(props.list.content.title)
const isEditingTitle = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)
const titleDisplay = ref<HTMLElement | null>(null)
const newTask = ref('')
const editingTaskId = ref<string | null>(null)
const editingContent = ref('')
const editInput = ref<HTMLInputElement | null>(null)

const titleSizeClass = computed(() => {
  const lines = titleDisplay.value ? 
    Math.floor(titleDisplay.value.scrollHeight / parseInt(getComputedStyle(titleDisplay.value).lineHeight)) : 1
  
  // Adjust size based on both length and number of lines
  if (lines > 2) return 'text-base'
  if (lines > 1) return 'text-lg'
  if (localTitle.value.length > 100) return 'text-base'
  if (localTitle.value.length > 50) return 'text-lg'
  return 'text-xl'
})

function startTitleEdit() {
  isEditingTitle.value = true
  nextTick(() => {
    titleInput.value?.focus()
  })
}

function saveTitle() {
  if (localTitle.value.trim() === '') {
    localTitle.value = props.list.content.title
  } else if (localTitle.value !== props.list.content.title) {
    boardStore.updateItem(props.list.id, {
      content: {
        ...props.list.content,
        title: localTitle.value
      }
    })
  }
  isEditingTitle.value = false
}

function cancelTitleEdit() {
  localTitle.value = props.list.content.title
  isEditingTitle.value = false
}

function updateTitle() {
  if (localTitle.value === props.list.content.title) return
  boardStore.updateItem(props.list.id, {
    content: {
      ...props.list.content,
      title: localTitle.value
    }
  })
}

function addNewTask() {
  if (!newTask.value.trim()) return
  boardStore.addTask(props.list.id, newTask.value)
  newTask.value = ''
}
function deleteTask(task: Task) {
  boardStore.deleteTask(props.list.id, task.task_id)
}

function toggleTask(task: Task) {
  task.completed = !task.completed
  boardStore.updateItem(props.list.id, {
    content: {
      ...props.list.content,
      tasks: [...props.list.content.tasks]
    }
  })
}

function startEditing(task: Task) {
  editingTaskId.value = task.task_id
  editingContent.value = task.content
  nextTick(()=> {
    editInput.value[0].focus()
  })
  
}

function saveTaskEdit(task: Task) {
  if (editingTaskId.value === null) return
  if (editingContent.value.trim() !== '') {
    boardStore.updateTask(props.list.id, task.task_id, editingContent.value)
  }
  editingTaskId.value = null
  editingContent.value = ''
}

function cancelTaskEdit() {
  editingTaskId.value = null
  editingContent.value = ''
}
</script>

<style scoped>
.todo-list {
  min-width: 300px;
  min-height: 200px;
}

/* Custom scrollbar styles */
.overflow-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>