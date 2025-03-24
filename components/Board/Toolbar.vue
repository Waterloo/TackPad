
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
  
 <div     @click="bookmarkOpen=true"     class="flex group p-1.5 sm:p-2 text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
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
      </div>
      <Modal v-model:model-value="bookmarkOpen">
        <div>
            <p class="text-gray-600 mb-4">Please a link you want to bookmark</p>
    <input 
      v-model="link" 
      type="text"
      placeholder="Enter url" 
      class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      autofocus
    />
        </div>
        <template #footer>
            <div class=" bg-gray-50 rounded-b-lg flex justify-end space-x-3">
      <button 
        @click="bookmarkOpen=false" 
        class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
      >
        Cancel
      </button>
      <button 
        @click="addBookmark" 
        class="px-4 py-2 bg-[#4F46E5] text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
      >
        Confirm
      </button>
    </div>
        </template>
      </Modal>
    </div>
  </template>
  
  <script setup lang="ts">
  import { useItemManagement } from '@/composables/useItemManagement';
  import Modal from '../UI/Modal.vue';
  import { useLinkStore } from '~/stores/linkStore';
  
  const { calculateCenterPosition } = useItemManagement()

  const linkStore = useLinkStore()
  const bookmarkOpen = ref(false)
  const link = ref("")
  let errMsg = ref("")
  async function addBookmark(){
    try{
      const url = new URL(link.value);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          const position = calculateCenterPosition(400, 200,'link');
          await linkStore.addLinkItem(link.value, {
            x: position.x,
            y: position.y,
            width: 400,
            height: 200,
          });
        bookmarkOpen.value=false
    }else{
      errMsg.value="enter a valid url"
    }
  
    }catch(e){
      errMsg.value="url failed"
    }
  }
  const { addNote, addTodoList, addTimer, addTextWidget } = useItemManagement();
  </script>