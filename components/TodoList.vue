<!-- <template>
  <div class="h-full flex flex-col bg-white rounded-lg" :data-list-id="list.id">
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
    
    <div class="p-4 pt-0 overflow-auto overflow-x-hidden" style="max-height: calc(100% - 64px);">
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
          <img src="/icons/Add-Circle.svg" alt="">
        </button>
      </div>

      <ul class="space-y-4 overflow-y-auto overflow-x-hidden min-h-[100px]" 
          :data-list-id="list.id"
          @dragover.prevent="handleDragOver($event)"
          @dragenter.prevent
          @dragleave="handleDragLeave($event)"
          @drop="handleEmptyListDrop($event)"
          :class="{ 'empty-list-drag-over': isEmptyListDragOver && list.content.tasks.length === 0 }"
      >
        <li 
          v-for="(task, index) in list.content.tasks" 
          :key="task.task_id"
          :data-list-id="list.id"
          class="flex gap-3 items-center"
          draggable="true"
          @dragstart="dragStart(index, $event)"
          @dragover.prevent="dragOver(index)"
          @dragenter.prevent
          @drop="drop(index, $event)"
          @dragend="dragEnd"
          @touchstart.passive="touchStart(index, $event)"
          @touchmove="touchMove($event)"
          @touchend="touchEnd($event)"
          @touchcancel="touchCancel()"
          :class="{ 'dragging': isDragging && draggedItemIndex === index, 'drag-over': isDragging && dropIndex === index }"
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
            :data-list-id="list.id"
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
        <li v-if="isEmptyListDragOver && list.content.tasks.length === 0" class="flex justify-center items-center h-12 text-gray-400">
          Drop task here
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

// Use the todo composable
const {
  localTitle,
  isEditingTitle,
  titleInput,
  editingTaskId,
  editingContent,
  editInput,
  draggedItemIndex,
  isDragging,
  dropIndex,
  
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
  dragStart,
  drop,
  dragOver,
  dragEnd,
  
  // Touch drag and drop functions
  touchStart,
  touchMove,
  touchEnd,
  touchCancel
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

const isEmptyListDragOver = ref(false)

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isEmptyListDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isEmptyListDragOver.value = false
}

const handleEmptyListDrop = (event: DragEvent) => {
  // If the list is not empty, we don't need special handling
  if (props.list.content.tasks.length > 0) return
  
  // For empty lists, call the drop function with index 0
  // This will use the existing cross-list logic in useTodo.ts
  drop(0, event)
}
</script>

<style scoped>
.dragging {
  opacity: 0.4;
  transform: scale(1.02);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  background-color: #f0f9ff;
  border-radius: 0.375rem;
}

.drag-over {
  position: relative;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.drag-over::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background-color: #3b82f6;
  animation: pulse 1.5s infinite;
  border-radius: 1px;
}

.empty-list-drag-over {
  background-color: #f0f9ff;
  border: 2px dashed #3b82f6;
  border-radius: 0.5rem;
  animation: pulse-border 1.5s infinite;
  transition: all 0.3s ease;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
}

@keyframes pulse-border {
  0% {
    border-color: #93c5fd;
  }
  50% {
    border-color: #3b82f6;
  }
  100% {
    border-color: #93c5fd;
  }
}

/* Add visual cue for draggable items */
li[draggable=true] {
  cursor: move;
  transition: all 0.2s ease;
  padding: 8px;
  border-radius: 0.375rem;
  background-color: white;
  border: 1px solid transparent;
  will-change: transform, opacity, box-shadow;
}

li[draggable=true]:hover {
  background-color: #f9fafb;
  border-color: #e5e7eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Style for the drag handle */
.drag-handle {
  cursor: grab;
  opacity: 0.4;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 4px;
}

.drag-handle:hover {
  background-color: #f3f4f6;
  opacity: 1;
}

li:hover .drag-handle {
  opacity: 0.8;
}

li .drag-handle:active {
  cursor: grabbing;
}

/* Add a ghost element when dragging */
li[draggable=true]:active {
  cursor: grabbing;
}

/* Smooth transitions for all interactions */
ul {
  transition: background-color 0.3s ease;
}

li {
  transition: transform 0.2s ease, opacity 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}
</style> -->

<template>
  <div class="h-full flex-col bg-white rounded-lg" :data-list-id="list.id" @drop="handleDrop($event,list.id)">
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
      class="flex gap-3 items-center"
      draggable="true"
      @dragstart="handleDragStart($event,list.id,index)"
      @dragover.prevent="handleDragOver($event,list.id,index)"
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
            :data-list-id="list.id"
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
  cancelTaskEdit, } = useTodo(props.list)
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

const draggedItem = ref({
  listIndex: null,
  itemIndex: null
});
const isDragging=ref(false)

function handleDrop(event,listID){
  console.log("drop",listID)
}
function handleDragStart(event,listID, ItemIndex){
  console.log("drag",listID)
}
function handleDragOver(event,listID,ItemIndex){
  console.log("drag over",listID)
}

</script>