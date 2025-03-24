<script setup lang="ts">
import Modal from '../UI/Modal.vue'
import { useBoardStore } from '~/stores/board'
const boardStore = useBoardStore()
let password = ref(null)
const route = useRoute()
let errMsg = ref("")
let showPassword = ref(false)  // This will control password visibility

async function submitPassword() {
  if (password.value) {
    errMsg.value = ""
    boardStore.password = password.value
    // if encrypted = true then unlocking
    if (boardStore.isEncrypted == true) {
      boardStore.initializeBoard(route.params.id)
    } else {
      boardStore.saveBoard()
    }
    password.value = null
    boardStore.showPasswordDialog = false
  } else {
    errMsg.value = "Password Cannot be empty"
  }
}

function cancelPassword() {
  boardStore.showPasswordDialog = false
}
</script>


<template>
  <Modal 
    v-model:model-value="boardStore.showPasswordDialog" 
    title="Enter Password" 
    :show-close-button="false" 
    :close-on-backdrop-click="false" 
    :close-on-esc="false"
  >
    <div class="">
      <p class="text-gray-600 mb-4">Please enter your password to continue</p>
      <div class="relative">
        <input 
          v-model="password" 
          :type="showPassword ? 'text' : 'password'"
          placeholder="Enter password" 
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          autofocus
        />
        <button 
          type="button" 
          @click="showPassword = !showPassword"  
          class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
        >
        <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><!-- Icon from Remix Icon by Remix Design - https://github.com/Remix-Design/RemixIcon/blob/master/License --><path fill="currentColor" d="M17.883 19.297A10.95 10.95 0 0 1 12 21c-5.392 0-9.878-3.88-10.818-9A11 11 0 0 1 4.52 5.935L1.394 2.808l1.414-1.414l19.799 19.798l-1.414 1.415zM5.936 7.35A8.97 8.97 0 0 0 3.223 12a9.005 9.005 0 0 0 13.201 5.838l-2.028-2.028A4.5 4.5 0 0 1 8.19 9.604zm6.978 6.978l-3.242-3.241a2.5 2.5 0 0 0 3.241 3.241m7.893 2.265l-1.431-1.431A8.9 8.9 0 0 0 20.778 12A9.005 9.005 0 0 0 9.552 5.338L7.974 3.76C9.221 3.27 10.58 3 12 3c5.392 0 9.878 3.88 10.819 9a10.95 10.95 0 0 1-2.012 4.593m-9.084-9.084Q11.86 7.5 12 7.5a4.5 4.5 0 0 1 4.492 4.778z"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><!-- Icon from Remix Icon by Remix Design - https://github.com/Remix-Design/RemixIcon/blob/master/License --><path fill="currentColor" d="M12 3c5.392 0 9.878 3.88 10.819 9c-.94 5.12-5.427 9-10.819 9s-9.878-3.88-10.818-9C2.122 6.88 6.608 3 12 3m0 16a9.005 9.005 0 0 0 8.778-7a9.005 9.005 0 0 0-17.555 0A9.005 9.005 0 0 0 12 19m0-2.5a4.5 4.5 0 1 1 0-9a4.5 4.5 0 0 1 0 9m0-2a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5"/></svg>
        </button>
      </div>
      <div class="text-sm text-red-400">
        {{ errMsg }}
      </div>
    </div>
    
    <template #footer>
      <div class=" bg-gray-50 rounded-b-lg flex justify-end space-x-3">
        <button 
          @click="cancelPassword" 
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
        >
          Cancel
        </button>
        <button 
          @click="submitPassword" 
          class="px-4 py-2 bg-[#4F46E5] text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
        >
          Confirm
        </button>
      </div>
    </template>
  </Modal>
</template>
