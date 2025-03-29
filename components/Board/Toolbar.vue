<script setup lang="ts">
import { useItemManagement } from "@/composables/useItemManagement";
import Modal from "../UI/Modal.vue";
import { useLinkStore } from "~/stores/linkStore";
import { useBoardStore } from "~/stores/board";

const {loggedIn} = useUserSession()
const {error} = useToast();
const boardStore = useBoardStore();
const {uploadFiles} = useUpload();
const { calculateCenterPosition } = useItemManagement();
const TackletDirectory = useTackletDirectory();

const linkStore = useLinkStore();
const bookmarkOpen = ref(false);
const link = ref("");
let errMsg = ref("");

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

const saveVoiceNote = async (data: { title: string; blob: Blob }) => {

  try{
  const fileName = `${data.title || 'Recording'}.${getFileExtension(data.blob)}`;
    const recordingFile = new File(
      [data.blob], 
      fileName, 
      { 
        type: data.blob.type,
        lastModified: new Date().getTime()
      }
    );
    await uploadFiles([recordingFile],fileName);
    boardStore.isVoiceRecorderVisible = false;
    }catch (error) {
    console.error('Error saving recording:', error);
  }
};  
const getFileExtension = (audioBlob: Blob) => {
  if (!audioBlob) return 'webm';
  
  const mimeType = audioBlob.type;
  const extensions = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav'
  };
  
  return extensions[mimeType] || 'webm';
};

</script>
<template>
  <div
    class="[interpolate-size:'allow-keywords'] fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg px-2 sm:px-4 py-1 sm:py-2 transition-all duration-1000 z-10 w-4/5 sm:w-max"
  >
    <div class="flex gap-2 justify-around items-center relative">
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
    
      </button>
      <button
        class="flex group p-1.5 sm:p-2 text-gray-600 hover:text-yellow-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="loggedIn? boardStore.isVoiceRecorderVisible = !boardStore.isVoiceRecorderVisible: error('Please login to add voice note')"
        title="Add Voice Note"

      >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M8 24q-.425 0-.712-.288T7 23t.288-.712T8 22t.713.288T9 23t-.288.713T8 24m4 0q-.425 0-.712-.288T11 23t.288-.712T12 22t.713.288T13 23t-.288.713T12 24m4 0q-.425 0-.712-.288T15 23t.288-.712T16 22t.713.288T17 23t-.288.713T16 24m-4-10q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2t2.125.875T15 5v6q0 1.25-.875 2.125T12 14m-1 7v-3.1q-2.6-.35-4.3-2.312T5 11h2q0 2.075 1.463 3.538T12 16t3.538-1.463T17 11h2q0 2.625-1.7 4.588T13 17.9V21zm1-9q.425 0 .713-.288T13 11V5q0-.425-.288-.712T12 4t-.712.288T11 5v6q0 .425.288.713T12 12"/>
          </svg>
   
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
      
      </div>
            <button
        class="group flex p-1.5 sm:p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-full transition-colors"
        @click.stop="loggedIn? boardStore.isFilePickerVisible = !boardStore.isFilePickerVisible : error('Please login to add files')"
        title="Add Files"
      >
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE --><path fill="currentColor" d="M4 15q-.825 0-1.412-.587T2 13V4q0-.825.588-1.412T4 2h9q.825 0 1.413.588T15 4v9q0 .825-.587 1.413T13 15zm0-2h9V4H4zm4-1.75L6.8 9.6L5 12h7L9.7 9zM17 22q-1.25 0-2.125-.875T14 19t.875-2.125T17 16q.275 0 .513.05t.487.125V11h4v2h-2v6q0 1.25-.875 2.125T17 22M4 13V4z"/></svg>
    

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
      :initialTitle="`Voice Note ${new Date().toLocaleString()}`"
      @save="saveVoiceNote"
    />
    </div>
</template>


