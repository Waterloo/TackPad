
<template>
    <div
      class="[interpolate-size:'allow-keywords'] fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center bg-white rounded-xl shadow-lg px-2 sm:px-4 py-1 sm:py-2 gap-1 sm:gap-6 transition-all duration-1000 z-10"
    >
      <button
        class="flex group p-1.5 sm:p-2 text-gray-600 hover:text-green-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="addTodoList"
        title="Add Todo List"
      >
        <img
          src="public/icons/todo.svg"
          class="h-5 w-5 sm:h-6 sm:w-6"
          alt="Todo List"
        />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Todo
        </div>
      </button>
  
      <button
        class="flex group p-1.5 sm:p-2 text-gray-600 hover:text-yellow-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="addNote"
        title="Add Note"
      >
        <img src="public/icons/notes.svg" class="h-5 w-5 sm:h-6 sm:w-6" alt="Notes" />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Notes
        </div>
      </button>
  
      <button
        class="p-1.5 sm:p-2 text-gray-600 hover:text-purple-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="addTextWidget"
        title="Add Text Widget"
      >
        <img
          src="public/icons/text.svg"
          class="h-5 w-5 sm:h-6 sm:w-6"
          alt="Text Widget"
        />
      </button>
  
      <button
        class="group flex p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="addTimer"
        title="Add Timer"
      >
        <img src="public/icons/timer.svg" class="h-5 w-5 sm:h-6 sm:w-6" alt="Timer" />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Timer
        </div>
      </button>
  
      <a
        @click.prevent="getBookMarkURL()"
        class="flex group p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
        title="Add Bookmark"
      >
        <img
          src="public/icons/bookmark.svg"
          class="h-5 w-5 sm:h-6 sm:w-6 select-none"
          alt="Bookmark"
        />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Bookmark
        </div>
      </a>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useItemManagement } from '@/composables/useItemManagement';
  import { getBookMarkURL } from '@/utils/boardUtils';
  
  const { addNote, addTodoList, addTimer, addTextWidget } = useItemManagement();
  </script>