<script setup lang="ts">
import { useItemManagement } from "@/composables/useItemManagement";
import Modal from "../UI/Modal.vue";
import { useLinkStore } from "~/stores/linkStore";
import { useBoardStore } from "~/stores/board";

const boardStore = useBoardStore();

const { calculateCenterPosition } = useItemManagement();
const TackletDirectory = useTackletDirectory();

const linkStore = useLinkStore();
const bookmarkOpen = ref(false);
const link = ref("");
let errMsg = ref("");
const showFileUpload = ref(false);

async function addBookmark() {
  try {
    const url = new URL(link.value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      const position = calculateCenterPosition(400, 200, "link");
      await linkStore.addLinkItem(link.value, {
        x: position.x,
        y: position.y,
        width: 400,
        height: 200,
      });
      bookmarkOpen.value = false;
    } else {
      errMsg.value = "enter a valid url";
    }
  } catch (e) {
    errMsg.value = "url failed";
  }
}
const { addNote, addTodoList, addTimer, addTextWidget } = useItemManagement();
</script>
<template>
  <div
    class="[interpolate-size:'allow-keywords'] fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg px-2 sm:px-4 py-1 sm:py-2 transition-all duration-1000 z-10 w-4/5 sm:w-max"
  >
    <div class="flex gap-2 justify-around relative">
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
        <img
          src="public/icons/notes.svg"
          class="h-5 w-5 sm:h-6 sm:w-6"
          alt="Notes"
        />
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
      <img
          src="public/icons/timer.svg"
          class="h-5 w-5 sm:h-6 sm:w-6"
          alt="Timer"
        />
  
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Timer
        </div>
      </button>
      <div
        @click="bookmarkOpen = true"
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
      </div>
            <button
        class="group flex p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="boardStore.isFilePickerVisible = !boardStore.isFilePickerVisible"
        title="Add Timer"
      >
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE --><path fill="currentColor" d="M4 15q-.825 0-1.412-.587T2 13V4q0-.825.588-1.412T4 2h9q.825 0 1.413.588T15 4v9q0 .825-.587 1.413T13 15zm0-2h9V4H4zm4-1.75L6.8 9.6L5 12h7L9.7 9zM17 22q-1.25 0-2.125-.875T14 19t.875-2.125T17 16q.275 0 .513.05t.487.125V11h4v2h-2v6q0 1.25-.875 2.125T17 22M4 13V4z"/></svg>
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Files
        </div>

      </button>
      <button
        class="group flex p-1.5 sm:p-2 text-gray-600 hover:text-purple-600 hover:bg-gray-50 rounded-full transition-colors"
        title="Add Tacklet"
        @click.stop="TackletDirectory.toggleTackletDirectory()"
      >
        <img
          src="public/icons/Tacklets.svg"
          class="h-5 w-5 sm:h-6 sm:w-6 select-none"
          alt="Tacklet"
        />
        <div
          class="group-hover:mx-1 group-hover:px-2 bg-black text-white rounded [interpolate-size:allow-keywords] w-0 overflow-hidden group-hover:w-auto transition-all ease-in duration-500"
        >
          Tacklet
        </div>
      </button>
    </div>
    <Modal v-model:model-value="bookmarkOpen" title="Add Bookmark">
        <div>
          <p class="text-gray-600 mb-4">Please a link you want to bookmark</p>
          <input
            v-model="link"
            type="text"
            placeholder="Enter url"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            autofocus
          />
          <div class="text-sm text-red-400 p-3">
            {{ errMsg }}
          </div>
        </div>
        <template #footer>
          <div class="bg-gray-50 rounded-b-lg flex justify-end space-x-3">
            <button
              @click="bookmarkOpen = false"
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
              <UploadPopover v-if="boardStore.isFilePickerVisible" class="tacklet-directory fixed sm:bottom-20 shadow-lg left-1/2 transform -translate-x-1/2 bottom-1/2 -translate-y-1/2 md:-translate-y-0 transition-all duration-500 " @wheel.stop/>
              <VoiceRecorder 
              v-if="boardStore.isVoiceRecorderVisible"
              class="tacklet-directory fixed sm:bottom-20 shadow-lg left-1/2 transform -translate-x-1/2 bottom-1/2 -translate-y-1/2 md:-translate-y-0 transition-all duration-500 "
      initialTitle="My Voice Note"
      @save="()=>console.log('save')"
      @discard="()=>console.log('discard')"
    />
    </div>
</template>


