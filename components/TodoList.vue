<template>
  <div class="h-full flex-col bg-white rounded-lg taskContaner transition-all ease-in-out" :data-list-id="list.id" @drop="handleDrop($event,list.id,list)"  @dragover.prevent>
<div class="p-4 border-b flex items-center justify-between">
<!--Header-->
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

<div class="p-4 pt-0 overflow-auto overflow-x-hidden" style="max-height: calc(100% - 64px);">
  <!--Input-->
  <div class="bg-gray-100 rounded-lg mt-5 mb-5 flex items-center ">
        <input
          type="text"
          placeholder="Add a new task"
          class="w-full p-4 bg-gray-100 focus:outline-none text-gray-600"
          v-model="newTask"
          @keyup.enter="handleAddNewTask"
          @mousedown.stop
          @keydown.delete.stop
        />
        <button 
          @click.stop="handleAddNewTask"
          class="p-4 text-blue-600 hover:text-blue-800"
        >
          <img src="public/icons/Add-Circle.svg" alt="">
        </button>
      </div>
    <ul class="space-y-4 overflow-y-auto overflow-x-hidden min-h-[100px]" >
      <li
      v-for="(task,index) in list.content.tasks"
      :key="task.task_id"
      class="taskItem flex gap-3 items-center transition-all ease-in-out"
      draggable="true"
      @dragleave="handleDragLeave"
      @dragend="handleDragEnd"
      @dragstart="handleDragStart($event,list.id,index,task)"
      @dragover.prevent="handleDragOver($event,list.id,index)"
      @touchstart="handleTouchStart($event,list.id,index,task)"
      @touchmove="handleTouchMove($event)"
      @touchend="handleTouchEnd($event,list.id,list)"
      >
      <div class="drag-handle cursor-move px-1 text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="8" cy="8" r="1" />
              <circle cx="8" cy="16" r="1" />
              <circle cx="16" cy="8" r="1" />
              <circle cx="16" cy="16" r="1" />
            </svg>
          </div>
          <button 
            class="w-6 h-6 rounded border-2 border-blue-600 flex items-center justify-center flex-shrink-0"
            :class="{ 'bg-blue-600': task.completed }"
            @click.stop="toggleTask(task)"
             :data-list-id="list.id"
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
import { ref, nextTick, computed, watch } from 'vue'
import { useBoardStore } from '~/stores/board'
import { useTodoStore } from '~/stores/todoStore'
import { useTodo } from '~/composables/useTodo'
import type { TodoList, Task } from '~/types/board'

const props = defineProps<{
  list: TodoList
  isSelected: boolean
}>()
const boardStore = useBoardStore()
const todoStore = useTodoStore()
const newTask = ref('')
const titleDisplay = ref<HTMLElement | null>(null)
 const { localTitle,
  isEditingTitle,
  titleInput,
  editingTaskId,
  editingContent,
  editInput,
    // Title functions
    startTitleEdit,
  saveTitle,
  cancelTitleEdit,
  // Task functions
  addNewTask,
  deleteTask,
  toggleTask,
  startEditing,
  saveTaskEdit,
  cancelTaskEdit,
// Drag and drop functions
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDragLeave,
      handleDrop,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd
} = useTodo(props.list)
// Handle adding a new task
const handleAddNewTask = () => {
  if (newTask.value.trim()) {
    addNewTask(newTask.value)
    newTask.value = ''
  }
}

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

const draggedItem = ref(null)
const targetIndex = ref(0)
const isDragging=ref(false)

</script>
<style scoped>

.dragged-item{
  opacity: 0.5;
  
}
.item-drag{
  border-top: 2px solid #0066ff;
  transition: border 500ms;
}

.list-drop{
  border: 2px dashed rgba(0, 120, 255, 0.3); 
  padding: 8px;
}

</style>